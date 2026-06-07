export function Topbar() {
  return (
    <header className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold">CineForge Studio AI</h1>
        <p className="text-xs text-muted-foreground">AI creates. Evidence proves. Humans approve.</p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <p>vLLM is the private production brain.</p>
        <p>Video providers are the camera crews.</p>
      </div>
    </header>
  );
}
