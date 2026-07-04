import { lazy, Suspense } from "react";
const Landing = lazy(() => import("./pages/Landing"));
const Studio = lazy(() => import("./studio/Studio"));

export function Routes() {
  const path = window.location.pathname;
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-[var(--muted)]">Loading…</div>}>
      {path === "/studio" ? <Studio /> : <Landing />}
    </Suspense>
  );
}
