# Technical Plan — Arogya Relay

Status: draft — 16 August 2026

This plan records the verified technology stack and how the Arogya Relay
prototype is built, run, and deployed. It is grounded in the actual repo
(`README.md`, `package.json`, `app/`, `worker/`, `db/`).

## Verified stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Current prototype |
| UI | React 19 | |
| Language | TypeScript | |
| Styling | Tailwind CSS 4 (via `@import "tailwindcss"`) | Custom tokens in `app/globals.css` |
| Build / dev | Vinext + Vite | Cross-platform launcher in `build/` |
| Runtime | Cloudflare Workers (compatible) | `worker/` entry, `.openai/hosting.json` |
| Data (optional) | Drizzle ORM + Cloudflare D1 | Scaffolding in `db/`, `drizzle/` — not used by prototype |
| Node | ≥ 22.13.0 | Hard requirement |
| Package manager | npm | |

## Architecture

- **Single route dashboard** at `app/page.tsx` ("use client") with three
  client-side tabs: Overview, Case queue, Field device.
- Tab state is local React state (`useState<Tab>`); no router navigation between
  tabs.
- "New screening" is a modal (`role="dialog"`, `aria-modal`) rendered above the
  dashboard.
- Demo data (alerts, chart bars) is defined inline as constants — **no network
  calls, no real storage**.
- Sync is simulated with `setTimeout` and status text updates.

## Project structure (actual)

```text
app/              Application interface + global styling (page.tsx, globals.css)
build/            Cross-platform Vinext launcher + Sites build support
db/               Optional Drizzle connection + schema scaffolding
drizzle/          Drizzle migration metadata
public/           Static assets
tests/            Rendered-output checks
worker/           Cloudflare Worker entry point
.openai/hosting.json   Sites deployment configuration
```

## Local development

```bash
npm install      # install dependencies
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run production build locally
npm run lint     # ESLint
npm test         # rendered-output test
npm run db:generate   # Drizzle migrations (optional/future)
```

## Planned technical additions

- `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/contact/page.tsx`.
- `app/not-found.tsx` (404) and `app/error.tsx` (error boundary).
- `app/sitemap.ts` and `app/robots.ts` for crawlability (or disable indexing for
  a private prototype).
- `.env.example` listing any future variable names (never commit real secrets).

## Deployment (Cloudflare Workers, free tier)

- Build output is deployed as a Cloudflare Worker (no credit card required on
  the free tier).
- Configure a preview URL for staged client review.
- Optional custom domain (~$10–25/yr) is an **opt-in paid extra**.

## Security & privacy posture (prototype)

- No real patient data; all demo data is fictional.
- No API keys or credentials are committed; `.gitignore` excludes env files.
- For any real pilot: auth, encryption at rest/in transit, consent, audit logs,
  secret management, and penetration testing would be required (out of scope
  here).

## Testing approach

- `npm test` rendered-output check on the current build.
- Manual QA against `10-qa-checklist.md` (layout, keyboard, forms, 404/error,
  Core Web Vitals, WCAG 2.2 AA).
- Optional: Playwright for critical flow (New screening → Case queue).

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Cloudflare free-tier limits change | Re-check pricing before client quotation |
| Demo data mistaken for real | Prominent non-diagnostic + fictional-data messaging |
| Scope creep to "real" backend | Change-request process in `03-scope-of-work.md` |

