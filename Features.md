# IMY761 — Feature List

> Implementation-level breakdown of all features to be developed.
> Status values: `To Do` · `In Progress` · `Done`
> Cross-reference: [Requirements.md](Requirements.md)
> Last updated: 2026-07-28

---

## Module 0 — Infrastructure & Database

| # | Feature | Type | Status |
|---|---------|------|--------|
| INF-01 | Prisma schema — `User` model (id, email, password hash, username, displayName, avatarUrl, role, A/B group, createdAt) | Database | Done — migrated; Postgres in `docker-compose.yml` |
| INF-02 | Prisma schema — `Task` model (id, userId, title, complexity tier, dueDate, completedAt, createdAt) | Database | Done |
| INF-03 | Prisma schema — `Subtask` model (id, taskId, title, completedAt) | Database | Done |
| INF-04 | Prisma schema — `StoreItem` model (id, name, category, levelRequired, coinPrice, imageUrl) | Database | Done |
| INF-05 | Prisma schema — `InventoryItem` model (id, userId, storeItemId, equippedToPetId, quantity) | Database | Done |
| INF-06 | Prisma schema — `CartItem` model (id, userId, storeItemId, quantity) | Database | Done |
| INF-07 | Prisma schema — `Transaction` model (id, userId, storeItemId, coinSpent, purchasedAt) | Database | Done |
| INF-08 | Prisma schema — `Pet` model (id, userId, storeItemId, happiness, hunger, lastInteractedAt) | Database | Done |
| INF-09 | Prisma schema — `TelemetryEvent` model (id, userId, eventType, payload JSON, createdAt) | Database | Done |
| INF-10 | Prisma schema — `UserEconomy` model (id, userId, coins, xp, level, streak, lastStreakDate, dailyCoinsEarned, dailyXpEarned, dailyCapResetAt) | Database | Done — migrated; AUTH-04 creates the row with the user |
| INF-11 | NextAuth configuration (credential + Google providers, JWT strategy, session callbacks) | Backend | Done |
| INF-12 | Global layout component — header with persistent coin balance, XP bar, and level indicator | Frontend | Done — `AppShell` + `AppHeader`/`PersistentHeader` in `src/components/layout/`, reads through `src/lib/economy.ts`. Two densities, both from the handoff: greeting + XP/streak row (dashboard) and title + coins (store, sanctuary). Profile and Settings now use the shell. Three AA gaps ship as designed — level disc 3.84:1, streak pill 2.52:1, streak numeral 2.94:1 — recorded in `globals.css` for INF-14 to accept or fix |
| INF-13 | Responsive layout system — mobile and desktop breakpoints using Tailwind | Frontend | Done — `--breakpoint-frame` (480px) and `--container-app` in `globals.css`; the phone frame now switches to a centred card just past the widest phone rather than at `sm` (640px), where a 300px design was being stretched across tablet widths. `AppShell` is the single frame — the three hand-copied versions (auth, onboarding, app) are gone. Safe-area insets wired through `viewportFit: "cover"`. Documented at `/style-guide#s07` |
| INF-14 | WCAG AA compliance pass — contrast ratios, keyboard navigation, focus states, colour-independent signals | Frontend | Done — contrast is measured with **BPCA** (bridge for WCAG 2 contrast using APCA), not plain WCAG 2: `src/lib/contrast.ts`, ported from `bridge-pca` 0.1.6 and checked by `scripts/verify-bpca.ts`. **Done:** focus ring changed from terracotta (2.40–2.69, failed everywhere) to ink via an inheritable `--focus-ring`; skip link (2.4.1); "Skip for now" target raised to 32px (2.5.8); `Modal` ids generated + `aria-describedby`; field errors are `role="alert"` and focus moves to the first invalid field. Keyboard nav, headings, labels, alt text and colour-independent signals audited clean. **Deferred to alpha by decision:** the four text tokens at ~3.6–3.7 on dark surfaces, the INF-12 header trio, and eight non-text-contrast items (input/checkbox boundaries, progress fills, step dots, secondary + destructive borders) — all listed in the `globals.css` audit block |
| INF-15 | Docker container configuration for EC2 deployment (Dockerfile + docker-compose) | Infrastructure | Done — multi-stage `Dockerfile` on Next's `output: "standalone"` (316MB, runs as non-root `node`, healthcheck), plus `migrate` and `app` services behind a compose `app` profile so plain `docker compose up -d db` stays build-free. Built and run end-to-end: register → sign in → authenticated `/profile`, with the `UserEconomy` row written through the container. Two bugs found by running it — the Prisma client was constructed at import, making `DATABASE_URL` a *build*-time requirement (now lazy, `src/lib/prisma.ts`), and the AUTH-06 sign-in redirect was pinned to `localhost:3000` regardless of `Host`/`X-Forwarded-Host`, which would have broken every redirect behind the EC2 proxy (now derived from the request, `src/proxy.ts`) |
| INF-16 | Environment variable configuration (`.env.example` for Vercel + AWS connection strings) | Infrastructure | Done — `.env.example` rewritten as the reference: every variable, which file it belongs in (`.env.local` vs Compose's `.env` vs the instance environment), and connection-string recipes for RDS, Neon and Vercel. Cross-checked against `process.env` usage — nothing undocumented, nothing stale. Two traps documented after confirming both: copying the template to a Compose `.env` overrides `DATABASE_URL` to `localhost`, which inside the container is the container; and `sslmode=require` means *verify-full* under the pg adapter (verified — `sslmode` is parsed and enforced), so RDS needs `sslrootcert` or it fails cert validation |
| INF-17 | A/B group assignment middleware — enforces Group A/B isolation on all store API routes server-side | Backend | Done — no store API routes exist yet to attach to (STOR-10..18, URG-08 all still To Do), so this ships the enforcement primitive they'll call: `groupGatedData()` in `src/lib/study-group.ts`, returning `null` for Group A/signed-out and the computed value for Group B. Unit tested in `src/lib/study-group.test.ts` against a mocked Prisma client. No test runner existed in this repo — added `vitest` + `vitest-mock-extended` (`vitest.config.ts`, `src/test/`) to support it |
| INF-18 | Prisma schema — `UserSettings` model (id, userId, dailyReminder, streakAlert, soundEffects, reduceMotion) | Database | Done — migrated (`inf18_user_settings`), with a backfill so every existing account got a row. Created with the account like `UserEconomy`, so PRO-15 can update rather than upsert. Defaults live in the schema and match the Settings frame: notifications on, preferences off |
| INF-19 | Prisma schema — `Achievement` + `UserAchievement` models (id, key, name, description, criteria, unlockedAt) | Database | Done — migrated (`inf19_achievements`). `criteria` is JSON with a documented discriminated shape; `@@unique([userId, achievementId])` is what makes PRO-09 idempotent, and absence of a row is what "locked" means. **Catalogue deliberately not seeded** — the design draws six badge tiles but names none, so PRO-09 owns what the badges are |
| INF-20 | `StoreItem` catalogue seed script — populate the store with the `design_handoff` catalogue and animal artwork. Nothing else in the store module writes `StoreItem` rows | Database | Done — `prisma/seed.ts`, wired through `prisma.config.ts`'s `migrations.seed`. Deliberately small: only the 5 items the design mock actually names/prices (Sunflower seeds, Red collar, Treat box, Cosy den, Fox kit) plus 2 more animal unlocks it doesn't invent catalogue data for the rest of the 4-category × 5-level grid, which nothing in `design_handoff` or `economy_system.md` grounds. **3 animal types only** (Koala Lvl 1 starter, Fox Lvl 7, Penguin Lvl 10) — economy_system.md frames the Lvl 7/10 unlocks as a deliberately scarce "2nd/3rd animal type," not a full 22-animal roster; the other ~19 `design_handoff` SVGs are unused. Fox's level comes from the Store mock's own explicit "Fox kit · 2nd animal · Unlocks at Lvl 7" label, taken over the README's looser "starter pet" aside. Non-animal items have no real artwork in the handoff (the mock renders them as flat colour swatches) — `imageUrl` holds a `lucide-react` icon name for those, and a `public/animals/*.svg` path for the 3 animals. Idempotent (matches by `name`, not a DB constraint — `name` isn't unique in the schema). Verified end-to-end against a scratch Postgres container: applied migrations, ran the seed twice, confirmed exactly 7 rows both times with no duplicates |
| INF-21 | Level threshold table — shared XP-per-level constant consumed by ECO-05 and the header XP bar | Backend | Done — `src/lib/levels.ts`. Deviates from the mock: the XP bar fills *within* the current level and empties on level-up, where the mock fills it against the cumulative threshold. INF-12's header label must therefore read `xpIntoLevel / xpLevelSpan` ("7 / 20 XP"), not the mock's "42 / 55 XP" |
| INF-22 | **Desktop adaptation pass** *(low priority)* — adapt the mobile-first app screens to wide viewports: max-width centred column, bottom nav → side rail, two-column dashboard, wider store grid. Distinct from INF-13, which builds the breakpoint system; this is the per-screen pass that uses it. Satisfies the desktop half of NFR-GEN-2. **Deprioritised:** `design_handoff` only specifies phone frames (300×640) for the app — the desktop layouts would be invented, and participants use the study on mobile. The marketing site (MKT-01/02) and admin cards (ADM-01/02) are already desktop-first and are *not* in scope here | Frontend | To Do |

