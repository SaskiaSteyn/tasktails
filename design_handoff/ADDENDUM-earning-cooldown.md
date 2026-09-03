# TaskTails — Handoff Addendum: Earning Cooldown (replaces the daily cap)

**Status: PLANNING — not implemented. Design decisions resolved 2026-08-31
(Johan); §8 records them.** Drafted for GitHub issue
[#224](https://github.com/SaskiaSteyn/tasktails/issues/224) ("TASK: remove
hard cap"). This is a systems/economy spec, not a visual design reference —
it defines a mechanic to replace `NFR-TASK-2`. Nothing here is built yet.
Two things still gate implementation, both on Saskia:

1. Methodology sign-off on retiring `NFR-TASK-2` (see §7).
2. A **separate** XP-curve re-derivation addendum
   (`ADDENDUM-xp-curve-v6-cooldown.md`, not yet written) — the current
   `ADDENDUM-xp-curve.md` is deliberately left untouched so it stays a
   working revert point if the cooldown is abandoned (§8 O4).

Supplements `claude-memory/economy_system.md`, `Requirements.md` §3.3–3.4 /
§NFR-TASK-2, and `design_handoff/ADDENDUM-xp-curve.md` — all three describe
the current daily cap and will need edits if this ships (see "Research /
methodology impact").

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
(three Epics back-to-back = the full 60-minute pause). Saskia signs off on
the higher ceiling as a methodology point (§7.3), not the formula.

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
- **`src/components/tasks/task-list.tsx` / `task-row.tsx`** — completion pop
  copy (§5).
- **New dashboard status element** — §5.
- **`src/lib/telemetry.ts`** — new event types (§6).
- **Tests** — `src/lib/rewards.test.ts` and `src/lib/economy.test.ts`: the
  `applyDailyCap` / `grantEarnings` cap suites become cooldown suites
  (window fills at 3, tier-sum → minutes table, cooldown withholds both
  currencies, lazy reset after expiry, streak still records during cooldown,
  `FOR UPDATE` race).
- **Docs** — `Requirements.md` §NFR-TASK-2 + §3.3–3.4 and `claude-memory/
  economy_system.md` are rewritten to describe the cooldown. A **new**
  `design_handoff/ADDENDUM-xp-curve-v6-cooldown.md` carries the re-derived
  curve; `ADDENDUM-xp-curve.md` itself is **not touched** (O4 — it stays the
  revert point). Per `CLAUDE.behavior.md`, `claude-memory/` is edited by the
  researchers, not as part of the ticket.

---

## 5. UI / UX

No design mock exists for this — the "Customize Mochi"-era frames predate
it. Build against existing `@theme` tokens and the completion-pop /
streak-pill visual language already in the app.

### 5.1 Completion pop (the reward toast `TaskRow` shows)

- **Normal slot (1st / 2nd of the window):** unchanged — the actual granted
  coins/XP, plus a subtle "`2 of 3 before a break`" line under it (`text-
  overline`, `--color-ink-faint`).
- **Slot that triggers the cooldown (3rd):** the granted amount as normal,
  then a line: **"That's 3 — coin & XP earning pauses for ~40 min."**
  (`--color-violet-text` on `--color-violet-tint`, matching the XP family).
- **Completion during cooldown:** no reward number; instead
  **"Task done · earning resumes in ~22 min"** and, if it's the first
  completion today, the streak flame still animates. Wording must make clear
  the task *counted* (it did — streak + achievements) but paid nothing. The
  value is static (O3), hence `~`.

### 5.2 Dashboard status

A small pill near the streak pill / XP bar in the persistent header (or the
dashboard's streak stat card):

- **Earning open:** `EARNING · 2 / 3` — amber family (`--color-amber-*`),
  same pill shape as the streak pill.
- **On cooldown:** `EARNING PAUSED · ~18 min` — violet family. **Static, not
  a live ticker** (O3, confirmed): render the remaining minutes at page load
  and let the next `router.refresh()` (which every completion already fires)
  update it. Cheapest option and consistent with how the rest of the economy
  UI refreshes. The `~` keeps a slightly stale value honest.

No existing "remaining today" UI needs removing — there is none in
`src/components` today (the daily allowance was only ever a server concept).

---

## 6. Telemetry (O7)

The behavioural question the study wants answered: **once the cooldown ends,
how long does a participant wait before earning again — and does that depend
on how hard the previous window was?** So the logging is built around the
window → cooldown → resume cycle:

- **`EARNING_COOLDOWN_STARTED`** — fired on the 3rd rewarded completion.
  `{ windowTiers: [t1, t2, t3], tierSum, avgTier, cooldownMinutes,
  cooldownUntil }`. `windowTiers` is the ordered list so analysis can tell
  "three Epics" from "Trivial, Trivial, Epic" even at the same `tierSum`.
- **`EARNING_RESUMED`** — fired on the **next rewarded completion after
  `cooldownUntil` has passed** (i.e. the "4th task"). Carries the previous
  window's descriptors plus the wait:
  `{ windowTiers, tierSum, cooldownMinutes, cooldownEndedAt,
  waitAfterCooldownMs, nextTaskTier }`.
  `waitAfterCooldownMs = resumedAt − cooldownUntil` — the metric of
  interest (0 if they were completing tasks the moment it lifted; large if
  they walked away and came back much later).
- **`TASK_COMPLETED_ON_COOLDOWN`** — a completion made *during* a cooldown
  (task counted for streak/achievements, earned nothing).
  `{ taskId, tier, cooldownRemainingMs }`. Distinguishes "kept working
  through the pause" from "stopped completing tasks entirely until it
  lifted".

Together these give, per participant: window composition → cooldown length
→ whether they worked through it → gap before resuming. Admin-dashboard
surfacing (median `waitAfterCooldownMs` by `avgTier`, share of completions
made on cooldown) is a **post-pilot** ADM task, not v1 — log now, visualise
later.

---

## 7. Research / methodology impact — needs Saskia's sign-off

Removing `NFR-TASK-2` is a change to a study control, not just a UX tweak.

1. **`NFR-TASK-2` is retired.** `Requirements.md` line 109 and §3.3–3.4, and
   `claude-memory/economy_system.md` ("Daily cap: 300 coins and 500 XP max
   per day") must be rewritten to describe the cooldown.

2. **`ADDENDUM-xp-curve.md`'s daily-cap anchor breaks.** That doc relies on
   "Level 5 (425 XP) is under the 500 XP daily cap and Level 6 (540) is over
   it, so a participant who maxes the cap on day one lands on Level 5 and
   cannot reach Rare-tier content until day two." With no daily XP ceiling,
   a determined participant can cross into Rare tier on day one. The
   Common→Rare exposure timing the study assumes needs re-deriving against
   the cooldown's actual throughput, or a different gate.
   **Plan (O4):** the re-derived curve goes in a **new, separate addendum**
   (`ADDENDUM-xp-curve-v6-cooldown.md`). `ADDENDUM-xp-curve.md` and the
   current `LEVEL_THRESHOLDS` are left exactly as they are, so if the
   cooldown is abandoned the curve reverts by simply not applying the new
   addendum — no diff to undo. That addendum is a prerequisite for
   implementing this one and is not yet written.

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
| O3 | Live-ticking countdown or static value? | **Static**, re-rendered by the `router.refresh()` every completion already fires. Displayed with a `~`. (§5.2) |
| O4 | How to handle `ADDENDUM-xp-curve.md`'s broken daily-cap anchor? | **Re-derive the curve in a new, separate `ADDENDUM-xp-curve-v6-cooldown.md`.** Leave `ADDENDUM-xp-curve.md` and the current thresholds untouched so the curve reverts cleanly if the cooldown is dropped. That addendum is a **prerequisite** and is not yet written. (§7.2) |
| O5 | Tier-weighted or reward-weighted cooldown? | **Tier-weighted** (§2.2). Goal is to stop rapid-fire grinding of large tasks, not to flatten coins/hour. Higher peak earn rate for big-task users is an accepted consequence. |
| O6 | Constants. | **Confirmed:** `EARNING_WINDOW_TASKS = 3`, spread `[20, 60]` min, `round5`, linear in average tier. |
| O7 | Telemetry scope. | Log the **window → cooldown → resume** cycle now, incl. `waitAfterCooldownMs` on the first post-cooldown completion, tagged with the previous window's ordered tiers (§6). Admin-dashboard visualisation is post-pilot. |
| O8 | `buyXp` / achievement XP. | **Stay fully exempt** — unchanged by this addendum. (§2.5) |
| O9 | Old `daily*` columns. | **Drop all three in the same migration** as the new columns — no historical value to keep. (§3) |
| O10 | Persist across calendar days? | **Yes — no midnight reset.** The window/cooldown are purely duration-based. (§2.4) |

### Still gating implementation (not Johan's to decide)

- **Saskia:** methodology sign-off on retiring `NFR-TASK-2` (§7), and on the
  higher peak earn rate (§7.3).
- **`ADDENDUM-xp-curve-v6-cooldown.md`** must be written and agreed first
  (O4).

---

## 9. Not in scope for this addendum

- The actual implementation (this is a plan).
- `Features.md` / `Features.csv` ticket-status edits (per Johan's standing
  note for the current branch).
- Any change to the tier reward table, efficiency/streak/anti-spam
  modifiers, or the store — only `NFR-TASK-2` is being replaced.
