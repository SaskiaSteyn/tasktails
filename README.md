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

Prisma 7 + PostgreSQL back the accounts (INF-01, INF-10, AUTH-04); the rest of
the models are migrated but nothing writes to them yet.

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

Start the database (needs Docker running) and apply the migrations:

```bash
docker compose up -d && npx prisma migrate dev
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
| `npm run postinstall` | Regenerate the Prisma client (runs automatically after `npm install`) |

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

## Database

Local development runs the Postgres in [`docker-compose.yml`](docker-compose.yml)
(`docker compose up -d`). Passwords are hashed with `node:crypto` `scrypt` — no
bcrypt dependency.

Two Prisma 7 details worth knowing, because both changed from Prisma 6:

- The connection string is **not** in `datasource db` any more. The CLI reads it
  from [`prisma.config.ts`](prisma.config.ts) (which loads `.env.local`, since
  Prisma only reads `.env` on its own), and the runtime client gets it through
  the `PrismaPg` adapter in [`src/lib/prisma.ts`](src/lib/prisma.ts).
- The client is generated into `src/generated/prisma`, which is gitignored — so
  `npm install` runs `prisma generate` for you via `postinstall`.

All account access goes through [`src/lib/users.ts`](src/lib/users.ts); nothing
else touches `prisma.user` directly.

| Command | Purpose |
|---|---|
| `docker compose up -d` | Start Postgres |
| `npx prisma migrate dev` | Apply / create migrations |
| `npx prisma studio` | Browse the data |
| `docker compose down -v` | Stop and wipe the database |

## Project layout

```
src/
  app/
    (auth)/register/        AUTH-01 — register page
    (auth)/login/           AUTH-02 — placeholder
    onboarding/             ONB-01  — placeholder
    api/auth/[...nextauth]/ AUTH-05 — NextAuth handlers
    api/auth/register/      AUTH-04 — register endpoint
    profile/                AUTH-07 — profile (partial)
    settings/               AUTH-03 — settings + log out (partial)
    globals.css             design tokens + type scale
  auth.ts                   INF-11  — NextAuth configuration
  auth.config.ts            the DB-free half, shared with the proxy
  proxy.ts                  AUTH-06 — protected routes (was middleware.ts pre-Next 16)
  components/ui/            shared primitives (button, text field, …)
  generated/prisma/         generated Prisma client (gitignored)
  lib/prisma.ts             INF-01  — Prisma client singleton
  lib/users.ts              every account read and write
  lib/validation/           shared Zod schemas
```
