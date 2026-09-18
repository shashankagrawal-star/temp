"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { SlackStatus, User } from "@/lib/types";
import { Button } from "./ui/Button";

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const [slack, setSlack] = useState<SlackStatus | null>(null);

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
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900">ReachInbox Scheduler</h1>

      <div className="flex items-center gap-4">
        {slack?.connected ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Slack connected{slack.teamName ? ` (${slack.teamName})` : ""}
            <button onClick={handleSlackDisconnect} className="text-xs text-gray-400 underline">
              disconnect
            </button>
          </div>
        ) : (
          <a href={api.slackAuthorizeUrl()}>
            <Button variant="secondary" type="button">
              Connect Slack
            </Button>
          </a>
        )}

        <div className="flex items-center gap-2">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-sm leading-tight">
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-gray-500">{user.email}</div>
          </div>
        </div>

        <Button variant="ghost" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
