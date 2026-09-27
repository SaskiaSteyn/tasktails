import type { StudyEvent } from "@/lib/telemetry";
import { flashSaleOnDay } from "@/lib/urgency";

/**
 * #329 — the admin dashboard's analysis: everything the charts draw, computed
 * from plain data so it can be tested without a database. `admin.ts`'s
 * `studyDataset()` does the reading; nothing here touches Prisma.
 *
 * Small-sample choices, since the study runs with tens of participants:
 * medians rather than means (one heavy spender moves a mean on their own), and
 * Mann-Whitney U rather than a t-test (no normality assumption).
 */

export type Group = "A" | "B";

export type StudyParticipant = {
  id: string;
  /** The pseudonymous code the paper uses — never a name or email. */
  studyId: string;
  group: Group;
  joinedAt: Date;
  coinsEarned: number;
  /** Oldest first. */
  events: Omit<StudyEvent, "userId">[];
  taskCompletions: Date[];
};

type ActivityEvent = StudyParticipant["events"][number];

export type ParticipantMetrics = {
  sessions: number;
  tasksCompleted: number;
  coinsEarned: number;
  coinsSpent: number;
  itemsPurchased: number;
  luckyBoxes: number;
  storeVisits: number;
  addToCart: number;
  storeTimeMs: number;
};

export function metricsFor(participant: StudyParticipant): ParticipantMetrics {
  const metrics: ParticipantMetrics = {
    sessions: 0,
    tasksCompleted: participant.taskCompletions.length,
    coinsEarned: participant.coinsEarned,
    coinsSpent: 0,
    itemsPurchased: 0,
    luckyBoxes: 0,
    storeVisits: 0,
    addToCart: 0,
    storeTimeMs: 0,
  };

  for (const event of participant.events) {
    switch (event.type) {
      case "SESSION_START":
        metrics.sessions += 1;
        break;
      case "STORE_VISIT":
        metrics.storeVisits += 1;
        break;
      case "ADD_TO_CART":
        metrics.addToCart += 1;
        break;
      case "STORE_TIME_ON_PAGE":
        metrics.storeTimeMs += event.durationMs;
        break;
      case "LUCKY_BOX_PURCHASED":
        metrics.luckyBoxes += 1;
      // falls through — a box is a purchase too
      case "ITEM_PURCHASED":
        metrics.coinsSpent += event.coins;
        metrics.itemsPurchased += event.items;
        break;
    }
  }

  return metrics;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type MannWhitney = {
  /** U for Group B: pairs where B beat A, ties counting half. */
  u: number;
  /** Two-sided, normal approximation with tie and continuity correction — SPSS's "Asymp. Sig.". */
  p: number;
  /** Rank-biserial correlation, −1…1. Positive means Group B tends higher. */
  r: number;
};

/**
 * Mann-Whitney U, Group A vs Group B. Null when either group is empty.
 *
 * ponytail: normal approximation only. It is the figure SPSS and JASP report
 * by default, but it is rough below ~8 per group; add an exact test if the
 * final sample is that small.
 */
export function mannWhitney(a: number[], b: number[]): MannWhitney | null {
  const na = a.length;
  const nb = b.length;
  if (na === 0 || nb === 0) return null;

  const all = [...a.map((v) => ({ v, b: false })), ...b.map((v) => ({ v, b: true }))].sort(
    (x, y) => x.v - y.v,
  );
  const n = all.length;

  // Average ranks across ties; collect Σ(t³ − t) for the variance correction.
  let rankSumB = 0;
  let tieTerm = 0;
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && all[j + 1].v === all[i].v) j += 1;
    const rank = (i + j + 2) / 2;
    const t = j - i + 1;
    tieTerm += t ** 3 - t;
    for (let k = i; k <= j; k += 1) if (all[k].b) rankSumB += rank;
    i = j + 1;
  }

  const u = rankSumB - (nb * (nb + 1)) / 2;
  const mean = (na * nb) / 2;
  const variance = ((na * nb) / 12) * (n + 1 - tieTerm / (n * (n - 1) || 1));
  const r = (2 * u) / (na * nb) - 1;

  if (variance <= 0) return { u, p: 1, r };
  const z = Math.max(0, Math.abs(u - mean) - 0.5) / Math.sqrt(variance);
  return { u, p: Math.min(1, 2 * (1 - normalCdf(z))), r };
}

