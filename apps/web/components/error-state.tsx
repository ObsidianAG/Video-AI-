export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
      <h3 className="text-lg font-semibold text-rose-300">{title}</h3>
      <p className="mt-2 text-sm text-rose-200/80">{description}</p>
    </div>
  );
}
