# ACCEPTANCE CRITERIA

## Product Purpose

Vibe Coding Studio is a premium AI-powered build planning and prompt composition tool for developers and founders who want to ship production-quality software rapidly. It combines visual vibe selection, structured prompt engineering, and kanban-style build planning into a cohesive workflow that transforms ideas into actionable build briefs.

## Primary Users

1. **Solo Founders** — Need to rapidly prototype MVPs with consistent design systems
2. **Product Engineers** — Want structured prompts that produce production-ready outputs
3. **Technical Teams** — Require shared prompt libraries and build planning workflows

## Three Core Features

### 1. Vibe-Driven Design Token System
- Five pre-built vibe profiles (SaaS Neon, Brutalist Terminal, Calm Builder, Cyber Studio, Minimal Founder)
- Instant theme switching with CSS custom properties
- Visual preview of color palettes, typography, spacing, and radii
- Export design tokens for use in external projects

### 2. Structured Prompt Composition
- Block-based prompt builder with categories (Context, Requirements, Constraints, Output Format)
- Template library with CRUD operations (create, read, update, delete)
- Search, filter by tags, and favorite templates
- Export templates as JSON or Markdown
- Demo mode generation when AI provider keys are missing (deterministic, no fake API calls)

### 3. Build Planning Board
- Kanban-style board with six columns: Idea → Prompt → Design → Build → Test → Ship
- Drag-and-drop task management
- Production-readiness checklist with export to Markdown
- Visual progress tracking

## Out of Scope

- Real AI provider integration (infrastructure only, no live API calls in offline mode)
- Authentication and multi-user workspaces (single-user local-first)
- Version control or git integration
- Payment processing or billing
- Real-time collaboration
- Mobile native apps

## Risks

1. **Tailwind v4 breaking changes** — Mitigation: Use @tailwindcss/vite plugin as documented
2. **TanStack Router v1 type complexity** — Mitigation: Follow official typed routes guide
3. **Missing AI keys during demo** — Mitigation: Clear labeling of demo mode, deterministic outputs
4. **Dark theme accessibility** — Mitigation: WCAG AA contrast ratios, focus indicators

## Verification Plan

### Offline Verification (gates.sh)
1. ✅ No TODO/FIXME/STUB/PLACEHOLDER in src/ directories
2. ✅ No hardcoded secrets in source files
3. ✅ .env is gitignored, .env.example exists
4. ✅ TypeScript strict mode passes
5. ✅ ESLint passes with zero warnings
6. ✅ All tests pass (unit + integration)
7. ✅ Production build succeeds

### Live Verification (live_proof.sh)
1. ✅ API health endpoint responds
2. ✅ API config/public endpoint returns safe config
3. ✅ generate-brief endpoint handles missing AI keys gracefully
4. ✅ Web app renders all routes without errors
5. ⏸️ Docker build (may be unavailable in CI)

### Manual Verification (human QA)
1. Navigate to all 8 routes, verify content renders
2. Test prompt template CRUD
3. Test vibe switching
4. Test board drag-and-drop
5. Export checklist and templates
6. Verify demo mode labeling

## Gate Checklist

- [ ] ACCEPTANCE.md created
- [ ] Monorepo structure matches spec
- [ ] All package.json files created with correct dependencies
- [ ] TypeScript configs extend base with strict mode
- [ ] Shared package with Zod schemas and types
- [ ] API with Hono routes (health, config, generate-brief, export)
- [ ] Web app with all 8 routes rendering real UI
- [ ] Design token system with 5 vibe profiles
- [ ] Demo generation function (deterministic)
- [ ] UI components (button, card, badge, input, etc.)
- [ ] Tests for schemas, API routes, components, demo logic
- [ ] gates.sh script
- [ ] live_proof.sh script
- [ ] verify-no-secrets.mjs script
- [ ] verify-no-placeholders.mjs script
- [ ] .env.example with empty values
- [ ] .gitignore includes .env
- [ ] README.md with setup instructions
- [ ] ATTRIBUTIONS.md
- [ ] All gates pass
- [ ] Live proof passes (where applicable)

## Verdict Definitions

- **PASS** — All verification commands ran successfully in this environment with evidence
- **PASS-W-LIMITS** — Offline tests passed, but live external services not proven due to missing credentials/infrastructure
- **HOLD** — Feature not run due to missing prerequisites (e.g., Docker unavailable)
- **FAIL** — Ran and produced errors

## Success Criteria

The project is considered ACCEPTED when:
1. All offline gates pass (typecheck, lint, test, build)
2. All verification scripts pass
3. API responds to health checks
4. Web app renders all routes
5. Demo mode clearly labeled and functional
6. No TODOs or placeholders in src/
7. No secrets committed
8. Dockerfile builds successfully (or marked HOLD if unavailable)
