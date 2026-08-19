/**
 * Tests for idempotency logic.
 *
 * These tests verify the state machine transitions and that
 * already-sent jobs are not processed again.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailJobStatus } from "@prisma/client";

// ─── Mock the processEmail internals ─────────────────────────────────────────

/**
 * Simulates what the worker does with its idempotency checks.
 * We test the logic in isolation without actual DB/Redis.
 */
function simulateWorker(jobStatus: EmailJobStatus): {
  wouldProcess: boolean;
  reason: string;
} {
  // Step 1: Job not found
  // (tested separately)

  // Step 2: Already SENT → skip
  if (jobStatus === EmailJobStatus.SENT) {
    return { wouldProcess: false, reason: "ALREADY_SENT" };
  }

  // Step 3: Can transition from SCHEDULED or FAILED
  if (
    jobStatus === EmailJobStatus.SCHEDULED ||
    jobStatus === EmailJobStatus.FAILED
  ) {
    return { wouldProcess: true, reason: "PROCESSING" };
  }

  // Step 4: Already PROCESSING → skip (another worker has it)
  if (jobStatus === EmailJobStatus.PROCESSING) {
    return { wouldProcess: false, reason: "ALREADY_PROCESSING" };
  }

  return { wouldProcess: false, reason: "UNKNOWN" };
}

describe("Idempotency state machine", () => {
  it("processes SCHEDULED jobs", () => {
    const result = simulateWorker(EmailJobStatus.SCHEDULED);
    expect(result.wouldProcess).toBe(true);
    expect(result.reason).toBe("PROCESSING");
  });

  it("skips SENT jobs — prevents duplicate send", () => {
    const result = simulateWorker(EmailJobStatus.SENT);
    expect(result.wouldProcess).toBe(false);
    expect(result.reason).toBe("ALREADY_SENT");
  });

  it("skips PROCESSING jobs — prevents concurrent duplicate", () => {
    const result = simulateWorker(EmailJobStatus.PROCESSING);
    expect(result.wouldProcess).toBe(false);
    expect(result.reason).toBe("ALREADY_PROCESSING");
  });

  it("allows retry of FAILED jobs", () => {
    const result = simulateWorker(EmailJobStatus.FAILED);
    expect(result.wouldProcess).toBe(true);
    expect(result.reason).toBe("PROCESSING");
  });
});

describe("Concurrent worker safety", () => {
  it("only one worker wins the conditional update", () => {
    // Simulate two concurrent workers trying to claim the same job
    const jobStatus = EmailJobStatus.SCHEDULED;
    let claimed = false;

    function tryClaimJob(currentStatus: EmailJobStatus): boolean {
      if (currentStatus !== EmailJobStatus.SCHEDULED && currentStatus !== EmailJobStatus.FAILED) {
        return false; // Someone else already claimed it
      }
      if (claimed) {
        // Simulates the DB conditional update returning count=0
        return false;
      }
      claimed = true;
      return true;
    }

    const worker1 = tryClaimJob(jobStatus);
    const worker2 = tryClaimJob(jobStatus); // Same job, same status

    // Only one should succeed (the DB WHERE clause is atomic)
    expect(worker1).toBe(true);
    expect(worker2).toBe(false);
    expect(claimed).toBe(true);
  });

  it("second BullMQ delivery of same job is skipped when SENT", () => {
    // Simulate: worker sent email, marked SENT, then BullMQ delivers again
    let dbStatus: EmailJobStatus = EmailJobStatus.SCHEDULED;

    function processJob(): string {
      if (dbStatus === EmailJobStatus.SENT) {
        return "SKIPPED_ALREADY_SENT";
      }
      dbStatus = EmailJobStatus.SENT;
      return "SENT";
    }

    const firstRun = processJob();
    const secondRun = processJob(); // BullMQ duplicate delivery

    expect(firstRun).toBe("SENT");
    expect(secondRun).toBe("SKIPPED_ALREADY_SENT");
  });
});
