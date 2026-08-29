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
- [x] Public pages: Availability, Spaces, How it works, Sign in
- [x] Supabase schema: users, rooms, reservation_requests, reservations_confirmed
- [x] Demo mode when Supabase is not configured
- [x] Supabase Auth: email one-time code, account settings
- [ ] Vercel environment variables for the linked Supabase project
- [ ] Seton SSO integration (blocked on identity provider decision)
- [ ] Email notifications (Phase 1 infrastructure placeholder)

## Local development

```bash
npm install
cp .env.example .env.local
# Add Supabase URL and publishable key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/availability`.

Without Supabase env vars, the app runs in **demo mode** with placeholder data for DMC, Faustina Hall, and Gym.

## Supabase setup

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and publishable (or legacy anon) key.
3. In the Supabase dashboard, confirm:
   - Authentication → Providers → Email is enabled
   - Confirm email is enabled
   - Authentication → Email Templates → Magic Link is a 6-digit `{{ .Token }}` only (no confirmation link)
   - URL configuration Site URL is the app origin (for local: `http://localhost:3000`)
   - Redirect URLs include `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/confirm``
4. Apply migrations if this is a new database:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migrations live in `supabase/migrations/`.

Phase 1 uses email one-time codes (6 digits). Seton SSO is deferred until the identity provider is confirmed (masterplan open decision #4). Verified `setonschool.net` users receive requester access automatically; they still need manager approval for reservations.

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

1. Seton email domain: `setonschool.net` (grant requester access on verified signup; not a separate table)
2. Tech Admin email: Phase 1 bootstrap `semperjoey@gmail.com`; production address still to be confirmed
3. Identity provider: email one-time code via Supabase Auth for Phase 1; Google Workspace or Microsoft Entra ID still to be confirmed for production SSO
4. Pending-hold policy: first submitted request creates a Pending hold (masterplan §15.3)
5. Phase 1 database: four tables only (users, rooms, reservation_requests, reservations_confirmed)

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
