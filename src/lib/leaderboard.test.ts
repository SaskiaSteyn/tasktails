import { describe, expect, it, vi } from "vitest";

import { allTimeLeaderboard, nameFor, rankParticipants } from "@/lib/leaderboard";
import { prismaMock } from "@/test/prisma-mock";

/**
 * LEAD-03 — the ranking rules, plus the composed read.
 *
 * `allTimeLeaderboard()` goes through `users.ts`'s `listParticipants()` and
 * `economy.ts`'s `lifetimeEarningsFor()` rather than querying Prisma itself
 * (see leaderboard.ts's doc comment), but both bottom out in the same mocked
 * `prismaMock.user.findMany` / `prismaMock.userEconomy.findMany`, so no
 * mocking of sibling modules is needed — the same reasoning sell.test.ts gives.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const row = (userId: string, score: number, name = userId) => ({
  userId,
  name,
  avatarUrl: null,
  score,
});

describe("rankParticipants", () => {
  it("orders by score, best first", () => {
    const ranked = rankParticipants(
      [row("a", 100), row("b", 3540), row("c", 880)],
      null,
    );

    expect(ranked.map((e) => e.userId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("gives tied scores the same rank and skips the next (1, 2, 2, 4)", () => {
    const ranked = rankParticipants(
      [row("a", 500), row("b", 300), row("c", 300), row("d", 100)],
      null,
    );

    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it("ranks everyone 1st when nobody has earned anything yet", () => {
    // The state every deployment starts in — see the tie note in leaderboard.ts.
    const ranked = rankParticipants([row("a", 0), row("b", 0), row("c", 0)], null);

    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 1]);
  });

  it("keeps the incoming order between tied rows, so reads are stable", () => {
    // listParticipants() orders by createdAt, and a stable sort preserves it.
    const ranked = rankParticipants(
      [row("older", 300), row("newer", 300)],
      null,
    );

    expect(ranked.map((e) => e.userId)).toEqual(["older", "newer"]);
  });

  it("flags exactly one row as yours", () => {
    const ranked = rankParticipants([row("a", 10), row("b", 20)], "a");

    expect(ranked.filter((e) => e.isYou).map((e) => e.userId)).toEqual(["a"]);
  });

  it("flags nothing when the viewer isn't a participant", () => {
    const ranked = rankParticipants([row("a", 10)], null);

    expect(ranked.some((e) => e.isYou)).toBe(false);
  });

  it("returns an empty board for no participants", () => {
    expect(rankParticipants([], "a")).toEqual([]);
  });
});

describe("nameFor", () => {
  it("uses the handle when there is one", () => {
    expect(nameFor({ username: "kai" }, 3)).toBe("kai");
  });

  it("never falls back to the email local part", () => {
    // The whole point: this list is where accounts are shown to each other.
    expect(nameFor({ username: null }, 7)).toBe("Participant 7");
  });
});

describe("allTimeLeaderboard", () => {
  const participants = [
    { id: "u1", username: "kai", email: "kai@example.com" },
    { id: "u2", username: "aria", email: "aria@example.com" },
    { id: "u3", username: null, email: "nico@example.com" },
  ];

  it("ranks participants on lifetime coins earned", async () => {
    prismaMock.user.findMany.mockResolvedValue(participants as never);
    prismaMock.userEconomy.findMany.mockResolvedValue([
      { userId: "u1", lifetimeCoinsEarned: 3540 },
      { userId: "u2", lifetimeCoinsEarned: 3120 },
      { userId: "u3", lifetimeCoinsEarned: 1180 },
    ] as never);

    const board = await allTimeLeaderboard("u3");

    expect(board.entries.map((e) => [e.name, e.score, e.rank])).toEqual([
      ["kai", 3540, 1],
      ["aria", 3120, 2],
      ["Participant 3", 1180, 3],
    ]);
    expect(board.you?.userId).toBe("u3");
    expect(board.participantCount).toBe(3);
  });

  it("scores a participant with no economy row as 0 rather than dropping them", async () => {
    prismaMock.user.findMany.mockResolvedValue(participants as never);
    prismaMock.userEconomy.findMany.mockResolvedValue([
      { userId: "u1", lifetimeCoinsEarned: 40 },
    ] as never);

    const board = await allTimeLeaderboard(null);

    expect(board.participantCount).toBe(3);
    expect(board.entries.map((e) => e.score)).toEqual([40, 0, 0]);
    expect(board.entries.map((e) => e.rank)).toEqual([1, 2, 2]);
  });

  it("asks for participants only, so the researcher account can't rank", async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);
    prismaMock.userEconomy.findMany.mockResolvedValue([] as never);

    await allTimeLeaderboard(null);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "PARTICIPANT" } }),
    );
  });

  it("returns no 'you' row for a viewer who isn't in the ranking", async () => {
    prismaMock.user.findMany.mockResolvedValue(participants as never);
    prismaMock.userEconomy.findMany.mockResolvedValue([] as never);

    const board = await allTimeLeaderboard("admin-1");

    expect(board.you).toBeNull();
  });

  it("handles an empty deployment without touching the economy table", async () => {
    prismaMock.user.findMany.mockResolvedValue([] as never);

    const board = await allTimeLeaderboard("u1");

    expect(board).toEqual({ entries: [], you: null, participantCount: 0 });
    expect(prismaMock.userEconomy.findMany).not.toHaveBeenCalled();
  });
});
