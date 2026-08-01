import { describe, expect, it } from "vitest";

import { decayedStateFor } from "@/lib/pet-decay";

/**
 * PET-06/PET-10 — flat-rate decay (5/hour hunger, 4/hour happiness), each
 * clamped to 0–100.
 */

const at = (hour: number, minute = 0) => new Date(2026, 6, 20, hour, minute);

describe("decayedStateFor", () => {
  it("leaves stats unchanged with no elapsed time", () => {
    expect(
      decayedStateFor(
        { happiness: 60, hunger: 40, lastInteractedAt: at(12) },
        at(12),
      ),
    ).toEqual({ happiness: 60, hunger: 40 });
  });

  it("raises hunger and lowers happiness by the flat hourly rate", () => {
    expect(
      decayedStateFor(
        { happiness: 60, hunger: 40, lastInteractedAt: at(12) },
        at(15),
      ),
    ).toEqual({ happiness: 48, hunger: 55 });
  });

  it("clamps hunger at 100", () => {
    expect(
      decayedStateFor(
        { happiness: 60, hunger: 90, lastInteractedAt: at(0) },
        at(12),
      ),
    ).toEqual({ happiness: 12, hunger: 100 });
  });

  it("clamps happiness at 0", () => {
    expect(
      decayedStateFor(
        { happiness: 10, hunger: 0, lastInteractedAt: at(0) },
        at(12),
      ),
    ).toEqual({ happiness: 0, hunger: 60 });
  });

  it("treats a future lastInteractedAt (clock skew) as zero elapsed time", () => {
    expect(
      decayedStateFor(
        { happiness: 60, hunger: 40, lastInteractedAt: at(15) },
        at(12),
      ),
    ).toEqual({ happiness: 60, hunger: 40 });
  });

  it("rounds fractional-hour decay to the nearest int", () => {
    expect(
      decayedStateFor(
        { happiness: 60, hunger: 40, lastInteractedAt: at(12) },
        at(12, 30),
      ),
    ).toEqual({ happiness: 58, hunger: 43 });
  });
});
