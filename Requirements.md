# IMY761 — System Requirements

> **Living document.** This file is the canonical requirements reference for the Beta system (due 2026-07-11).
> Source PDFs in this folder are the original deliverables; this document consolidates them with all agreed gap fills.
> Last updated: 2026-06-30

---

## 1. Functional Requirements

### 1.1 Authentication

| # | Requirement |
|---|-------------|
| AUTH-1 | Users can register with an email address and password |
| AUTH-2 | Users can log in with their credentials |
| AUTH-3 | Users can log out |
| AUTH-4 | Sessions persist across browser refreshes (JWT via NextAuth) |
| AUTH-5 | A/B group (control or experimental) is assigned randomly at account creation and is permanent for the study duration |

---

### 1.2 TODO App

#### 1.2.1 Task Management

| # | Requirement |
|---|-------------|
| TASK-1 | Users can create a task with a title |
| TASK-2 | Users can set an optional due date on a task |
| TASK-3 | Users can set the complexity/size of a task (one of five tiers: Trivial, Small, Medium, Large, Epic) |
| TASK-4 | Users can edit a task (title, due date, complexity) |
| TASK-5 | Users can delete a task |
| TASK-6 | Users can mark a task as complete; completion triggers coin and XP reward calculation |
| TASK-7 | Users can view all their tasks in a list |
| TASK-8 | Users can view their current XP, level, and streak on the task dashboard |
| TASK-9 | Users can view their current coin balance (displayed persistently in the header) |

#### 1.2.2 Subtasks

| # | Requirement |
|---|-------------|
| SUB-1 | Users can add subtasks to any task |
| SUB-2 | Users can mark individual subtasks as complete |
| SUB-3 | Completing a subtask earns a proportional share of the parent task's coins and XP |
| SUB-4 | When all subtasks are complete, the parent task is automatically marked complete; no additional reward is issued (all value distributed to subtasks) |
| SUB-5 | Tasks with no subtasks earn their full reward on direct completion |

#### 1.2.3 Onboarding

| # | Requirement |
|---|-------------|
| ONB-1 | New users are presented with three onboarding goals: "Complete 3 tasks", "Buy 1 animal", "Feed 3 animals today" |
| ONB-2 | Onboarding goals are tracked and shown as completed once met |

---

### 1.3 Store (Storefront)

| # | Requirement |
|---|-------------|
| STORE-1 | Users can search items by name |
| STORE-2 | Users can filter items by category |
| STORE-3 | Users can add items to a cart |
| STORE-4 | Users can view and modify their cart |
| STORE-5 | Users can check out and purchase items using coins |
| STORE-6 | Items are gated by the user's current level; items above the user's level are visible but non-purchasable, with the required level displayed |
| STORE-7 | The user's current coin balance is displayed persistently in the store header |
| STORE-8 | Users can view a purchase history / transaction log |
| STORE-9 | **Group B only** — false urgency indicators are displayed on store items (see Section 4) |
| STORE-10 | **Group A only** — the store displays neutral item cards with price and description only; no urgency indicators |

---

### 1.4 Petting Zoo

| # | Requirement |
|---|-------------|
| PET-1 | Users can view their animals in a pet sanctuary |
| PET-2 | Users can pet their animals (interaction registers as engagement) |
| PET-3 | Users can feed their animals using food items purchased from the store |
| PET-4 | Users can customize animals with accessories purchased from the store |
| PET-5 | Animals purchased in the store appear in the petting zoo |
| PET-6 | Animals have a happiness state and a hunger state |
| PET-7 | Animal happiness degrades over time if not interacted with; feeding and petting restore happiness |
| PET-8 | Animal hunger state increases over time; feeding reduces hunger |
| PET-9 | Animal states are visually indicated (e.g., happy, neutral, hungry, unhappy) |

---

### 1.5 Admin / Researcher Dashboard

