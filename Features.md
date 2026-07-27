# IMY761 — Feature List

> Implementation-level breakdown of all features to be developed.
> Status values: `To Do` · `In Progress` · `Done`
> Cross-reference: [Requirements.md](Requirements.md)
> Last updated: 2026-07-26

---

## Module 0 — Infrastructure & Database

| # | Feature | Type | Status |
|---|---------|------|--------|
| INF-01 | Prisma schema — `User` model (id, email, password hash, A/B group, createdAt) | Database | To Do |
| INF-02 | Prisma schema — `Task` model (id, userId, title, complexity tier, dueDate, completedAt, createdAt) | Database | To Do |
| INF-03 | Prisma schema — `Subtask` model (id, taskId, title, completedAt) | Database | To Do |
| INF-04 | Prisma schema — `StoreItem` model (id, name, category, levelRequired, coinPrice, imageUrl) | Database | To Do |
| INF-05 | Prisma schema — `InventoryItem` model (id, userId, storeItemId, equippedToPetId, quantity) | Database | To Do |
| INF-06 | Prisma schema — `CartItem` model (id, userId, storeItemId, quantity) | Database | To Do |
| INF-07 | Prisma schema — `Transaction` model (id, userId, storeItemId, coinSpent, purchasedAt) | Database | To Do |
| INF-08 | Prisma schema — `Pet` model (id, userId, storeItemId, happiness, hunger, lastInteractedAt) | Database | To Do |
| INF-09 | Prisma schema — `TelemetryEvent` model (id, userId, eventType, payload JSON, createdAt) | Database | To Do |
| INF-10 | Prisma schema — `UserEconomy` model (id, userId, coins, xp, level, streak, lastStreakDate, dailyCoinsEarned, dailyXpEarned, dailyCapResetAt) | Database | To Do |
| INF-11 | NextAuth configuration (credential provider, JWT strategy, session callbacks) | Backend | Done |
| INF-12 | Global layout component — header with persistent coin balance, XP bar, and level indicator | Frontend | To Do |
| INF-13 | Responsive layout system — mobile and desktop breakpoints using Tailwind | Frontend | To Do |
| INF-14 | WCAG AA compliance pass — contrast ratios, keyboard navigation, focus states, colour-independent signals | Frontend | To Do |
| INF-15 | Docker container configuration for EC2 deployment (Dockerfile + docker-compose) | Infrastructure | To Do |
| INF-16 | Environment variable configuration (`.env.example` for Vercel + AWS connection strings) | Infrastructure | To Do |
| INF-17 | A/B group assignment middleware — enforces Group A/B isolation on all store API routes server-side | Backend | To Do |

---

## Module 1 — Authentication

| # | Feature | Type | Status |
|---|---------|------|--------|
| AUTH-01 | Register page — form with email and password fields | Frontend | Done |
| AUTH-02 | Login page — form with email and password fields | Frontend | Done |
| AUTH-03 | Logout button and action in global header | Frontend | To Do |
| AUTH-04 | `POST /api/auth/register` — create user, hash password, assign A/B group randomly, initialise `UserEconomy` record | Backend | In Progress — mocked against an in-memory store; needs Prisma (INF-01, INF-10) |
| AUTH-05 | NextAuth sign-in handler (`POST /api/auth/[...nextauth]`) — validate credentials, issue JWT | Backend | Done |
| AUTH-06 | Protected route middleware — redirect unauthenticated users to login | Backend | To Do |
| AUTH-07 | Change username from the profile — inline editor with the same live availability check as the onboarding step | Frontend | Done |

---

## Module 2 — TODO App

### Task Management

| # | Feature | Type | Status |
|---|---------|------|--------|
| TASK-01 | Task list view — displays all user tasks with title, due date, complexity badge, and completion state | Frontend | To Do |
| TASK-02 | Create task form — fields: title (required), due date (optional), complexity tier (required, 5-option select) | Frontend | To Do |
| TASK-03 | Edit task modal — pre-filled form for title, due date, complexity | Frontend | To Do |
| TASK-04 | Delete task action — confirmation prompt before deletion | Frontend | To Do |
| TASK-05 | Complete task action — checkbox or button; triggers reward animation and coin/XP update | Frontend | To Do |
| TASK-06 | Task dashboard stats bar — current level, XP progress bar, streak counter, coin balance | Frontend | To Do |
| TASK-07 | `GET /api/tasks` — list all tasks for the authenticated user | Backend | To Do |
| TASK-08 | `POST /api/tasks` — create a new task | Backend | To Do |
| TASK-09 | `PATCH /api/tasks/[id]` — edit task title, due date, or complexity | Backend | To Do |
| TASK-10 | `DELETE /api/tasks/[id]` — delete a task and its subtasks | Backend | To Do |
| TASK-11 | `POST /api/tasks/[id]/complete` — mark task complete; invoke economy service to calculate and apply reward | Backend | To Do |

### Economy Service (shared business logic)

| # | Feature | Type | Status |
|---|---------|------|--------|
| ECO-01 | Reward calculation service — base coins/XP from complexity tier, apply efficiency modifier (±% for early/late), apply streak bonus, apply anti-spam reduction, apply daily cap check | Backend | To Do |
| ECO-02 | Anti-spam check — query last completion of same task title within 72 h; apply tiered reward reduction (50% / 25% / 10%) | Backend | To Do |
| ECO-03 | Daily cap enforcement — reject coin/XP earnings above 300 coins and 500 XP per calendar day | Backend | To Do |
| ECO-04 | Streak service — detect if today is a streak day; update streak counter; calculate and apply streak coin bonus (10% / 20% / 35%) | Backend | To Do |
| ECO-05 | Level-up service — compare cumulative XP against level threshold table; update level in `UserEconomy`; return level-up event if threshold crossed | Backend | To Do |
| ECO-06 | `POST /api/economy/buy-xp` — deduct 100 coins, add 40 XP, invoke level-up service | Backend | To Do |
| ECO-07 | Level-up notification — UI toast or modal shown when the user crosses a level threshold | Frontend | To Do |

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
| ONB-05 | `POST /api/user/username` (availability) and `PUT` (claim) — session-scoped, enforces uniqueness | Backend | In Progress — mocked against the in-memory store; needs Prisma and a unique index (INF-01) |

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
