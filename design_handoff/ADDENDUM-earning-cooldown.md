# TaskTails — Handoff Addendum: Earning Cooldown (replaces the daily cap)

**Status: IMPLEMENTED.** GitHub issue
[#224](https://github.com/SaskiaSteyn/tasktails/issues/224) ("TASK: remove
hard cap"). Design decisions resolved 2026-08-31 (Johan; §8). Saskia sign-off
(relayed by Johan): retiring `NFR-TASK-2` approved, XP curve left as-is for
now (§7.2). UI mock: `ADDENDUM-earning-cooldown-mock.html`.

`Requirements.md` §NFR-TASK-2 has been rewritten to describe the cooldown;
§3.6's "day two" Rare-gate note carries a `#224 superseded` addendum.
**`claude-memory/economy_system.md` still needs the researchers' own edit** —
its "Daily cap: 300 coins and 500 XP max per day" line is now stale
(`CLAUDE.behavior.md` keeps `claude-memory/` out of ticket scope).
`ADDENDUM-xp-curve.md` is untouched.

### What shipped

- **Schema** (`20260904120000_earning_cooldown_224`): `UserEconomy` drops
  `dailyCoinsEarned` / `dailyXpEarned` / `dailyCapResetAt`, adds
  `earningWindowTiers Int[]` and `earningCooldownUntil DateTime?`.
- **`rewards.ts`**: `applyDailyCap` / `DAILY_*_CAP` / the cap stage removed;
  `EARNING_WINDOW_TASKS` (3), `COOLDOWN_MIN/MAX_MINUTES` (20/60) and
  `cooldownMinutesFor(tiers)` added.
- **`economy.ts`**: `grantEarnings(userId, reward, ctx, now)` — `ctx` is
  `{ taskId, tier, advancesWindow }` — gates banking on the cooldown, advances
  the window on whole-task completions, starts the cooldown on the 3rd, and
  logs the three telemetry events on its own `tx`. `DailyAllowance` &c.
  removed; `earningStatusOf()` + `EconomySnapshot.earning` added for the
  header.
- **Both complete routes** pass `ctx` (`advancesWindow: true` for tasks,
  `false` for subtasks) and return `{ granted, onCooldown, cooldownStarted,
  cooldownUntil, windowRemaining }`.
- **UI**: `CooldownCountdown` (shared live `M:SS`), `EarningPill` in the
  header (amber `EARNING · n/3` when open, violet `PAUSED · M:SS` on
  cooldown), and the violet cooldown banner in `TaskList` (ONB-02 banner
  shape).
- **`telemetry.ts`**: `EARNING_COOLDOWN_STARTED` / `EARNING_RESUMED` /
  `TASK_COMPLETED_ON_COOLDOWN` added to `TelemetryEventType`.
- **Tests**: `rewards.test.ts` (cooldown-formula suite) and `economy.test.ts`
  (`grantEarnings` / `earningStatusOf` cooldown suites) rewritten. Full
  suite green (203).
- **Not built**: the admin-dashboard visualisation of the cooldown telemetry
  (§6 says post-pilot — the events are logged now).

---

## 1. Why

The issue and both researchers describe "a hard cap where you only get money
for completing 3 tasks". **There is no task-count cap in the code.** What
exists is `NFR-TASK-2`: a per-calendar-day ceiling of **300 coins / 500 XP**
(`DAILY_COIN_CAP` / `DAILY_XP_CAP` in `src/lib/rewards.ts`, applied by
`applyDailyCap()` and banked by `grantEarnings()` in `src/lib/economy.ts`,
with a lazy midnight reset via the `dailyCoinsEarned` / `dailyXpEarned` /
`dailyCapResetAt` columns on `UserEconomy`).

The "3 tasks" feeling comes from the tier table: 2 Epic tasks = exactly 300
coins, ~2.5 Epic tasks = the 500 XP cap. A participant doing a few large
tasks hits the ceiling in one sitting and then earns nothing for the rest of
the day, with no indication of when it lifts. That reads as strict and
opaque.

**Decision (Johan, 2026-08-31):** replace the hard daily ceiling with a
**cooldown** — earn from a short run of tasks, then wait 20–60 minutes
before task completions earn again. Pacing moves from "one wall per day" to
"a short, transparent, repeatable pause".

---

## 2. The mechanic

### 2.1 Earning window

A rolling **earning window** of `EARNING_WINDOW_TASKS = 3` *rewarded* task
completions. Each completion that banks a reward advances the window by one
and records that task's `complexityTier`.

- **Whole tasks only** (O2). A subtask completion pays its `1/n` share but
  does **not** advance the window; the parent task's own completion (which
  may be SUB-4's auto-complete once the last subtask is done) is the slot.
- **A reduced completion still counts** (O1). If anti-spam has floored a
  repeat to 1 coin / 1 XP, that completion still fills a window slot — it
  was still a rewarded completion, and letting farmed repeats sit outside
  the window would hand grinders a way around the cooldown.

### 2.2 Cooldown trigger

When the 3rd rewarded completion lands, a cooldown starts. Its length is a
function of the **average complexity tier** of the 3 tasks in the window
(Johan's steer: "a 20 min – 1 hour spread depending on which type of tasks
were used in those 3 tasks"):

```
avgTier  = tierSum / EARNING_WINDOW_TASKS        // 1.0 … 5.0
minutes  = round5( 20 + (avgTier - 1) / 4 * 40 ) // linear map to [20, 60]
```

| Window (example) | Σ tier | avg | Cooldown |
|---|---|---|---|
| Trivial · Trivial · Trivial | 3 | 1.0 | **20 min** |
| Trivial · Small · Small | 5 | 1.7 | 25 min |
| Small · Medium · Medium | 8 | 2.7 | 35 min |
| Medium · Medium · Medium | 9 | 3.0 | **40 min** |
| Trivial · Medium · Epic | 9 | 3.0 | 40 min |
| Medium · Large · Large | 11 | 3.7 | 50 min |
| Epic · Epic · Epic | 15 | 5.0 | **60 min** |

Rationale for tier-weighting (O5, confirmed): the point is to **stop
participants grinding large tasks in rapid succession**. A window of three
Epic tasks earns the maximum 60-minute pause; three quick Trivial wins only
cost 20. It keeps the *rhythm* of earning events roughly comparable
regardless of task size — it does **not** flatten coins-earned-per-hour at
the top end (§2.6, §7 item 3), and that trade-off is accepted: pacing the
grind matters more than a perfectly flat rate.

Constants are **confirmed** (O6): `EARNING_WINDOW_TASKS = 3`, spread
`[20, 60]` minutes, `round5` on the result.

### 2.3 During cooldown

A task completed while `earningCooldownUntil` is in the future still:

- **marks complete** (the completion is real; forward-only as today),
- **counts toward the streak** (`recordStreakDay()` is unaffected),
- **is evaluated for achievements** (count/ownership badges still unlock; XP-
  threshold badges won't newly trigger because no XP was granted),

but grants **0 coins and 0 XP** (Johan's decision: withhold *both*
currencies, not just coins). It does **not** consume a window slot — the
window is already full; the cooldown is what's being waited out.

### 2.4 Reset

When `earningCooldownUntil` has passed, the next completion **lazily
resets** the window (`count → 0`, `tierSum → 0`, `earningCooldownUntil →
null`) and then earns normally as window slot 1. Same lazy-reset pattern the
current daily cap uses (`dailyAllowanceOf()`'s comment) — no scheduled job,
nothing to keep alive on a $0 budget (`NFR-GEN-3`).

The window and cooldown are **duration-based, not calendar-based** — they
persist across midnight untouched (O10, confirmed: no midnight reset at
all). `src/lib/day.ts` (local-midnight logic) is no longer involved in
earning once `NFR-TASK-2` is gone. A half-full window at 23:55 is still
half-full at 00:05.

### 2.5 What is NOT affected (O8, confirmed exempt)

- **Buy XP (`ECO-06`, `buyXp()`)** — spends coins, doesn't earn from tasks;
  already documented as exempt from the daily cap. Stays exempt from the
  cooldown, and a purchase made during a cooldown still converts normally.
- **Achievement XP rewards (`grantAchievementReward()`, PRO-18)** — one-off
  milestones, already skip the daily cap. Stay exempt; an achievement that
  unlocks while a cooldown is active still pays its XP.
- **Streak bonus, efficiency bonus, anti-spam reduction** — all still apply
  when computing a reward; they just have nothing to act on during a
  cooldown because the grant is zeroed after them.

### 2.6 Worked earn-rate examples (post-change)

Assume ~2 min to action each task check-off.

| Loop | Banked / cycle | Cycle length | Coins/hr | XP/hr |
|---|---|---|---|---|
| 3× Medium → 40 min | 105c / 135xp | ~46 min | ~137 | ~176 |
| 3× Epic → 60 min | 450c / 600xp | ~66 min | ~409 | ~545 |
| 3× Trivial → 20 min | 15c / 24xp | ~26 min | ~35 | ~55 |

The old flat ceiling was 300 coins / 500 XP **per day**. Under the cooldown,
a participant grinding Epic tasks can sustain ~400 coins/hr — i.e. clear the
old daily figure in under an hour and keep going. The tier-weighted formula
(O5) deliberately doesn't stop this; it stops the *rapid-fire* version of it
(three Epics back-to-back = the full 60-minute pause). Saskia has signed off
on the higher ceiling as a methodology point (§7.3).

---

## 3. Data model

Retire three `UserEconomy` columns, add three:

```prisma
model UserEconomy {
  // ...
  // #224 — replaces dailyCoinsEarned / dailyXpEarned / dailyCapResetAt.
  earningWindowCount   Int       @default(0)  // rewarded completions since reset, 0..EARNING_WINDOW_TASKS
  earningWindowTierSum Int       @default(0)  // Σ complexityTier of those completions — sets cooldown length
  earningCooldownUntil DateTime?             // null/​past = earning open; future = paused
}
```

Storing `tierSum` (not the tier array) is enough — only the mean is needed.

**O9 (confirmed): drop `dailyCoinsEarned` / `dailyXpEarned` /
`dailyCapResetAt` in the same migration.** They only ever held a transient
same-day running total — no historical value to preserve
(`lifetimeCoinsEarned`, which does accumulate, is untouched). One migration
adds the three new columns and drops the three old ones.

---

## 4. Code touch-points (sketch — for when implementation is approved)

- **`prisma/schema.prisma`** + migration — the column swap above.
- **`src/lib/rewards.ts`** — delete `applyDailyCap()`, `DAILY_COIN_CAP`,
  `DAILY_XP_CAP`, `DAILY_CAPS`, `RewardInput.earnedToday`, and the cap stage
  of `calculateReward()`. Add `EARNING_WINDOW_TASKS`, `COOLDOWN_MIN_MINUTES`
  (20), `COOLDOWN_MAX_MINUTES` (60), and a pure `cooldownMinutesFor(tierSum,
  count)` helper.
- **`src/lib/economy.ts`** — rewrite `grantEarnings()`:
  - signature gains the completing task's `tier` (needed to advance the
    window),
  - the `SELECT … FOR UPDATE` also locks the three new columns (same
    concurrency reasoning as today — two completions racing must not both
    slip past a full window),
  - branch: cooldown active → return a zeroed grant with
    `cooldown: { until, remainingMs }`, write nothing; else lazy-reset if
    expired, bank the **uncapped** reward, `count += 1`, `tierSum += tier`,
    and if `count === EARNING_WINDOW_TASKS` set `earningCooldownUntil`.
  - `EarningsGrant` gains `cooldown: { until: Date; remainingMs: number } |
    null` and `windowRemaining: number`. Retire `DailyAllowance` /
    `dailyAllowanceOf()` / `dailyAllowanceFor()` / `DAILY_CAPS`.
- **`src/app/api/tasks/[id]/complete/route.ts`** — pass `task.complexityTier`
  to `grantEarnings()`; include `reward.cooldown` and `reward.windowRemaining`
  in the response. Order of operations is otherwise unchanged (mark complete
  → streak → anti-spam → price → grant → achievements).
- **`src/components/tasks/task-list.tsx`** — the violet cooldown banner (§5.1),
  reusing the ONB-02 banner's markup. `task-row.tsx` only needs the `+0 · +0`
  figure state — its existing swap already handles it if the response says the
  grant was zero.
- **New shared cooldown-countdown hook + two mount points** — the header pill
  (§5.2) and the task-list banner (§5.1).
- **`src/lib/telemetry.ts`** — new event types (§6).
- **Tests** — `src/lib/rewards.test.ts` and `src/lib/economy.test.ts`: the
  `applyDailyCap` / `grantEarnings` cap suites become cooldown suites
  (window fills at 3, tier-sum → minutes table, cooldown withholds both
  currencies, lazy reset after expiry, streak still records during cooldown,
  `FOR UPDATE` race).
- **Docs** — `Requirements.md` §NFR-TASK-2 + §3.3–3.4 and `claude-memory/
  economy_system.md` are rewritten to describe the cooldown. `ADDENDUM-xp-
  curve.md` and `LEVEL_THRESHOLDS` are **not touched** (O4). Per
  `CLAUDE.behavior.md`, `claude-memory/` is edited by the researchers, not
  as part of the ticket.

---

## 5. UI / UX

No design mock existed for the "Customize Mochi"-era frames that predate
this; the companion `ADDENDUM-earning-cooldown-mock.html` is the mock. Build
against existing `@theme` tokens and the visual language already in the app.

### 5.1 On the task screen — there is no floating pop

The existing "reward pop" is **already** just an in-row swap: on completion,
`TaskRow`'s right-hand coin figure changes from the tier preview to the real
granted amount (`+35 · +45 XP`, `--color-sage-text`) and the checkbox scales
to 125% for a beat, then reverts (`task-row.tsx`'s `celebrationReward`).
That is unchanged.

The cooldown adds **one** element: a **violet inline banner at the top of
the task list** (`task-list.tsx`), reusing the exact shape and slide-in of
the green onboarding-goal banner already rendered there (ONB-02 — `rounded-
card`, `border`, tinted fill, `animate-medallion-pop`), swapped to the
violet family.

- **Normal completion (window slot 1 / 2):** nothing new. The row figure
  swaps as today. The "1 of 3 / 2 of 3" progress lives only on the header
  pill (§5.2), not on the row.
- **The 3rd completion (cooldown starts):** the row figure still swaps and
  the 3rd task is **paid in full**; the violet banner slides in —
  *"Nice — that's 3. Earning's on a break."* with a live `MM:SS` on the
  right. The banner appearing *is* the signal.
- **Completing a task during the cooldown:** the banner is already there,
  reading *"Earning paused — coins & XP resume in MM:SS"* (live). The
  completed row's figure swaps to **`+0 · +0 XP`** (`--color-ink-faint`).
  Task still completes; streak + achievements still count.
- The banner clears itself when the countdown reaches `0:00`.

### 5.2 Dashboard status

A small pill near the streak pill / XP bar in the persistent header (or the
dashboard's streak stat card):

- **Earning open:** `EARNING · 2 / 3` — amber family (`--color-amber-*`),
  same pill shape as the streak pill. Not a countdown; just the window
  progress.
- **On cooldown:** `EARNING PAUSED · 17:42` — violet family, **live MM:SS
  countdown** (O3, revised — Saskia asked for a live timer). Client
  component driving a `setInterval`, the same pattern `FlashSaleBanner`
  (URG-01) and `BundleTimerBadge` (URG-06) already use for the store's
  countdowns: `earningCooldownUntil` (an absolute timestamp) comes from the
  server, the client renders `until − now` every second and, on reaching
  `0:00`, swaps to the "earning open" state (a `router.refresh()` on that
  tick reconciles the server view). Renders nothing until mounted, same
  hydration-mismatch guard those two components document.

The header pill (app-wide) and the task-list banner (§5.1, task screen only)
render the same countdown off the same `earningCooldownUntil` — one shared
client hook, two mount points.

No existing "remaining today" UI needs removing — there is none in
`src/components` today (the daily allowance was only ever a server concept).

---

## 6. Telemetry (O7 — revised 2026-08-31 with Johan)

Two plain questions, no percentiles:

1. **Which 3-task difficulty mixes are producing cooldowns** — a count per
   mix.
2. **Once a cooldown ends, how long until the next task gets done** — the
   **mean** (not median) minutes from `cooldownUntil` to the next
   completion, per mix.

Events:

- **`EARNING_COOLDOWN_STARTED`** — fired on the 3rd rewarded completion.
  `{ windowTiers: [t1, t2, t3], mixKey, tierSum, cooldownMinutes,
  cooldownUntil }`. `windowTiers` keeps completion order;
  `mixKey` is the sorted multiset (e.g. `"1-3-3"`) — the difficulty
  *combination*, order-independent, which is what the admin table groups on.
- **`EARNING_RESUMED`** — fired on the **first completed task after
  `cooldownUntil` has passed**. `{ mixKey, windowTiers, cooldownMinutes,
  cooldownEndedAt, waitAfterCooldownMs, nextTaskTier }`, where
  `waitAfterCooldownMs = completedAt − cooldownUntil`. (0 if they ticked a
  task off the moment it lifted; large if they walked away.)
- **`TASK_COMPLETED_ON_COOLDOWN`** — a completion made *during* a cooldown
  (task counted for streak/achievements, earned nothing).
  `{ taskId, tier, cooldownRemainingMs }`. Separates "worked through the
  pause" from "stopped until it lifted".

**Admin panel** (see `ADDENDUM-earning-cooldown-mock.html` §3): four KPI
tiles (cooldowns triggered · avg cooldown length · **avg wait to next
task** · % tasks completed mid-cooldown), then one table — **cooldowns by
task-difficulty mix**: `mix · resulting cooldown · count · avg wait to next
task`, sorted by count, long tail collapsed. Plus the Group A/B "kept
completing during the pause?" split bar. Group-level breakdowns beyond that
bar are post-pilot.

---

## 7. Research / methodology impact — needs Saskia's sign-off

Removing `NFR-TASK-2` is a change to a study control, not just a UX tweak.

1. **`NFR-TASK-2` is retired.** `Requirements.md` line 109 and §3.3–3.4, and
   `claude-memory/economy_system.md` ("Daily cap: 300 coins and 500 XP max
   per day") must be rewritten to describe the cooldown.

2. **`ADDENDUM-xp-curve.md`'s daily-cap anchor.** That doc relies on
   "Level 5 (425 XP) is under the 500 XP daily cap and Level 6 (540) is over
   it, so a participant who maxes the cap on day one lands on Level 5 and
   cannot reach Rare-tier content until day two." With no daily XP ceiling,
   a determined participant *can* cross into Rare tier on day one.
   **Decision (Saskia, relayed by Johan): leave the curve unchanged for
   now.** Day-one Rare access is accepted; the tier-weighted cooldown still
   paces XP, just not to a hard daily line. Revisit only if pilot telemetry
   (§6) shows participants reaching Rare/Epic tiers materially faster than
   the exposure schedule assumes. `ADDENDUM-xp-curve.md` and
   `LEVEL_THRESHOLDS` are untouched — no v6 addendum.

3. **Peak earn rate goes up** for participants doing large tasks (§2.6).
   This is a known, accepted consequence of the tier-weighted formula (O5):
   the design goal is to stop *rapid-fire* grinding of Epic tasks, not to
   hold total daily throughput at the old 300/500. A dedicated participant
   can now out-earn the old daily figure — Saskia should confirm that is
   acceptable for the fairness / continued-usage measurement, but it is not
   a bug. The reward-weighted alternative (§7 tail) was considered and set
   aside.

4. **Fairness / continued-usage measurement.** The DVs include perceived
   fairness and continued-usage intention. A cooldown that also freezes
   *level progress* (XP withheld) may read as more punitive than a soft coin
   cap, even with a visible timer. Worth a line in the pilot debrief.

5. **A/B integrity.** The cooldown applies identically to Group A and Group
   B (it is not an urgency stimulus), so it does not confound the store
   comparison — but it is a global economy change and must be **locked
   before the study window opens (2026-09-20)**, not adjusted mid-collection.

### Alternative formula — considered and set aside (O5)

A reward-weighted variant would flatten coins/hour instead of pacing grind
frequency:

```
minutes = clamp(20, 60, round5( coinsBankedInWindow / TARGET_COINS_PER_MIN ))
```

e.g. `TARGET_COINS_PER_MIN = 2.5` (~150 coins/hr): a 105-coin Medium window
→ 42 min; a 450-coin Epic window → clamped 60 min. **Not chosen** — Johan's
goal is to discourage rapid-fire large-task grinding, for which the
tier-weighted formula in §2.2 is the more direct lever. Kept here only as a
record of the road not taken.

---

## 8. Resolved decisions (Johan, 2026-08-31)

| # | Question | Decision |
|---|---|---|
| O1 | Does an anti-spam-reduced completion (floored to 1c/1xp) fill a window slot? | **Yes** — still a rewarded completion; keeping farmed repeats out of the window would be a cooldown bypass. (§2.1) |
| O2 | Do subtask completions take a window slot? | **No.** Only whole-task completions advance the window; a subtask pays its `1/n` share but doesn't count. The parent's own completion (incl. SUB-4 auto-complete) is the slot. (§2.1) |
| O3 | Live-ticking countdown or static value? | **Live MM:SS countdown** (revised — Saskia asked for a live timer). Client `setInterval` off the server's `earningCooldownUntil`, same pattern as the store's `FlashSaleBanner` / `BundleTimerBadge`. (§5.2) |
| O4 | How to handle `ADDENDUM-xp-curve.md`'s daily-cap anchor? | **Leave the curve unchanged for now** (Saskia, relayed by Johan). Day-one Rare access is accepted; revisit only if pilot telemetry shows tier exposure running ahead of schedule. No v6 addendum. (§7.2) |
| O5 | Tier-weighted or reward-weighted cooldown? | **Tier-weighted** (§2.2). Goal is to stop rapid-fire grinding of large tasks, not to flatten coins/hour. Higher peak earn rate for big-task users is an accepted consequence. |
| O6 | Constants. | **Confirmed:** `EARNING_WINDOW_TASKS = 3`, spread `[20, 60]` min, `round5`, linear in average tier. |
| O7 | Telemetry scope. | Log the **window → cooldown → resume** cycle now, incl. `waitAfterCooldownMs` on the first post-cooldown completion, tagged with the previous window's ordered tiers (§6). Admin-dashboard visualisation is post-pilot. |
| O8 | `buyXp` / achievement XP. | **Stay fully exempt** — unchanged by this addendum. (§2.5) |
| O9 | Old `daily*` columns. | **Drop all three in the same migration** as the new columns — no historical value to keep. (§3) |
| O10 | Persist across calendar days? | **Yes — no midnight reset.** The window/cooldown are purely duration-based. (§2.4) |

### Sign-off

- **Saskia** — approved retiring `NFR-TASK-2`, the higher peak earn rate
  (§7.3), and leaving the XP curve unchanged (§7.2). Relayed by Johan.
- **Johan** — all §8 decisions, plus the UI mock
  (`ADDENDUM-earning-cooldown-mock.html`) as the final artefact before
  implementation.

Nothing else gates the build.

---

## 9. Not in scope for this addendum

- The actual implementation (this is a plan).
- `Features.md` / `Features.csv` ticket-status edits (per Johan's standing
  note for the current branch).
- Any change to the tier reward table, efficiency/streak/anti-spam
  modifiers, or the store — only `NFR-TASK-2` is being replaced.
