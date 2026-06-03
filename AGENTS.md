# Project description

Tap-it is a Next.js + TypeScript web application for gym and membership management. It provides

- QR-based check-in and membership validation
- Real-time occupancy and presence tracking
- Membership billing via Stripe and transaction history
- Admin tools for managing memberships, news, and settings

Built with Supabase for backend and auth, Tap-it focuses on privacy, simplicity, and a smooth check-in experience.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- Stripe

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Project Conventions & Patterns

Folder structure:

- `src/components`: UI components (server by default; add "use client" when needed)
- `src/lib`: shared server+client utilities, API wrappers, and helpers
- `src/pages`: Top-level Pages Router routes and API routes (legacy). Prefer `src/app` for the App Router; keep `src/pages` only for compatibility or pages-router specific code.
- `src/types`: TypeScript types and interfaces

Supabase pattern:

- Prefer server-side Supabase clients for server components and API routes (use @supabase/ssr or server-side instantiation of `@supabase/supabase-js`).
- Use the browser Supabase client only inside client components that need realtime or client-side auth.
- Keep connection and helper logic in `src/lib/supabase` and expose minimal, well-typed helpers.

Auth conventions:

- Protect pages using `src/middleware.ts` for route-level guard checks and server-side session validation.
- Also perform server-side auth checks in layout/server components where needed (e.g., membership checks in protected layouts).
- Client components should assume the server already enforced auth and receive only necessary props.

Stripe pattern:

- Place webhook handlers under `src/app/api/webhooks/stripe` (or `src/pages/api/webhooks/stripe` for pages router).
- Verify Stripe signatures server-side, process only idempotent events, and update membership/billing state in Supabase.
- Keep secret keys and webhook secrets in `.env.local` and never expose them to the client.

## Code Rules

### 1. Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## Design

- Take icons from lucide-react rather than creating your own vectors
- Keep design minimalistic with more emphasis on smooth spacing rather than boxes

## Notes

- Run `npm run build` after finishing implementation to avoid build errors
- Environment variables are in `.env.local`
