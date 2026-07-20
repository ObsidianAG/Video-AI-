import Link from 'next/link';
import { GeneratorSection } from './GeneratorSection';

export const metadata = {
  title: 'Video AI — Text-to-Video Generator',
  description:
    'Generate high-quality AI videos from text prompts using Sora, VEO 3, Kling, and more.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight">Video AI</span>
          <Link
            href="/jobs"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
          >
            My Videos
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Turn words into{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            video
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Describe your vision. Choose a provider. Get a production-quality video — every output
          is cryptographically verified before you see it.
        </p>
      </section>

      {/* Generator */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <GeneratorSection />
      </section>

      {/* How it works */}
      <section className="border-t border-border/50 bg-muted/20 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-semibold">How it works</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Write a prompt',
                description:
                  'Describe the video you want in natural language — setting, action, mood, style.',
              },
              {
                step: '02',
                title: 'Provider generates',
                description:
                  'Your prompt is submitted to the selected AI provider (Sora, VEO 3, Kling, …).',
              },
              {
                step: '03',
                title: 'Verified & delivered',
                description:
                  'The video passes 7 proof gates — hash verification, storage check, and audit record — before you see it.',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="rounded-xl border border-border bg-muted/30 p-6">
                <span className="text-3xl font-bold text-primary/30">{step}</span>
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