---

## Module 1 — Authentication

| # | Feature | Type | Status |
|---|---------|------|--------|
| AUTH-01 | Register page — form with email and password fields | Frontend | Done |
| AUTH-02 | Login page — form with email and password fields | Frontend | Done |
| AUTH-03 | Logout button and action in global header | Frontend | Done — on Settings (`/settings`), where the designs put it, reached from a gear in the Profile banner |
| AUTH-04 | `POST /api/auth/register` — create user, hash password, assign A/B group randomly, initialise `UserEconomy` record | Backend | Done — backed by Prisma + Postgres |
| AUTH-05 | NextAuth sign-in handler (`POST /api/auth/[...nextauth]`) — validate credentials, issue JWT | Backend | Done — the A/B group is deliberately **not** on the session; read it with `currentStudyGroup()` |
| AUTH-06 | Protected route middleware — redirect unauthenticated users to login | Backend | Done — `src/proxy.ts` (Next 16 renamed middleware to proxy); everything is protected unless allowlisted |
| AUTH-07 | Change username from the profile — inline editor with the same live availability check as the onboarding step | Frontend | Done |
| AUTH-08 | "Continue with Google" button on Register and Login — full-width OAuth button, hidden when the OAuth env vars are absent | Frontend | Done |
| AUTH-09 | Google OAuth provider — NextAuth Google provider; upserts the account on first sign-in and assigns the permanent study group | Backend | Done |

