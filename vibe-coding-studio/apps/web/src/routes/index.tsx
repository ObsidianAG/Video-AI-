import { Link } from '@tanstack/react-router'
import { Sparkles, Zap, Shield, Palette } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardBody } from '../components/ui/card'

export function IndexRoute() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--primary)]/10 px-6 py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--highlight)] bg-clip-text text-transparent">
            Ship Better Software, Faster
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Vibe Coding Studio combines AI-powered prompt engineering, visual design systems, 
            and build planning to transform ideas into production-ready code.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/studio">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Building
              </Button>
            </Link>
            <Link to="/vibes">
              <Button variant="secondary" size="lg">
                <Palette className="w-5 h-5 mr-2" />
                Explore Vibes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card hover>
              <CardBody>
                <Sparkles className="w-12 h-12 text-[var(--primary)] mb-4" />
                <h3 className="text-2xl font-bold mb-3">Vibe-Driven Design</h3>
                <p className="text-gray-400">
                  Choose from five premium vibe profiles. Instant theme switching with 
                  complete design tokens for consistent, beautiful interfaces.
                </p>
              </CardBody>
            </Card>
            <Card hover>
              <CardBody>
                <Zap className="w-12 h-12 text-[var(--accent)] mb-4" />
                <h3 className="text-2xl font-bold mb-3">Smart Prompt Composition</h3>
                <p className="text-gray-400">
                  Block-based prompt builder with reusable templates. Search, tag, 
                  and organize prompts that generate production-quality outputs.
                </p>
              </CardBody>
            </Card>
            <Card hover>
              <CardBody>
                <Shield className="w-12 h-12 text-[var(--highlight)] mb-4" />
                <h3 className="text-2xl font-bold mb-3">Build Planning Board</h3>
                <p className="text-gray-400">
                  Kanban-style workflow from idea to ship. Track tasks, manage 
                  dependencies, and ensure production readiness.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[var(--card-bg)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="bg-[var(--primary)] text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Choose Your Vibe</h3>
                <p className="text-gray-400">
                  Select a visual identity that matches your project. Get instant access to 
                  a complete design system with colors, typography, and spacing tokens.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="bg-[var(--accent)] text-white rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Compose Your Prompt</h3>
                <p className="text-gray-400">
                  Use structured blocks for context, requirements, constraints, and output format. 
                  Save templates for reuse across projects.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="bg-[var(--highlight)] text-black rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Generate & Ship</h3>
                <p className="text-gray-400">
                  Get a detailed build brief, plan your work on the kanban board, and track 
                  production readiness with the comprehensive checklist.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-xl font-bold mb-2">Do I need AI provider keys?</h3>
                <p className="text-gray-400">
                  No. Vibe Coding Studio works in demo mode without any keys. For AI-powered 
                  brief generation, you can optionally configure OpenAI or Anthropic.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-xl font-bold mb-2">Can I export my work?</h3>
                <p className="text-gray-400">
                  Yes. Export templates, briefs, and checklists as JSON or Markdown. 
                  Design tokens can be copied for use in any project.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-xl font-bold mb-2">Is my data saved?</h3>
                <p className="text-gray-400">
                  All data is stored locally in your browser. Nothing is sent to external 
                  servers except when you explicitly generate AI briefs.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>© 2024 Vibe Coding Studio. Built with precision and care.</p>
        </div>
      </footer>
    </div>
  )
}
