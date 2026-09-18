"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/ui/Toast";

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
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
  }
  if (!user) return null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
