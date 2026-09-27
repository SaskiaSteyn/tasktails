import type { StudyEvent } from "@/lib/telemetry";

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