> **Out of scope:** the Login design shows a "Forgot password?" link. Password
> reset is deliberately not ticketed — participants are onboarded directly and
> the study has no mail infrastructure. Remove the link when building AUTH-02.

---

## Module 2 — TODO App

### Task Management

| # | Feature | Type | Status |
|---|---------|------|--------|
| TASK-01 | Task list view — displays all user tasks with title, due date, complexity badge, and completion state | Frontend | To Do |
| TASK-02 | Create task form — fields: title (required), due date (optional), complexity tier (required, 5-option select) | Frontend | To Do |
| TASK-03 | Task detail / edit screen — pre-filled title, due date, complexity chips, subtask list, reward footer, and delete. The designs use a full screen here, not a modal | Frontend | To Do |
| TASK-04 | Delete task action — confirmation prompt before deletion | Frontend | To Do |
| TASK-05 | Complete task action — checkbox or button; triggers reward animation and coin/XP update | Frontend | To Do |
| TASK-06 | Task dashboard stats bar — current level, XP progress bar, streak counter, coin balance | Frontend | To Do |
| TASK-07 | `GET /api/tasks` — list all tasks for the authenticated user | Backend | To Do |
| TASK-08 | `POST /api/tasks` — create a new task | Backend | To Do — use `createTask()` from `src/lib/tasks.ts`; it derives the `titleKey` ECO-02 matches on, so a route calling `prisma.task.create` directly will not type-check |
| TASK-09 | `PATCH /api/tasks/[id]` — edit task title, due date, or complexity | Backend | To Do — use `updateTask()` from `src/lib/tasks.ts`; it rewrites `titleKey` on retitle and scopes the update by `userId` |
| TASK-10 | `DELETE /api/tasks/[id]` — delete a task and its subtasks | Backend | To Do |
| TASK-11 | `POST /api/tasks/[id]/complete` — mark task complete; invoke economy service to calculate and apply reward | Backend | To Do |

