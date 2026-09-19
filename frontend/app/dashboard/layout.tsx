"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardProvider } from "@/lib/DashboardContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => router.replace("/login"))
      .finally(() => setChecked(true));
  }, [router]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center text-ink-subtle">Loading…</div>;
  }
  if (!user) return null;

  return (
    <ToastProvider>
      <DashboardProvider>
        <div className="flex h-screen bg-canvas">
          <Sidebar user={user} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </DashboardProvider>
    </ToastProvider>
  );
}
