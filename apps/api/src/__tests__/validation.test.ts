/**
 * Tests for request validation using the Zod schema.
 */

import { describe, it, expect } from "vitest";
import { scheduleEmailSchema } from "../services/schedulerService.js";

const validBase = {
  subject: "Test Subject",
  body: "Hello World",
  recipients: ["alice@test.com", "bob@test.com"],
  startTime: new Date(Date.now() + 60_000).toISOString(),
  delayMs: 2000,
  hourlyLimit: 100,
  senderId: "550e8400-e29b-41d4-a716-446655440000",
};

describe("scheduleEmailSchema validation", () => {
  it("accepts valid request", () => {
    const result = scheduleEmailSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects missing subject", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      subject: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain("subject");
    }
  });

  it("rejects missing body", () => {
    const result = scheduleEmailSchema.safeParse({ ...validBase, body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty recipients array", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      recipients: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain("recipients");
    }
  });

  it("rejects invalid email addresses", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      recipients: ["not-an-email", "also-bad"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts mixed valid and invalid — Zod validates each element", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      recipients: ["valid@test.com", "not-an-email"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative delay", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      delayMs: -1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero delay", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      delayMs: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative hourly limit", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      hourlyLimit: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero hourly limit", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      hourlyLimit: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for senderId", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      senderId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ISO date for startTime", () => {
    const result = scheduleEmailSchema.safeParse({
      ...validBase,
      startTime: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts 100 valid recipients", () => {
    const recipients = Array.from(
      { length: 100 },
      (_, i) => `user${i}@test.com`
    );
    const result = scheduleEmailSchema.safeParse({ ...validBase, recipients });
    expect(result.success).toBe(true);
  });
});
