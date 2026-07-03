# Seton Space Reservations

Public space availability and reservation request system for Seton shared facilities.

## Source of truth documents

All product, design, and engineering decisions must follow:

- [`docs/seton-space-reservations-masterplan.md`](docs/seton-space-reservations-masterplan.md) — product requirements, data model, workflows, security
- [`docs/seton-space-reservations-style-guide.md`](docs/seton-space-reservations-style-guide.md) — UX, content, visual tokens, engineering conventions

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database & Auth | Supabase (PostgreSQL, RLS, Auth) |
| Hosting | Vercel |
| Time zone | `America/New_York` (Eastern Time) |

## Current phase

**Phase 1 — Foundation** (masterplan §32)

- [x] Repository structure and reference docs
- [x] Design tokens and public UI shell
- [x] Public pages: Availability, Spaces, How it works, Sign in placeholder
- [x] Supabase schema migration (core entities + RLS + public availability RPC)
- [x] Demo mode when Supabase is not configured
- [ ] Supabase project linked and migrations applied
- [ ] Vercel deployment
- [ ] Seton SSO integration (blocked on identity provider decision)
- [ ] Email notifications (Phase 1 infrastructure placeholder)

## Local development

```bash
npm install
cp .env.example .env.local
# Add Supabase URL and anon key from https://supabase.com/dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/availability`.

Without Supabase env vars, the app runs in **demo mode** with placeholder data for DMC, Faustina Hall, and Gym.

## Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (or use the Supabase MCP integration).
2. Copy project URL and anon key to `.env.local`.
3. Apply migrations:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migrations live in `supabase/migrations/`.

## Vercel deployment

```bash
npx vercel link
npx vercel env pull .env.local
npm run build
npx vercel deploy
```

Add the same Supabase environment variables in the Vercel project settings.

## Initial launch spaces

Configured via database seed (not hard-coded in UI):

- DMC
- Faustina Hall
- Gym

Space managers, capacities, and official names must be confirmed before production (masterplan open decisions).

## Assumptions (verify before launch)

1. Seton email domain: `setonschool.net` (stored in `approved_domains` table)
2. Tech Admin email: to be confirmed
3. Identity provider: Google Workspace or Microsoft Entra ID — not yet integrated
4. Pending-hold policy: first submitted request creates a Pending hold (masterplan §15.3)

## Project structure

```
docs/                  Master plan + style guide (always reference these)
src/
  app/                 Next.js routes
  components/          UI components
  lib/
    domain/            Status enums, types, error codes
    data/              Data access (Supabase + demo fallback)
    supabase/          Client, server, middleware helpers
supabase/
  migrations/          PostgreSQL schema
```

## License

Private — Seton School.
