import { redisConnection } from "./redis";
import { env } from "../config/env";

const HOUR_MS = 60 * 60 * 1000;

function hourBucket(date: Date): number {
  return Math.floor(date.getTime() / HOUR_MS);
}

function rateKey(senderId: string, bucket: number): string {
  return `rate:${senderId}:${bucket}`;
}

function lastSentKey(senderId: string): string {
  return `lastSent:${senderId}`;
}

function slackNotifiedKey(senderId: string, bucket: number): string {
  return `slackNotified:${senderId}:${bucket}`;
}

export interface RateCheckResult {
  allowed: boolean;
  /** ms to wait before this job should be retried, if not allowed */
  retryAfterMs?: number;
  /** true only the first time a given sender/hour window trips the limit */
  limitJustHit?: boolean;
}

/**
 * Atomically checks + reserves one send slot for `senderId` in the current hour
 * window, and enforces the minimum delay between sends for that sender.
 * Backed entirely by Redis (INCR/EXPIRE + a timestamp key) so it is safe
 * across multiple worker processes / concurrency > 1.
 */
export async function reserveSendSlot(
  senderId: string,
  maxPerHour: number = env.maxEmailsPerHourPerSender,
  minDelayMs: number = env.minDelayMsBetweenSends
): Promise<RateCheckResult> {
  const now = Date.now();

  // 1. Enforce the hourly cap using an atomic INCR + EXPIRE on the current bucket.
  const bucket = hourBucket(new Date(now));
  const key = rateKey(senderId, bucket);
  const count = await redisConnection.incr(key);
  if (count === 1) {
    // first increment in this window: set expiry so old buckets self-clean
    await redisConnection.pexpire(key, HOUR_MS + 60_000);
  }

  if (count > maxPerHour) {
    // Over budget: give back the slot we just took and reschedule into the
    // next hour window, preserving order as much as BullMQ's delayed set allows.
    await redisConnection.decr(key);
    const nextWindowStart = (bucket + 1) * HOUR_MS;
    const notifiedKey = slackNotifiedKey(senderId, bucket);
    const firstHit = await redisConnection.set(notifiedKey, "1", "PX", HOUR_MS, "NX");
    return {
      allowed: false,
      retryAfterMs: nextWindowStart - now,
      limitJustHit: firstHit === "OK",
    };
  }

  // 2. Enforce the minimum delay between sends for this sender. This must be
  // a single atomic check-and-set (SET ... NX PX), not a separate GET then
  // SET — under concurrency > 1, two workers can both pass a plain "elapsed
  // >= minDelayMs" GET check before either writes the new timestamp, letting
  // two sends through back-to-back. SET NX makes the reservation itself the
  // check, so only one caller within any minDelayMs window can win it.
  if (minDelayMs > 0) {
    const reserved = await redisConnection.set(
      lastSentKey(senderId),
      String(now),
      "PX",
      minDelayMs,
      "NX"
    );
    if (reserved !== "OK") {
      // Didn't win the slot: give back the hourly-cap increment since we're
      // not actually sending now, and retry after the key holder's TTL.
      await redisConnection.decr(key);
      const ttl = await redisConnection.pttl(lastSentKey(senderId));
      return { allowed: false, retryAfterMs: Math.max(ttl, 50) };
    }
  }

  return { allowed: true };
}