### Economy Service (shared business logic)

| # | Feature | Type | Status |
|---|---------|------|--------|
| ECO-01 | Reward calculation service — base coins/XP from complexity tier, apply efficiency modifier (±% for early/late), apply streak bonus, apply anti-spam reduction, apply daily cap check | Backend | Done — `src/lib/rewards.ts`. Pure arithmetic; the two DB-backed inputs (last same-title completion, today's earnings) are parameters supplied by ECO-02/ECO-03 |
| ECO-02 | Anti-spam check — query last completion of same task title within 72 h; apply tiered reward reduction (50% / 25% / 10%) | Backend | Done — `antiSpamCheck()` / `reduceForRepeats()` in `src/lib/economy.ts`, over the new `src/lib/tasks.ts` (the module that owns `prisma.task`). Matched on title, not task id, so delete-and-recreate farming is caught. **Two deviations from NFR-TASK-1 as written, both recorded in Requirements.md**: matching is on a new normalised `Task.titleKey` column (migration `eco02_task_title_key`, backfilled) rather than on `title`, and duplicates that predate the last completion of their title are exempt up to 3 per day, so batch-planning a week of identical tasks is not graded as farming. Verified against the docker Postgres, not just the mock |
| ECO-03 | Daily cap enforcement — reject coin/XP earnings above 300 coins and 500 XP per calendar day | Backend | Done — `dailyAllowanceOf()` / `dailyAllowanceFor()` / `grantEarnings()` in `src/lib/economy.ts`. **Partial grant, not rejection**: at 290/300 coins a 150-coin task still banks the last 10 and reports the withheld 140, so the completion toast can explain the shortfall. Reset is lazy (counters from a past day read as zero) — no midnight sweep to keep alive on a $0 budget. The read is `SELECT … FOR UPDATE` in a transaction: verified that four simultaneous 100-coin grants against the 300 cap bank exactly 300, which a plain read-then-write does not |
| ECO-04 | Streak service — detect if today is a streak day; update streak counter; calculate and apply streak coin bonus (10% / 20% / 35%) | Backend | Done — `nextStreak()` (pure) and `recordStreakDay()` in `src/lib/economy.ts`; the bonus table itself is ECO-01's `streakBonusFor`. Safe to call on every completion — only the first of a calendar day moves the counter, and it must be called *before* pricing so the task that reaches day 3 earns the 10% itself (verified: 35 → 39 coins). Locked with `SELECT … FOR UPDATE` like ECO-03; verified that four simultaneous completions add exactly one day, and that a missed day breaks back to 1 |
| ECO-05 | Level-up service — compare cumulative XP against level threshold table; update level in `UserEconomy`; return level-up event if threshold crossed | Backend | Done — `levelUpBetween()` (pure) and `syncLevel()` (repair) in `src/lib/economy.ts`; the level column is now written by `grantEarnings()` in the *same* update as the XP, not a follow-up write, so the two can never be seen disagreeing. The event carries `levelsGained` as a list because the hockey-stick curve routinely crosses several thresholds on one completion — verified: one Epic from zero gains levels 2–6. Levels off *banked* XP, so a cap-trimmed grant cannot fire a threshold the participant never crossed. **Found a spec error doing this**: Requirements §3.6's first-session example claimed 48 XP reached Level 5; it reaches Level 4 (55 needed). Corrected there. Every `xp` write now goes through one `xpWrite()` helper that pairs the increment with the derived level, so a future write path cannot leave the column stale — the failure would otherwise be silent, since the header reads `xp` and only the store gate reads `level` |
| ECO-06 | `POST /api/economy/buy-xp` — deduct 100 coins, add 40 XP, invoke level-up service | Backend | Done — `buyXp()` in `src/lib/economy.ts` behind `src/app/api/economy/buy-xp/route.ts`. Price is server-side only (never from the body) and the account comes from the session. Adds a `GET` returning `{cost, gain}` so PRO-06's card need not hard-code them. **The daily XP cap deliberately does not apply** — those coins were already capped when earned, and charging the ceiling twice would make a conversion after a busy day silently do nothing. Verified over real HTTP with a signed-in session: 401 unauthenticated, 409 with a shortfall body at 0 coins, three purchases walking level 1→5, and four simultaneous requests against a 100-coin balance yielding exactly one 200 and three 409s |
| ECO-07 | Level-up notification — UI toast or modal shown when the user crosses a level threshold | Frontend | Done — full-screen celebration per `design_handoff/ADDENDUM-levelup.md`, not a toast: `LevelUpScreen` + `LevelUpProvider` in `src/components/economy/`, mounted once in `AppShell` so any screen can raise it with `useLevelUp()`. Queued, so two crossings in quick succession don't overwrite each other, and one screen covers a multi-level climb rather than firing five. Adds `Button` `variant="on-brand"` / `size="hero"` (the landing screen's "Get started" is the same treatment) and `--color-brand-soft`. **Deviation:** with no reward tiles the two actions collapse to one "Continue" — Requirements §3 defines no level-up payout, so "Claim rewards" would promise something that doesn't exist. Confetti falls the full height and exits the bottom (one pass, ~2.4–3.6s staggered; a loop would owe WCAG 2.2.2 a pause control). Distance is a `--confetti-fall` custom property so it works for both shapes the screen takes — measured 941px travel in the 812px full-bleed and 758px in the 640px frame. Verified in the browser at 375×812 full-bleed and 400×640 framed, all states plus reward tiles, via `/style-guide#s08`; console clean (no hydration warning — the confetti is deterministic). **Escape-to-close is inherited from `<dialog>` but could not be verified**: the automation harness's synthetic Escape doesn't drive the UA close-watcher, confirmed with a bare native dialog as a control |

