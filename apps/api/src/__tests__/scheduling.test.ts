/**
 * Tests for the scheduling algorithm.
 *
 * These tests verify:
 *  - Correct per-recipient delay computation
 *  - Hourly window boundaries
 *  - Ordering preservation
 *  - Edge cases (single email, exact hourly limit)
 */

import { describe, it, expect } from "vitest";
import {
  computeScheduleTimes,
  normalizeRecipients,
} from "../services/schedulerService.js";

describe("computeScheduleTimes", () => {
  const startTime = new Date("2026-08-19T10:00:00.000Z");

  it("schedules a single email at startTime", () => {
    const times = computeScheduleTimes(startTime, 2000, 100, 1);
    expect(times).toHaveLength(1);
    expect(times[0]?.getTime()).toBe(startTime.getTime());
  });

  it("applies delay between consecutive emails", () => {
    const times = computeScheduleTimes(startTime, 2000, 100, 3);
    expect(times).toHaveLength(3);
    expect(times[0]?.getTime()).toBe(startTime.getTime());
    expect(times[1]?.getTime()).toBe(startTime.getTime() + 2000);
    expect(times[2]?.getTime()).toBe(startTime.getTime() + 4000);
  });

  it("respects hourly limit and starts next hour for overflow", () => {
    const times = computeScheduleTimes(startTime, 2000, 5, 10);
    expect(times).toHaveLength(10);

    const hourMs = 3_600_000;

    // First 5 emails in hour 1
    expect(times[0]?.getTime()).toBe(startTime.getTime());
    expect(times[1]?.getTime()).toBe(startTime.getTime() + 2000);
    expect(times[2]?.getTime()).toBe(startTime.getTime() + 4000);
    expect(times[3]?.getTime()).toBe(startTime.getTime() + 6000);
    expect(times[4]?.getTime()).toBe(startTime.getTime() + 8000);

    // Next 5 start at hour 2
    const hour2Start = startTime.getTime() + hourMs;
    expect(times[5]?.getTime()).toBe(hour2Start);
    expect(times[6]?.getTime()).toBe(hour2Start + 2000);
    expect(times[7]?.getTime()).toBe(hour2Start + 4000);
    expect(times[8]?.getTime()).toBe(hour2Start + 6000);
    expect(times[9]?.getTime()).toBe(hour2Start + 8000);
  });

  it("handles exactly hourlyLimit recipients without overflow", () => {
    const times = computeScheduleTimes(startTime, 2000, 5, 5);
    expect(times).toHaveLength(5);
    // All should be in the first hour
    const lastTime = times[4]!.getTime();
    expect(lastTime).toBe(startTime.getTime() + 4 * 2000);
    // Should not spill into second hour
    expect(lastTime).toBeLessThan(startTime.getTime() + 3_600_000);
  });

  it("handles hourlyLimit=1 (one email per hour)", () => {
    const times = computeScheduleTimes(startTime, 0, 1, 3);
    expect(times).toHaveLength(3);
    const hourMs = 3_600_000;
    expect(times[0]?.getTime()).toBe(startTime.getTime());
    expect(times[1]?.getTime()).toBe(startTime.getTime() + hourMs);
    expect(times[2]?.getTime()).toBe(startTime.getTime() + 2 * hourMs);
  });

  it("produces times in ascending order", () => {
    const times = computeScheduleTimes(startTime, 1500, 3, 9);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!.getTime()).toBeGreaterThanOrEqual(times[i - 1]!.getTime());
    }
  });

  it("handles 1000 recipients efficiently", () => {
    const start = performance.now();
    const times = computeScheduleTimes(startTime, 2000, 100, 1000);
    const elapsed = performance.now() - start;

    expect(times).toHaveLength(1000);
    expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
  });
});

describe("normalizeRecipients", () => {
  it("deduplicates emails", () => {
    const result = normalizeRecipients([
      "a@test.com",
      "b@test.com",
      "a@test.com",
    ]);
    expect(result).toHaveLength(2);
  });

  it("lowercases emails", () => {
    const result = normalizeRecipients(["A@Test.COM", "B@TEST.com"]);
    expect(result).toEqual(["a@test.com", "b@test.com"]);
  });

  it("trims whitespace", () => {
    const result = normalizeRecipients(["  a@test.com  "]);
    expect(result).toEqual(["a@test.com"]);
  });

  it("deduplicates case-insensitively", () => {
    const result = normalizeRecipients(["A@test.com", "a@TEST.com"]);
    expect(result).toHaveLength(1);
  });

  it("preserves ordering of first occurrence", () => {
    const result = normalizeRecipients([
      "c@test.com",
      "a@test.com",
      "b@test.com",
    ]);
    expect(result[0]).toBe("c@test.com");
    expect(result[1]).toBe("a@test.com");
    expect(result[2]).toBe("b@test.com");
  });
});
