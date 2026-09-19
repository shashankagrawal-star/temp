"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { SlackStatus, User } from "@/lib/types";
import { useDashboard } from "@/lib/DashboardContext";
import { PlusIcon, ClockIcon, CheckCircleIcon, SlackIcon, ChevronDownIcon } from "./ui/icons";

export function Sidebar({ user }: { user: User }) {
  const router = useRouter();
  const { tab, setTab, scheduled, sent, openCompose } = useDashboard();
  const [slack, setSlack] = useState<SlackStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.slackStatus().then(setSlack).catch(() => setSlack(null));
  }, []);

  async function handleLogout() {
    await api.logout();
    router.push("/login");
  }

  async function handleSlackDisconnect() {
    await api.slackDisconnect();
    setSlack((prev) => (prev ? { ...prev, connected: false, teamName: null } : prev));
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5">
      <div className="mb-6 flex items-center gap-2 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
          RI
        </div>
        <span className="text-lg font-extrabold tracking-tight text-ink">ReachInbox</span>
      </div>

      <div className="relative mb-5">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-canvas"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 text-sm leading-tight">
            <div className="truncate font-medium text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-subtle">{user.email}</div>
          </div>
          <ChevronDownIcon className="shrink-0 text-ink-subtle" />
        </button>
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
            {slack?.connected ? (
              <button
                type="button"
                onClick={handleSlackDisconnect}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-muted hover:bg-canvas"
              >
                <SlackIcon /> Disconnect Slack{slack.teamName ? ` (${slack.teamName})` : ""}
              </button>
            ) : (
              <a
                href={api.slackAuthorizeUrl()}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-muted hover:bg-canvas"
              >
                <SlackIcon /> Connect Slack
              </a>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={openCompose}
        className="mb-6 flex items-center justify-center gap-2 rounded-full border-2 border-brand-600 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
      >
        <PlusIcon /> Compose
      </button>

      <nav className="flex flex-col gap-1 text-sm">
        <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle">Core</p>
        <button
          type="button"
          onClick={() => setTab("scheduled")}
          className={`flex items-center justify-between rounded-lg px-3 py-2 font-medium transition-colors ${
            tab === "scheduled" ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:bg-canvas"
          }`}
        >
          <span className="flex items-center gap-2">
            <ClockIcon /> Scheduled
          </span>
          <span className="text-xs text-ink-subtle">{scheduled.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("sent")}
          className={`flex items-center justify-between rounded-lg px-3 py-2 font-medium transition-colors ${
            tab === "sent" ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:bg-canvas"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircleIcon /> Sent
          </span>
          <span className="text-xs text-ink-subtle">{sent.length}</span>
        </button>
      </nav>
    </aside>
  );
}