### Subtasks

| # | Feature | Type | Status |
|---|---------|------|--------|
| SUB-01 | Subtask list within a task card — expandable, shows each subtask with completion checkbox | Frontend | To Do |
| SUB-02 | Add subtask inline input within a task card | Frontend | To Do |
| SUB-03 | Complete subtask action — triggers proportional reward | Frontend | To Do |
| SUB-04 | `POST /api/tasks/[id]/subtasks` — add a subtask to a task | Backend | To Do |
| SUB-05 | `POST /api/tasks/[id]/subtasks/[subId]/complete` — mark subtask complete; calculate proportional share of parent task's reward; auto-complete parent when all subtasks done | Backend | To Do |

### Onboarding

| # | Feature | Type | Status |
|---|---------|------|--------|
| ONB-01 | Onboarding checklist widget — displays three goals ("Complete 3 tasks", "Buy 1 animal", "Feed 3 animals today") with live completion status | Frontend | To Do |
| ONB-02 | Goal completion celebration — visual feedback when each onboarding goal is met | Frontend | To Do |
| ONB-03 | `GET /api/onboarding` — return current completion status of the three onboarding goals for the authenticated user | Backend | To Do |
| ONB-04 | Username step — step dots, live availability check, suggestion chips, and a skip that assigns an auto-generated handle | Frontend | Done |
| ONB-05 | `POST /api/user/username` (availability) and `PUT` (claim) — session-scoped, enforces uniqueness | Backend | Done — Prisma-backed; uniqueness enforced by the `User.username` index |

---

## Module 3 — Store

### Core Store