| # | Requirement |
|---|-------------|
| ADMIN-1 | Admin users can view per-user telemetry: session count, total time in app, days returning, tasks completed |
| ADMIN-2 | Admin users can view per-user store telemetry: store visits, items viewed vs purchased, time spent on store page |
| ADMIN-3 | Admin users can view the A/B group assignment for each participant |
| ADMIN-4 | Admin users can view an aggregate breakdown comparing Group A and Group B across all telemetry metrics |

---

## 2. Non-Functional Requirements

### 2.1 TODO App

| # | Requirement |
|---|-------------|
| NFR-TASK-1 | **Anti-spam guardrail** — if a user completes a task with the same title within 24 h of a prior completion, the reward is reduced to 50% coins/XP. Within 48 h: 25%. Within 72 h: 10%. Minimum floor: 1 coin, 1 XP. Titles are matched on a normalised key (trimmed, whitespace-collapsed, lowercased), so capitalisation and spacing cannot evade the check. **Two exemptions** (ECO-02, added after the rule as first written was found to punish honest planning): a duplicate that *already existed* when its title was last completed keeps its full reward, because a task created before the reward was seen was planned rather than spawned in response to it; that exemption lapses after 3 completions of the same title in one calendar day, so a single large batch of identical tasks cannot buy unlimited full rewards. The floor never *raises* a reward — a task already reduced to 0 coins by lateness stays at 0, or a repeat would pay more than a single completion. |
| NFR-TASK-2 | **Daily cap** — a user may earn a maximum of 300 coins and 500 XP per day across all tasks |
| NFR-TASK-3 | **A/B group isolation** — Group A users must never see false urgency indicators; Group B users must always see them in the store. Assignment must be enforced server-side |

### 2.2 Store

| # | Requirement |
|---|-------------|
| NFR-STORE-1 | Telemetry events must be logged for every store page visit, item view, and purchase |

### 2.3 General / Infrastructure

| # | Requirement |
|---|-------------|
| NFR-GEN-1 | The system must meet WCAG AA accessibility standards (minimum 4.5:1 contrast ratio for text; keyboard navigable; colour is not the sole signal) |
| NFR-GEN-2 | The system must be fully responsive on mobile and desktop viewports |
| NFR-GEN-3 | **Infrastructure cost** — the system targets $0 operational cost during the 2-week study by running within AWS Free Tier. If the free tier is unavailable or expires, the database migrates to Neon PostgreSQL (Prisma-compatible, `.env` connection string change only) at ~$7/month, keeping total infrastructure cost below $15/month |
| NFR-GEN-4 | Authentication sessions use JWT (NextAuth); session tokens must not be stored in a way that violates ethics or privacy requirements |

---

## 3. Economy System

### 3.1 Overview

- **Coins** — earned by completing tasks; spent in the store to buy items for the petting zoo
- **XP** — earned by completing tasks; determines user level, which gates store items
- **XP can be purchased with coins** — 100 coins → 40 XP (meaningful cost, not a shortcut)

---

### 3.2 Task Complexity Tiers

Users select the complexity of each task when creating it. This is a self-reported, trusted field (the anti-spam guardrail provides the only check against abuse).

| Tier | Label | Typical scope | Coins (base) | XP (base) |
|------|-------|--------------|-------------|-----------|
| 1 | Trivial | < 15 min (reply to email, make a call) | 5 | 8 |
| 2 | Small | 15–30 min (write a paragraph, short meeting) | 15 | 20 |
| 3 | Medium | 1–2 hrs (complete assignment section, presentation prep) | 35 | 45 |
| 4 | Large | 3–6 hrs (major project milestone, full report section) | 75 | 100 |
| 5 | Epic | Full day+ (thesis chapter, major deliverable) | 150 | 200 |

---

### 3.3 Efficiency Modifiers

| Condition | Effect |
|-----------|--------|
| Completed before due date | +25% coins (XP is unaffected — effort is effort regardless of speed) |
| Completed on due date | Base coins + XP |
| 1 day late | −10 coins; XP unaffected; minimum 0 coins |
| Each additional day late | −10 coins/day further; floor is 0 coins |

---

### 3.4 Streak Bonuses

A *streak day* = at least 1 task completed that day. Bonus applies to coins earned that day only; XP is unaffected.

