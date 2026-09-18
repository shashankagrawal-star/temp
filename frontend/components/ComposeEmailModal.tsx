"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { api, ApiError } from "@/lib/api";
import type { Sender } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { Input, Textarea } from "./ui/Input";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase())));
}

export function ComposeEmailModal({ open, onClose, onScheduled }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delaySec, setDelaySec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .senders()
      .then((list) => {
        setSenders(list);
        if (list.length && !senderId) setSenderId(list[0].id);
      })
      .catch(() => showToast("Failed to load senders", "error"));
    // default start time = 5 minutes from now, formatted for datetime-local
    const dt = new Date(Date.now() + 5 * 60 * 1000);
    dt.setSeconds(0, 0);
    setStartTime(dt.toISOString().slice(0, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCreateSender() {
    try {
      const sender = await api.createSender();
      setSenders((prev) => [sender, ...prev]);
      setSenderId(sender.id);
      showToast(`Created test sender ${sender.fromEmail}`);
    } catch {
      showToast("Failed to create sender", "error");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const { emails } = await api.parseRecipients(file);
      setRecipients(emails);
    } catch {
      // fallback: parse client-side with papaparse if backend call fails
      Papa.parse(file, {
        complete: (result) => {
          const text = (result.data as string[][]).flat().join(",");
          setRecipients(extractEmailsFromText(text));
        },
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!senderId) {
      showToast("Add or select a sender first", "error");
      return;
    }
    if (recipients.length === 0) {
      showToast("Upload a lead list with at least one email", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.scheduleEmails({
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayMs: delaySec * 1000,
        hourlyLimit,
      });
      showToast(`Scheduled ${result.count} email(s)`);
      onScheduled();
      onClose();
      setSubject("");
      setBody("");
      setRecipients([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to schedule emails", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose New Email">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">Sender</span>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {senders.length === 0 && <option value="">No senders yet</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fromEmail}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" onClick={handleCreateSender}>
            + New sender
          </Button>
        </div>

        <Input
          label="Subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quick question about {{company}}"
        />
        <Textarea
          label="Body"
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email…"
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Lead list (CSV or TXT)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="text-sm"
          />
          {fileName && (
            <span className="text-xs text-gray-500">
              {fileName} — {recipients.length} email address(es) detected
            </span>
          )}
        </label>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Start time"
            type="datetime-local"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Delay between emails (sec)"
            type="number"
            min={0}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
          />
          <Input
            label="Hourly limit"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
