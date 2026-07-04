# Vibe Coding Studio

A premium AI-powered build planning and prompt composition tool for developers and founders.

## Features

- **Vibe-Driven Design System** — Five premium visual profiles with complete design tokens
- **Structured Prompt Composition** — Block-based prompt builder with reusable templates
- **Build Planning Board** — Kanban-style workflow from idea to production
- **Production Checklist** — Comprehensive readiness tracking with export
- **Demo Mode** — Fully functional without AI provider keys

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Routing**: TanStack Router (typed routes)
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Backend**: Hono
- **Testing**: Vitest + Testing Library

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run typecheck
pnpm typecheck

# Run tests
pnpm test

# Build for production
pnpm build

# Run all gates
bash gates.sh

# Run live proof (requires API running)
bash live_proof.sh
```

## Project Structure

```
vibe-coding-studio/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Hono backend
├── packages/
│   └── shared/       # Shared types and schemas
├── scripts/          # Verification scripts
└── tests/            # Test suites
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Public (exposed to browser)
VITE_PUBLIC_APP_NAME="Vibe Coding Studio"
VITE_PUBLIC_APP_URL="http://localhost:5173"

# Server-only (optional for AI generation)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Routes

- `/` — Marketing landing page
- `/studio` — Main workspace
- `/prompts` — Template library
- `/vibes` — Visual profile gallery
- `/board` — Kanban board
- `/checklist` — Production checklist
- `/settings` — Configuration

## Verification

The project includes comprehensive verification:

- **No secrets** — Scans for hardcoded credentials
- **No placeholders** — Ensures no TODO/FIXME in src/
- **TypeScript strict** — Full type safety
- **Tests** — Unit and integration coverage
- **Build** — Production bundle verification

Run all checks:

```bash
bash gates.sh
```

## License

MIT

## Support

For issues and questions, see ACCEPTANCE.md for project scope and constraints.