| Consecutive days active | Coin bonus |
|------------------------|-----------|
| 3 days | +10% |
| 7 days | +20% |
| 14 days | +35% |

---

### 3.5 Subtask Reward Distribution

- Each subtask earns a proportional share of the parent task's reward on individual completion.
- Example: Medium task (35 coins, 45 XP) with 3 subtasks → each subtask earns ~12 coins, ~15 XP on completion.
- Parent task earns **no additional reward** when all subtasks are done; all value has already been distributed.

---

### 3.6 XP Level Thresholds

Designed with a **hockey-stick curve**: Levels 1–5 arrive within a single first session (3–6 tasks) for immediate dopamine-hit engagement. The curve then steepens to sustain motivation across the full 2-week study.

| Level | Cumulative XP | Typical timing (avg user: ~5 tasks/day, ~30 XP/task) |
|-------|--------------|------------------------------------------------------|
| 1 | 0 | Start |
| 2 | 8 | First trivial task → instant level-up |
| 3 | 20 | 2–3 trivial tasks or 1 small task |
| 4 | 35 | ~3–4 tasks into the first session |
| 5 | 55 | ~4–6 tasks — end of first session |
| 6 | 200 | Day 1–2 |
| 7 | 500 | Day 3–4 |
| 8 | 900 | Day 6 |
| 9 | 1,400 | Day 9–10 |
| 10 | 2,000 | Day 13–14 (aspirational end-goal) |

**First-session simulation**: 3 tasks (1 trivial + 2 small = 8 + 20 + 20 = 48 XP) → user hits Levels 2, 3 and 4 in a single sitting. A fourth small task (68 XP) reaches Level 5.

> Corrected during ECO-05: this example previously claimed 48 XP reached Level 5. It does not — Level 5 needs 55 XP, so 48 lands on Level 4. The threshold table above is unchanged and remains authoritative; only the worked example was wrong. Four tasks, not three, get a participant to Level 5 in their first sitting.

**Study-range summary**: Low performers (~2 tasks/day) reach Level 7–8. Average performers (~5 tasks/day) reach Level 10 by study end. High performers (~8 tasks/day, larger tasks) reach Level 10 by day 9–10.

---

### 3.7 Store Item Level Gates & Coin Prices

| Level required | Item category | Coin price range |
|---------------|---------------|-----------------|
| Level 1 | Basic food (grains, fruits), simple accessories (collars, bows) | 30–80 coins |
| Level 3 | Standard treats, medium accessories (hats, toys) | 100–200 coins |
| Level 5 | Themed accessories, habitat decorations | 200–350 coins |
| Level 7 | Rare accessories, second animal type, special items | 400–700 coins |
| Level 10 | Legendary items, third animal type, prestige decorations | 900–1,500 coins |

Average user earns ~1,500 coins over 14 days. Level 1–5 items (30–350 coins) are purchasable multiple times in the first few days, rewarding early engagement. Level 7+ items (400–700 coins) require consistent task completion across several days, making false urgency manipulation feel genuinely costly.

---

## 4. False Urgency Dark Patterns (Group B Only)

> All urgency data is **fabricated** — there is no real stock, real social activity, or real deadline. These are experimental stimuli for the research study. They must be gated behind the Group B flag and must never appear for Group A users.

### 4.1 Recommended Implementation Set

The following 7 patterns are prioritized for implementation, based on academic prominence and implementation feasibility:

| Priority | Pattern | UI Copy / Mechanic |
|----------|---------|-------------------|
| 1 | **Countdown timer (flash sale)** | Visible MM:SS countdown, e.g. "Sale ends in 14:32" |
| 2 | **Stock depletion** | "Only 3 left!", "5 remaining", "Running low" |
| 3 | **Cart activity** | "5 people have this in their cart" |
| 4 | **Recent purchases** | "8 sold in the last hour", "Someone just purchased this" |
| 5 | **Urgency language** | "Last chance!", "Don't miss out!", "Hurry before it's gone" |
| 6 | **Bundle timer** | "Buy 2 get 1 free — offer ends in 04:59" |
| 7 | **Currency-based urgency** | "Double XP for purchases this hour only", "Bonus coins if bought before midnight" |

