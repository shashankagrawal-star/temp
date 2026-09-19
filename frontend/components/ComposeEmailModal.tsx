"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { api, ApiError } from "@/lib/api";
import type { Sender } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { Input, Select } from "./ui/Field";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";
import { UploadIcon, ChevronDownIcon } from "./ui/icons";

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

const QUICK_SCHEDULE_OPTIONS = [
  { label: "Tomorrow", hours: 9, addDays: 1 },
  { label: "Tomorrow, 10:00 AM", hours: 10, addDays: 1 },
  { label: "Tomorrow, 11:00 AM", hours: 11, addDays: 1 },
  { label: "Tomorrow, 3:00 PM", hours: 15, addDays: 1 },
];

function toDatetimeLocal(date: Date): string {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy.toISOString().slice(0, 16);
}

export function ComposeEmailModal({ open, onClose, onScheduled }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [delaySec, setDelaySec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .senders()
      .then((list) => {
        setSenders(list);
        if (list.length && !senderId) setSenderId(list[0].id);
      })
      .catch(() => showToast("Failed to load senders", "error"));
    const dt = new Date(Date.now() + 5 * 60 * 1000);
    setStartTime(toDatetimeLocal(dt));
    setIsScheduled(false);
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
    try {
      const { emails } = await api.parseRecipients(file);
      setRecipients(emails);
    } catch {
      Papa.parse(file, {
        complete: (result) => {
          const text = (result.data as string[][]).flat().join(",");
          setRecipients(extractEmailsFromText(text));
        },
      });
    }
  }

  function applyQuickSchedule(option: (typeof QUICK_SCHEDULE_OPTIONS)[number]) {
    const dt = new Date();
    dt.setDate(dt.getDate() + option.addDays);
    dt.setHours(option.hours, 0, 0, 0);
    setStartTime(toDatetimeLocal(dt));
    setIsScheduled(true);
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
      const effectiveStart = isScheduled ? startTime : toDatetimeLocal(new Date(Date.now() + 5000));
      const result = await api.scheduleEmails({
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(effectiveStart).toISOString(),
        delayMs: delaySec * 1000,
        hourlyLimit,
      });
      showToast(`Scheduled ${result.count} email(s)`);
      onScheduled();
      onClose();
      setSubject("");
      setBody("");
      setRecipients([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to schedule emails", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const visibleChips = recipients.slice(0, 3);
  const overflowCount = recipients.length - visibleChips.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compose New Email"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSchedulePopoverOpen((v) => !v)}
                className="flex h-[38px] items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink-muted hover:bg-canvas"
              >
                Send Later
                <ChevronDownIcon />
              </button>
              {schedulePopoverOpen && (
                <div className="absolute bottom-full right-0 z-10 mb-2 w-64 rounded-xl border border-line bg-surface p-3 shadow-raised">
                  <p className="mb-2 text-xs font-semibold text-ink-subtle">Send Later</p>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setIsScheduled(true);
                    }}
                    className="mb-2"
                  />
                  <div className="flex flex-col gap-0.5">
                    {QUICK_SCHEDULE_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => applyQuickSchedule(opt)}
                        className="rounded-md px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-canvas"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end gap-2 border-t border-line pt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSchedulePopoverOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsScheduled(true);
                        setSchedulePopoverOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button type="submit" form="compose-email-form" disabled={submitting} loading={submitting}>
              {isScheduled ? "Send Later" : "Send"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="compose-email-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select label="From" value={senderId} onChange={(e) => setSenderId(e.target.value)}>
              {senders.length === 0 && <option value="">No senders yet</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fromEmail}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={handleCreateSender}>
            + New sender
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">To</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:text-brand-800"
            >
              <UploadIcon className="h-4 w-4" /> Upload List
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2">
            {recipients.length === 0 ? (
              <span className="text-sm text-ink-subtle">recipient@example.com</span>
            ) : (
              <>
                {visibleChips.map((email) => (
                  <span
                    key={email}
                    className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
                  >
                    {email}
                  </span>
                ))}
                {overflowCount > 0 && (
                  <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                    +{overflowCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <Input
          label="Subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quick question about {{company}}"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Delay between 2 emails"
            type="number"
            min={0}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            placeholder="00"
          />
          <Input
            label="Hourly Limit"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
            placeholder="00"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Body</span>
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-canvas/60 px-3 py-1.5 text-ink-subtle">
              <ToolbarButton label="Undo">↶</ToolbarButton>
              <ToolbarButton label="Redo">↷</ToolbarButton>
              <span className="h-4 w-px bg-line" />
              <ToolbarButton label="Bold">
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton label="Italic">
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton label="Underline">
                <span className="underline">U</span>
              </ToolbarButton>
              <span className="h-4 w-px bg-line" />
              <ToolbarButton label="Bulleted list">•</ToolbarButton>
              <ToolbarButton label="Numbered list">1.</ToolbarButton>
              <ToolbarButton label="Quote">“”</ToolbarButton>
              <ToolbarButton label="Strikethrough">
                <span className="line-through">S</span>
              </ToolbarButton>
            </div>
            <textarea
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              className="w-full resize-y bg-canvas/40 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ToolbarButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs text-ink-subtle"
    >
      {children}
    </button>
  );
}