| # | Feature | Type | Status |
|---|---------|------|--------|
| STOR-01 | Store listing page — grid of item cards showing name, image, coin price, level requirement, and availability | Frontend | To Do |
| STOR-02 | Item search bar — filters visible items by name in real time | Frontend | To Do |
| STOR-03 | Category filter — filters visible items by category (food, accessories, animals, decorations) | Frontend | To Do |
| STOR-04 | Item card — level-gated state (locked appearance + "Requires Level X" label for items above user level) | Frontend | To Do |
| STOR-05 | Add to cart button on item card | Frontend | To Do |
| STOR-06 | Cart panel — lists cart items, quantities, subtotal; supports quantity edit and item removal | Frontend | To Do |
| STOR-07 | Checkout flow — confirms purchase, deducts coins, shows confirmation | Frontend | To Do |
| STOR-08 | Coin balance display in store header (persistent) | Frontend | To Do |
| STOR-09 | Purchase history / transaction log page — lists past purchases with item name, coins spent, and date | Frontend | To Do |
| STOR-10 | `GET /api/store/items` — list all store items; include per-item `locked` flag based on user's current level | Backend | To Do |
| STOR-11 | `GET /api/store/items/[id]` — single item detail | Backend | To Do |
| STOR-12 | `POST /api/store/cart` — add item to cart | Backend | To Do |
| STOR-13 | `GET /api/store/cart` — retrieve user's current cart | Backend | To Do |
| STOR-14 | `PATCH /api/store/cart/[id]` — update quantity of a cart item | Backend | To Do |
| STOR-15 | `DELETE /api/store/cart/[id]` — remove item from cart | Backend | To Do |
| STOR-16 | `POST /api/store/checkout` — validate cart, check coin balance, check level gates, deduct coins, create `Transaction` and `InventoryItem` records, log telemetry | Backend | To Do |
| STOR-17 | `GET /api/store/history` — list the authenticated user's purchase transactions | Backend | To Do |
| STOR-18 | Telemetry logging — log `STORE_VISIT`, `ITEM_VIEWED`, and `ITEM_PURCHASED` events to `TelemetryEvent` on relevant actions | Backend | To Do |

### False Urgency — Group B Only

All urgency data is fabricated. No real stock, social, or deadline data exists.

> **Reading the group (NFR-TASK-3).** The A/B assignment is not on the session
> and must never be sent to the browser — `/api/auth/session` is public JSON, and
> a participant who can read their arm is a compromised participant. Use
> `currentStudyGroup()` (`src/lib/study-group.ts`), which reads the database, and
> branch on the server so the losing variant never reaches the client bundle.

| # | Feature | Type | Status |
|---|---------|------|--------|
| URG-01 | **Countdown timer (flash sale)** — MM:SS countdown shown on item cards; resets on page load to a random value within a configured window | Frontend | To Do |
| URG-02 | **Stock depletion indicator** — "Only X left!" badge on item cards; X is a seeded random value per item per session | Frontend | To Do |
| URG-03 | **Cart activity indicator** — "N people have this in their cart" label on item cards; N is a seeded random value | Frontend | To Do |
| URG-04 | **Recent purchases indicator** — "X sold in the last hour" label on item cards; X is a seeded random value | Frontend | To Do |
| URG-05 | **Urgency language overlay** — "Last chance!", "Don't miss out!" text on item cards or item detail | Frontend | To Do |
| URG-06 | **Bundle timer** — "Buy 2 get 1 free — offer ends in MM:SS" banner; timer resets on page load | Frontend | To Do |
| URG-07 | **Currency-based urgency indicator** — "Double XP for purchases this hour only" or "Bonus coins if bought before midnight" banner | Frontend | To Do |
| URG-08 | `GET /api/store/urgency-data` — return seeded fabricated urgency values (stock counts, viewer counts, sale timers) for Group B users only; returns empty/null for Group A | Backend | To Do |

---

## Module 4 — Petting Zoo