/** Abramowitz & Stegun 7.1.26 — accurate to ~1e-7, plenty for a p-value. */
function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export type GroupPoints = { values: { studyId: string; value: number }[]; median: number | null };

export type GroupComparison = {
  key: string;
  label: string;
  unit: "count" | "coins" | "duration" | "percent";
  A: GroupPoints;
  B: GroupPoints;
  test: MannWhitney | null;
};

function compare(
  rows: { participant: StudyParticipant; metrics: ParticipantMetrics }[],
  key: string,
  label: string,
  unit: GroupComparison["unit"],
  pick: (m: ParticipantMetrics) => number | null,
): GroupComparison {
  const pointsFor = (group: Group): GroupPoints => {
    const values = rows
      .filter((row) => row.participant.group === group)
      .map((row) => ({ studyId: row.participant.studyId, value: pick(row.metrics) }))
      .filter((point): point is { studyId: string; value: number } => point.value !== null);
    return { values, median: median(values.map((point) => point.value)) };
  };
  const A = pointsFor("A");
  const B = pointsFor("B");
  return {
    key,
    label,
    unit,
    A,
    B,
    test: mannWhitney(
      A.values.map((point) => point.value),
      B.values.map((point) => point.value),
    ),
  };
}

/** Chart 1 — the study's dependent variables, one dot per participant per group. */
export function groupComparisons(participants: StudyParticipant[]): GroupComparison[] {
  const rows = participants.map((participant) => ({ participant, metrics: metricsFor(participant) }));
  return [
    compare(rows, "coinsSpent", "Coins spent", "coins", (m) => m.coinsSpent),
    compare(rows, "itemsPurchased", "Items purchased", "count", (m) => m.itemsPurchased),
    compare(rows, "storeVisits", "Store visits", "count", (m) => m.storeVisits),
    compare(rows, "storeTimeMs", "Time in store", "duration", (m) => m.storeTimeMs),
  ];
}

export type EarnSpend = {
  points: { studyId: string; group: Group; earned: number; spent: number }[];
  /** Spent ÷ earned per participant — who spends a bigger share of their income. */
  share: GroupComparison;
};

/**
 * Chart 2 — earning differs a lot between participants, so raw spend partly
 * measures how much someone worked. Share of earnings spent controls for it.
 * Participants who have earned nothing have no share and are left out of it.
 */
export function earnSpend(participants: StudyParticipant[]): EarnSpend {
  const rows = participants.map((participant) => ({ participant, metrics: metricsFor(participant) }));
  return {
    points: rows.map(({ participant, metrics }) => ({
      studyId: participant.studyId,
      group: participant.group,
      earned: metrics.coinsEarned,
      spent: metrics.coinsSpent,
    })),
    share: compare(rows, "spendShare", "Share of earnings spent", "percent", (m) =>
      m.coinsEarned > 0 ? m.coinsSpent / m.coinsEarned : null,
    ),
  };
}


export type StoreFunnel = {
  groupSize: Record<Group, number>;
  /** Share of each group (0…1) that reached each stage at least once. */
  stages: { label: string; A: number; B: number }[];
  /** Group totals divided by the group's store visits — null with no visits. */
  perVisit: { label: string; A: number | null; B: number | null }[];
};

/**
 * Chart 3 — where urgency acts: getting people into the store, into a cart,
 * or through checkout. Counted per participant ("did they ever…") so one
 * heavy user can't carry a stage for their whole group. Lucky Boxes skip the
 * cart, so "Bought anything" can exceed "Added to cart".
 */
