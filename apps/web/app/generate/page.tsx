import { ShotPlanForm } from '@/components/shot-plan-form';

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">Generate production shot plans</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Frontend state is not production truth. vLLM output is advisory until validated.
        </p>
      </section>
      <ShotPlanForm />
    </div>
  );
}
