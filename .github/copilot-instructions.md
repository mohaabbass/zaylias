# Copilot instructions for Zaylias

## Project shape

- This is a small Next.js 16 app-router app. The main feature is a personal finance dashboard in `app/page.tsx`.
- The app is intentionally simple and monolithic: auth, data fetching, form state, and transaction logic all live in the same screen instead of a larger feature folder structure.
- The persistence layer is Supabase. `lib/supabase.ts` exports a singleton client created from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The app currently reads/writes a table named `expenses`; user records are associated with `session.user.id` when creating entries.

## Data flow and architecture

- `app/page.tsx` calls `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` on mount to decide whether the user is logged in.
- When a session exists, it fetches transactions with `.from("expenses").select("*").order("created_at", { ascending: false })`.
- New entries are inserted directly from the page with `.insert([...])`, and deletion uses `.delete().eq("id", id)`; there is no service/repository layer yet.
- Treat `app/page.tsx` as the canonical implementation for the current feature set unless you are intentionally splitting logic into new files.

## Conventions specific to this repo

- Prefer explicit TypeScript types over `any`; the lint setup currently flags `any` and hook ordering issues.
- Keep helper functions declared before they are referenced in effects, matching the current React patterns in `app/page.tsx`.
- Preserve the existing dark, slate-themed Tailwind styling and Swedish UI copy; the app is user-facing in Swedish.
- Keep changes aligned with the current app-router pattern (`app/` folder, no custom server or route handlers yet).

## Local workflow

- `npm run dev` starts the app at `http://localhost:3000`.
- `npm run lint` is the main validation command and catches project-specific TypeScript/React issues.
- `npm run build` validates the production build and is the safe final check before shipping.
- Because `AGENTS.md` warns this repo is on a newer Next.js version with breaking changes, read the local docs under `node_modules/next/dist/docs/` before making significant framework-level edits.

## Integration notes

- Keep credentials in `.env.local`; do not hardcode Supabase values or secrets.
- The page is a client component (`"use client"`), so browser-only auth/session APIs are used directly in React state.
- Avoid adding abstraction layers unless they are necessary; this codebase currently favors direct Supabase calls and lightweight local state over a larger architecture.
