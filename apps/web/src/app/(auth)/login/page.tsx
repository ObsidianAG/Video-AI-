"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LoginFormState {
  email: string;
  password: string;
  error: string | null;
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    error: null,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setState((prev) => ({ ...prev, [e.target.name]: e.target.value, error: null }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const { email, password } = state;

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { detail?: string };
          setState((prev) => ({
            ...prev,
            error: data.detail ?? "Login failed",
          }));
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch {
        setState((prev) => ({ ...prev, error: "Network error. Please try again." }));
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">VEO3 Creator OS</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={state.email}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={state.password}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