| # | Feature | Type | Status |
|---|---------|------|--------|
| PET-01 | Pet sanctuary view — displays all of the user's owned animals with their current visual state | Frontend | To Do |
| PET-02 | Animal card — shows animal name, image, and current happiness/hunger state indicators (happy / neutral / hungry / unhappy) | Frontend | To Do |
| PET-03 | Pet interaction button — "Pet" action on animal card | Frontend | To Do |
| PET-04 | Feed interaction — select a food item from the user's inventory, apply to animal | Frontend | To Do |
| PET-05 | Customize interaction — select an accessory from inventory, equip to animal | Frontend | To Do |
| PET-06 | `GET /api/pets` — list user's animals; compute current happiness and hunger state from `lastInteractedAt` and time elapsed | Backend | To Do |
| PET-07 | `POST /api/pets/[id]/pet` — record pet interaction; update happiness in `Pet` record | Backend | To Do |
| PET-08 | `POST /api/pets/[id]/feed` — validate user owns the food item; update hunger and happiness; decrement item quantity in `InventoryItem` | Backend | To Do |
| PET-09 | `POST /api/pets/[id]/customize` — validate user owns the accessory; set `equippedToPetId` on `InventoryItem` | Backend | To Do |
| PET-10 | Animal state decay — happiness and hunger are computed values derived from time elapsed since last interaction (calculated on `GET /api/pets`, no background job required) | Backend | To Do |
| PET-11 | Animal acquisition — when a `Transaction` is completed for an animal item, create a corresponding `Pet` record for that user | Backend | To Do |

---

## Module 5 — Admin / Researcher Dashboard

| # | Feature | Type | Status |
|---|---------|------|--------|
| ADM-01 | Admin dashboard page — restricted to admin role; accessible at `/admin` | Frontend | To Do |
| ADM-02 | Per-user telemetry table — columns: participant, A/B group, session count, total time in app, days returning, tasks completed | Frontend | To Do |
| ADM-03 | Per-user store telemetry table — columns: participant, A/B group, store visits, items viewed, items purchased, avg time on store page | Frontend | To Do |
| ADM-04 | A/B group assignment list — shows each participant's assigned group | Frontend | To Do |
| ADM-05 | Aggregate comparison view — side-by-side Group A vs Group B summary for each telemetry metric | Frontend | To Do |
| ADM-06 | `GET /api/admin/users` — list all participants with aggregated telemetry; admin role required | Backend | To Do |
| ADM-07 | `GET /api/admin/users/[id]/telemetry` — detailed telemetry for a single participant | Backend | To Do |
| ADM-08 | `GET /api/admin/aggregate` — aggregated Group A vs Group B metrics computed from `TelemetryEvent` records | Backend | To Do |
| ADM-09 | Admin role middleware — reject non-admin users from all `/api/admin/*` routes with 403 | Backend | To Do |
| ADM-10 | Session telemetry logging — log `SESSION_START` and `SESSION_END` events; record time-on-page for store pages | Backend | To Do |
| ADM-11 | AI insight callout — generate and render the short violet summary of the Group A vs Group B divergence on the overview | Backend | To Do |
| ADM-12 | Trust metric capture — per-participant trust rating feeding the "trust 5.3 vs 3.7" comparison bar. **The instrument is undecided** — nothing in the app currently collects this | Backend | To Do |

---

## Module 6 — Profile & Settings

The designs put logout, consent and all preferences on Settings (frame 17), reached
from the Profile banner. See also AUTH-03 (log out) and AUTH-07 (change username).

