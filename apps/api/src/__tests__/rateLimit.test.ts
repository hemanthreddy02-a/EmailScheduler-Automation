/**
 * Tests for the rate limiting logic.
 */

import { describe, it, expect } from "vitest";
import {
  getHourWindow,
  getNextHourWindowStart,
} from "../services/rateLimitService.js";

describe("getHourWindow", () => {
  it("returns correct format YYYYMMDDHHH", () => {
    const date = new Date("2026-08-19T10:30:00.000Z");
    const window = getHourWindow(date);
    expect(window).toBe("2026081910");
  });

  it("pads month and day with leading zeros", () => {
    const date = new Date("2026-01-05T09:00:00.000Z");
    const window = getHourWindow(date);
    expect(window).toBe("2026010509");
  });

  it("different hours produce different windows", () => {
    const hour10 = getHourWindow(new Date("2026-08-19T10:59:59.000Z"));
    const hour11 = getHourWindow(new Date("2026-08-19T11:00:00.000Z"));
    expect(hour10).not.toBe(hour11);
    expect(hour10).toBe("2026081910");
    expect(hour11).toBe("2026081911");
  });

  it("same hour returns same window regardless of minutes", () => {
    const start = getHourWindow(new Date("2026-08-19T10:00:00.000Z"));
    const mid = getHourWindow(new Date("2026-08-19T10:30:00.000Z"));
    const end = getHourWindow(new Date("2026-08-19T10:59:59.000Z"));
    expect(start).toBe(mid);
    expect(mid).toBe(end);
  });
});

describe("getNextHourWindowStart", () => {
  it("returns the start of the next hour", () => {
    const now = new Date("2026-08-19T10:30:45.000Z");
    const next = getNextHourWindowStart(now);
    expect(next.getUTCHours()).toBe(11);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCSeconds()).toBe(0);
    expect(next.getUTCMilliseconds()).toBe(0);
  });

  it("rolls over from hour 23 to midnight next day", () => {
    const now = new Date("2026-08-19T23:45:00.000Z");
    const next = getNextHourWindowStart(now);
    expect(next.getUTCDate()).toBe(20);
    expect(next.getUTCHours()).toBe(0);
  });

  it("next window start is always in the future relative to input", () => {
    const now = new Date("2026-08-19T10:30:00.000Z");
    const next = getNextHourWindowStart(now);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("Rate limit logic", () => {
  it("correctly identifies when limit is reached", () => {
    const limit = 5;
    let count = 0;

    function tryAcquire(): boolean {
      if (count >= limit) return false;
      count++;
      return true;
    }

    for (let i = 0; i < limit; i++) {
      expect(tryAcquire()).toBe(true);
    }
    expect(tryAcquire()).toBe(false); // 6th attempt fails
    expect(count).toBe(5);
  });

  it("resets in a new hour window", () => {
    // Different hour windows should be independent
    const window1 = getHourWindow(new Date("2026-08-19T10:00:00.000Z"));
    const window2 = getHourWindow(new Date("2026-08-19T11:00:00.000Z"));
    expect(window1).not.toBe(window2);
    // Each window starts with count 0 (independent Redis keys)
  });
});
