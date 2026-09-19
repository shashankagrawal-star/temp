"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import type { ScheduledEmail, SentEmail } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

type Tab = "scheduled" | "sent";

interface DashboardState {
  tab: Tab;
  setTab: (tab: Tab) => void;
  scheduled: ScheduledEmail[];
  sent: SentEmail[];
  loading: boolean;
  refresh: () => Promise<void>;
  composeOpen: boolean;
  openCompose: () => void;
  closeCompose: () => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([api.scheduledEmails(), api.sentEmails()]);
      setScheduled(scheduledRes);
      setSent(sentRes);
    } catch {
      showToast("Failed to load emails", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
    // Poll periodically so statuses (scheduled -> sent) update without a manual refresh.
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <DashboardContext.Provider
      value={{
        tab,
        setTab,
        scheduled,
        sent,
        loading,
        refresh,
        composeOpen,
        openCompose: () => setComposeOpen(true),
        closeCompose: () => setComposeOpen(false),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