| # | Feature | Type | Status |
|---|---------|------|--------|
| PRO-01 | Profile page — avatar, name, email, "LEVEL 4" + "STUDY GROUP B" badges, and the entry point to Settings | Frontend | To Do |
| PRO-02 | Avatar upload — circular user-uploadable avatar; the default is an upload placeholder | Frontend | To Do |
| PRO-03 | `POST /api/user/avatar` — validate and store the uploaded image; set `avatarUrl` on the `User` record | Backend | To Do |
| PRO-04 | Lifetime stats grid — tasks done, coins earned, day streak, animals owned (2×2) | Frontend | To Do |
| PRO-05 | `GET /api/user/stats` — aggregate lifetime totals for the authenticated user | Backend | To Do |
| PRO-06 | Buy XP card — violet 100 coins → 40 XP card with a "Convert" action calling ECO-06 | Frontend | To Do — unblocked; `POST /api/economy/buy-xp` returns `{spent, gained, levelUp, economy}`, and `GET` on the same route returns the price. Not exercised from the UI yet |
| PRO-07 | Achievements grid — earned and locked badge tiles | Frontend | To Do |
| PRO-08 | `GET /api/user/achievements` — list all achievements with per-user unlocked state | Backend | To Do |
| PRO-09 | Achievement unlock service — evaluate criteria on task completion, purchase, and pet interaction | Backend | To Do |
| PRO-10 | Settings page — grouped ACCOUNT / NOTIFICATIONS / PREFERENCES list cards with back navigation | Frontend | To Do |
| PRO-11 | Change password form — current and new password fields with validation and error states | Frontend | To Do |
| PRO-12 | `POST /api/user/password` — verify the current password and store the new hash | Backend | To Do |
| PRO-13 | Notification preference toggles — "Daily task reminder" and "Streak at risk alert" (both ON by default) | Frontend | To Do |
| PRO-14 | App preference toggles — "Sound effects" and "Reduce motion" (both OFF by default; reduce-motion pairs with INF-14) | Frontend | To Do |
| PRO-15 | `GET` and `PATCH /api/user/settings` — read and persist the notification and preference toggles | Backend | To Do |
| PRO-16 | Research consent note — participant note with the researcher withdrawal contact on Settings | Frontend | To Do |
| PRO-17 | Reminder delivery — actually send the daily reminder and streak-at-risk notifications, honouring PRO-13. **Channel undecided** (web push vs email); without this the toggles control nothing | Backend | To Do |

---

## Module 7 — Shared UI & States

Components and screen states specified in the designs that no feature ticket owned.
INF-12 covers the persistent header; SHR-01 covers the other half of the app chrome.

| # | Feature | Type | Status |
|---|---------|------|--------|
| SHR-01 | Bottom nav — four floating 42px tab circles (Tasks, Store, Zoo, Profile) plus a raised 46px terracotta "+" in the middle, on every logged-in screen. The "+" opens the create-task sheet (TASK-02); it replaces the old floating FAB | Frontend | To Do |
| SHR-02 | Inline date-picker popover — **not a modal**; attaches beneath the due-date field with quick chips (Today / Tomorrow / Weekend), month nav, and a square-cell month grid. Consumed by TASK-02 and TASK-03 | Frontend | To Do |
| SHR-03 | Confirm modal component — one shared component with destructive and non-destructive variants, stacked full-width actions, scrim dismiss. Consumed by TASK-04 and AUTH-03 (see `design_handoff/ADDENDUM-username-modals.md`) | Frontend | To Do |
| SHR-04 | Empty state — tasks ("All clear!" + "New task" action) | Frontend | To Do |
| SHR-05 | Empty state — cart ("Cart's empty" + secondary "Go to store") | Frontend | To Do |
| SHR-06 | Locked-by-level state — violet lock, "Locked — Level 7", level progress bar and levels-to-go label. Distinct from the locked *card* variant in STOR-04 | Frontend | To Do |
| SHR-07 | Error / offline state — "Can't reach TaskTails" with a Retry action | Frontend | To Do |

---

## Module 8 — Marketing & Public Site

Unauthenticated entry points. Desktop-first for MKT-01/02 (the only part of the
product that is), mobile for MKT-03.

| # | Feature | Type | Status |
|---|---------|------|--------|
| MKT-01 | Marketing site — desktop nav (logo, Features / How it works / The zoo / Log in, "Get started free"), hero with CTAs, avatar-stack social proof, and the hero phone | Frontend | To Do |
| MKT-02 | Marketing site — three-column feature grid, "Three steps" how-it-works, closing CTA, dark footer | Frontend | To Do |
| MKT-03 | Landing / welcome screen — full terracotta screen, light fox badge, three translucent feature chips, white "Get started" + "Log in" link | Frontend | To Do |
