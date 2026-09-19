"use client";

import { FormEvent } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { ToastProvider } from "@/components/ui/Toast";

function LoginCard() {
  const { showToast } = useToast();

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    showToast("Email/password sign-in isn't available yet — please continue with Google.", "error");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-card">
        <h1 className="mb-6 text-center text-3xl font-bold text-ink">Login</h1>

        <a
          href={api.googleLoginUrl()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-ink hover:bg-brand-100"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>
          Login with Google
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
          <span className="h-px flex-1 bg-line" />
          or sign up through email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email ID"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginCard />
    </ToastProvider>
  );
}