---

### 4.2 Full Pattern Taxonomy (Reference)

#### Scarcity Indicators
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Stock depletion | "Only X left!", "5 remaining", "Running low" | Scarcity principle; perceived value increases as availability decreases |
| Limited edition | "Limited edition", "Exclusive design", "Collector's item", "Last batch" | Status signaling; uniqueness motivation; loss aversion |
| Restock uncertainty | "Won't be restocked", "Gone after today", "Final stock" | Loss aversion; permanence bias; fear of irreversible loss |

#### Social Proof / FOMO
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Active viewing | "X people viewing this right now", "Popular now" | Social proof; conformity; descriptive norms |
| Cart activity | "5 people have this in their cart", "10 others want this" | Social proof; competitive scarcity; FOMO amplification |
| Recent purchases | "X sold in the last hour", "Someone just purchased this" | Social proof; herding behavior; bandwagon effect |
| Popularity ranking | "#1 Best Seller", "Trending now", "Everyone is getting this" | Social proof; authority heuristic; conformity |

#### Countdown Timers
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Flash sale timer | Visible MM:SS countdown, "Sale ends in 2:45" | Time pressure; impulsive decision-making; temporal urgency |
| Limited-time offer | "24-hour deal", "This price only until midnight" | Temporal scarcity; deadline effects; loss aversion |
| Coupon expiration | "Code SAVE15 expires in 10:00" | Loss aversion; urgency induction; regret avoidance |
| Bundle deal timer | "Buy 2 get 1 free only in next 5 mins" | Loss aversion + anchoring combo |

#### Artificial Urgency Language
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Direct urgency | "Don't miss out!", "Last chance!", "Hurry before it's gone", "Act now" | Linguistic priming; emotional manipulation |
| Fear-based | "You might miss this", "You'll regret waiting" | Loss aversion; regret projection; negativity bias |
| Consequence framing | "Prices going up tomorrow", "Next batch in 3 months" | Loss framing; temporal pressure |

#### Bundle & Deal Urgency
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Bundle expiration | "Buy 2 get 1 free — today only" | Loss aversion; perceived deal value |
| Tiered discount countdown | "Discount decreases 5% each hour" | Temporal + quantity scarcity combined |
| Currency-based urgency | "Double XP for purchases this hour only", "Bonus coins if bought before midnight" | Effort justification; loss aversion toward earned currency |

#### Progress / Notification Patterns
| Pattern | UI Mechanic | Psychological Mechanism |
|---------|-------------|------------------------|
| Depletion progress bar | "50% of limited stock claimed" visual fill bar | Quantified scarcity; visual urgency |
| Personalized urgency | "Special offer for you expires in 1 hour", "Reserved for you until 3 PM" | Personal relevance; special treatment illusion |
| Streak / achievement urgency | "Last chance to earn this badge", "Don't break your streak" | Goal-gradient effect; identity-based motivation |

---

## 5. Infrastructure & Scalability

**Deployment stack**: Vercel (frontend) + EC2 t3.micro via Docker (backend) + RDS PostgreSQL (database)

**Study data volume estimate** (20 users × 2 weeks):
- Telemetry events: ~14,000 rows (~500 KB)
- Tasks and completions: ~1,400 rows (~100 KB)
- Store transactions: ~200 rows (~20 KB)
- Total database size: < 2 MB

**During study (2-week window)**: $0/month — all components fit within AWS Free Tier (750 hrs/month RDS, 750 hrs/month EC2, 100 GB/month data transfer).

**If free tier expires or is unavailable**:

| Option | Monthly cost | Notes |
|--------|-------------|-------|
| Migrate DB to Neon PostgreSQL + keep EC2 | ~$15/month | Neon is Prisma-compatible; only `.env` connection string changes |
| Self-host PostgreSQL on existing EC2 | ~$7.59/month | No RDS cost; manual backups; acceptable for research context |

Neon PostgreSQL scales to zero when idle, which suits the variable load of a research study with long inter-session gaps.