export function storeFunnel(participants: StudyParticipant[]): StoreFunnel {
  const blank = () => ({ n: 0, visited: 0, carted: 0, bought: 0, visits: 0, carts: 0, items: 0 });
  const totals = { A: blank(), B: blank() };
  for (const participant of participants) {
    const m = metricsFor(participant);
    const t = totals[participant.group];
    t.n += 1;
    t.visited += m.storeVisits > 0 ? 1 : 0;
    t.carted += m.addToCart > 0 ? 1 : 0;
    t.bought += m.itemsPurchased > 0 ? 1 : 0;
    t.visits += m.storeVisits;
    t.carts += m.addToCart;
    t.items += m.itemsPurchased;
  }
  const share = (group: Group, key: "visited" | "carted" | "bought") =>
    totals[group].n ? totals[group][key] / totals[group].n : 0;
  const rate = (group: Group, key: "carts" | "items") =>
    totals[group].visits ? totals[group][key] / totals[group].visits : null;

  return {
    groupSize: { A: totals.A.n, B: totals.B.n },
    stages: [
      { label: "Visited the store", A: share("A", "visited"), B: share("B", "visited") },
      { label: "Added to cart", A: share("A", "carted"), B: share("B", "carted") },
      { label: "Bought anything", A: share("A", "bought"), B: share("B", "bought") },
    ],
    perVisit: [
      { label: "Add-to-carts per visit", A: rate("A", "carts"), B: rate("B", "carts") },
      { label: "Items bought per visit", A: rate("A", "items"), B: rate("B", "items") },
    ],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 1-based day of the study for this participant — day 1 is their first 24 hours. */
export function studyDay(joinedAt: Date, at: Date): number {
  return Math.floor((at.getTime() - joinedAt.getTime()) / DAY_MS) + 1;
}

/** At least the two-week study, longer if anyone has been enrolled longer. */
function studyLength(participants: StudyParticipant[], now: Date): number {
  return Math.max(14, ...participants.map((p) => studyDay(p.joinedAt, now)));
}

export type DailySeries = {
  key: string;
  label: string;
  /** Mean per participant on each study day; null once nobody in the group has reached it. */
  A: (number | null)[];
  B: (number | null)[];
};

export type DailyActivityChart = {
  days: number[];
  /** Participants who have reached each day — the denominator behind each mean. */
  reached: { A: number[]; B: number[] };
  series: DailySeries[];
};

/**
 * Chart 4 — activity by study day, per group. Aligned on each person's own
 * day 1 rather than the calendar, since people joined on different dates.
 * Each day's mean only counts participants who have reached that day, so
 * recent joiners don't drag the later days down to zero.
 */
export function dailyActivity(
  participants: StudyParticipant[],
  now: Date = new Date(),
): DailyActivityChart {
  const length = studyLength(participants, now);
  const days = Array.from({ length }, (_, i) => i + 1);
  const metrics = [
    { key: "storeVisits", label: "Store visits", of: (e: ActivityEvent) => (e.type === "STORE_VISIT" ? 1 : 0) },
    { key: "itemsPurchased", label: "Items purchased", of: (e: ActivityEvent) => e.items },
    { key: "coinsSpent", label: "Coins spent", of: (e: ActivityEvent) => e.coins },
    { key: "sessions", label: "Sessions", of: (e: ActivityEvent) => (e.type === "SESSION_START" ? 1 : 0) },
  ];

  const reached = { A: days.map(() => 0), B: days.map(() => 0) };
  // sums[metric][group][dayIndex]; tasks are the last metric.
  const sums = [...metrics, null].map(() => ({ A: days.map(() => 0), B: days.map(() => 0) }));

  for (const participant of participants) {
    const g = participant.group;
    const elapsed = Math.min(length, studyDay(participant.joinedAt, now));
    for (let d = 0; d < elapsed; d += 1) reached[g][d] += 1;
    for (const event of participant.events) {
      const d = studyDay(participant.joinedAt, event.at) - 1;
      if (d < 0 || d >= length) continue;
      metrics.forEach((metric, i) => (sums[i][g][d] += metric.of(event)));
    }
    for (const completedAt of participant.taskCompletions) {
      const d = studyDay(participant.joinedAt, completedAt) - 1;
      if (d >= 0 && d < length) sums[metrics.length][g][d] += 1;
    }
  }

  const mean = (sum: number[], group: Group) =>
    sum.map((value, d) => (reached[group][d] ? value / reached[group][d] : null));

  return {
    days,
    reached,
    series: [...metrics, { key: "tasksCompleted", label: "Tasks completed" }].map((metric, i) => ({
      key: metric.key,
      label: metric.label,
      A: mean(sums[i].A, "A"),
      B: mean(sums[i].B, "B"),
    })),
  };
}

export type FlashSaleComparison = {
  /** Group B participants with at least one store visit on both kinds of day. */
  participants: { studyId: string; rest: number; sale: number; restVisits: number; saleVisits: number }[];
  median: { rest: number | null; sale: number | null };
  /** Participants who bought more per visit on sale days, fewer, or the same. */
  up: number;
  down: number;
  same: number;
  /** Two-sided exact sign test over `up` vs `down`; null with no changes to test. */
  p: number | null;
};

/**
 * Chart 5 — items bought per store visit on flash-sale days vs normal days,
 * within each Group B participant. Everyone is compared with themselves, so
 * how much someone likes shopping cancels out. The other urgency cues run
 * every day; only the flash-sale layer switches, on `flashSaleOnDay()`'s
 * per-participant schedule, which is reproduced here from the timestamp.
 */
export function flashSaleComparison(participants: StudyParticipant[]): FlashSaleComparison {
  const rows: FlashSaleComparison["participants"] = [];
  for (const participant of participants) {
    if (participant.group !== "B") continue;
    const tally = { rest: { visits: 0, items: 0 }, sale: { visits: 0, items: 0 } };
    for (const event of participant.events) {
      const bucket = tally[flashSaleOnDay(participant.id, event.at) ? "sale" : "rest"];
      if (event.type === "STORE_VISIT") bucket.visits += 1;
      bucket.items += event.items;
    }
    if (tally.rest.visits === 0 || tally.sale.visits === 0) continue;
    rows.push({
      studyId: participant.studyId,
      rest: tally.rest.items / tally.rest.visits,
      sale: tally.sale.items / tally.sale.visits,
      restVisits: tally.rest.visits,
      saleVisits: tally.sale.visits,
    });
  }

  const up = rows.filter((row) => row.sale > row.rest).length;
  const down = rows.filter((row) => row.sale < row.rest).length;
  return {
    participants: rows,
    median: { rest: median(rows.map((row) => row.rest)), sale: median(rows.map((row) => row.sale)) },
    up,
    down,
    same: rows.length - up - down,
    p: signTest(up, down),
  };
}

/** Exact two-sided sign test: how likely a split this lopsided is if sale days made no difference. */
export function signTest(up: number, down: number): number | null {
  const n = up + down;
  if (n === 0) return null;
  let tail = 0;
  let choose = 1; // C(n, k), built up term by term
  for (let k = 0; k <= Math.min(up, down); k += 1) {
    tail += choose;
    choose = (choose * (n - k)) / (k + 1);
  }
  return Math.min(1, (2 * tail) / 2 ** n);
}

export type RetentionChart = {
  days: number[];
  /** Share (0…1) of each group still active on day N or later; null once nobody has reached day N. */
  A: (number | null)[];
  B: (number | null)[];
  reached: { A: number[]; B: number[] };
};

/**
 * Chart 6 — retention: of the participants who have reached study day N, the
 * share who were active on that day or later. "Active" is any logged event or
 * task completion. Someone still inside their study counts as retained up to
 * their last activity, same as everyone else — the `reached` denominator is
 * what keeps recent joiners from counting as drop-outs on days they haven't had.
 */
export function retention(participants: StudyParticipant[], now: Date = new Date()): RetentionChart {
  const length = studyLength(participants, now);
  const days = Array.from({ length }, (_, i) => i + 1);
  const reached = { A: days.map(() => 0), B: days.map(() => 0) };
  const retained = { A: days.map(() => 0), B: days.map(() => 0) };

  for (const participant of participants) {
    const g = participant.group;
    const lastActive = Math.max(
      0,
      ...participant.events.map((event) => studyDay(participant.joinedAt, event.at)),
      ...participant.taskCompletions.map((at) => studyDay(participant.joinedAt, at)),
    );
    const elapsed = Math.min(length, studyDay(participant.joinedAt, now));
    for (let d = 0; d < elapsed; d += 1) {
      reached[g][d] += 1;
      if (lastActive >= d + 1) retained[g][d] += 1;
    }
  }

  const share = (group: Group) =>
    days.map((_, d) => (reached[group][d] ? retained[group][d] / reached[group][d] : null));
  return { days, A: share("A"), B: share("B"), reached };
}
