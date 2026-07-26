# TaskTails

Gamified todo app and pet sanctuary, built as the research instrument for the
IMY761 study on false-urgency dark patterns. Complete tasks → earn coins and XP →
spend them in a store → feed, pet and customise animals in a sanctuary. Every
participant is randomly assigned to **Group A** (neutral store) or **Group B**
(store with fabricated urgency stimuli).

- [Requirements.md](Requirements.md) — canonical functional / non-functional requirements
- [Features.md](Features.md) — ticket-level breakdown and status
- [design_handoff/](design_handoff/) — the authoritative designs (open the `.dc.html` files in a browser)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · NextAuth v5
(JWT sessions) · Zod · Lucide icons · Fredoka + Nunito via `next/font`.

**No component library.** shadcn/ui was in the original plan but is not used —
TaskTails has a complete bespoke design system and shadcn's token layer conflicted
with it. UI primitives are hand-built in `src/components/ui/` against the tokens
in `src/app/globals.css`. Individual shadcn components can still be copied in
later if a complex widget warrants it.

Prisma + PostgreSQL are planned (INF-01…INF-10) but not wired up yet — see
[Mocked for now](#mocked-for-now).

## Getting started

```bash
npm install
```

Copy the env template and fill it in:

```bash
cp .env.example .env.local
```

`AUTH_SECRET` is required. Generate one with:

```bash
npx auth secret
```

Then:

```bash
npm run dev
```

The app runs at http://localhost:3000 (`/` redirects to `/register`).

### Google sign-in

`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` come from a Google Cloud OAuth 2.0
client. Add `http://localhost:3000/api/auth/callback/google` as an authorised
redirect URI. Until both variables are set, the "Continue with Google" button
renders disabled with a note explaining why.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Design system

Every token from `design_handoff/TaskTails Style Guide.dc.html` lives in
[`src/app/globals.css`](src/app/globals.css) as a Tailwind v4 `@theme` variable —
colours, radii, shadows and the two font families. Use the tokens
(`bg-terracotta`, `rounded-input`, `shadow-card`, `text-overline`, …) rather than
raw hex values so the screens stay consistent.

Two rules from the handoff worth repeating:

- **Urgency red (`--color-urgency`) is reserved** for Group B false-urgency
  elements and destructive actions. Neutral and Group A UI must never use it.
- **No emoji.** Icons come from `lucide-react`.

Shared primitives live in `src/components/ui/`.

### Living style guide

Run the app and open **`/style-guide`** to see every token and component as the
app actually renders them. Colour values are parsed out of `globals.css` at build
time, so the page can't drift from the code, and it computes the WCAG contrast
ratio for each text token against every surface — use it to check AA compliance
(NFR-GEN-1 / INF-14) after any palette change. It isn't linked from the app.

## Mocked for now

There is no database yet. [`src/lib/mock/users.ts`](src/lib/mock/users.ts) is an
in-memory stand-in for the planned `User` + `UserEconomy` models: accounts are
process-local, so they disappear when the dev server restarts and are not shared
between serverless instances. Passwords are hashed with `node:crypto` `scrypt`.

Swapping in Prisma should only mean replacing the exported functions in that one
module — `src/auth.ts` and `src/app/api/auth/register/route.ts` call into it and
otherwise know nothing about storage.

## Project layout

```
src/
  app/
    (auth)/register/        AUTH-01 — register page
    (auth)/login/           AUTH-02 — placeholder
    onboarding/             ONB-01  — placeholder
    api/auth/[...nextauth]/ AUTH-05 — NextAuth handlers
    api/auth/register/      AUTH-04 — mock register endpoint
    globals.css             design tokens + type scale
  auth.ts                   INF-11  — NextAuth configuration
  components/ui/            shared primitives (button, text field, …)
  lib/mock/                 in-memory stand-in for the database
  lib/validation/           shared Zod schemas
```
