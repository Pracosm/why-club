import { describe, expect, it } from "vitest";
import {
  resolveCaptureTransition,
  resolveFailureTransition,
} from "./paymentState";

describe("payment state transitions", () => {
  it("no-ops when the same captured payment is received again", () => {
    expect(
      resolveCaptureTransition(
        {
          paymentStatus: "captured",
          razorpayPaymentId: "pay_123",
        },
        "pay_123",
      ),
    ).toEqual({ action: "noop" });
  });

  it("conflicts when a captured order receives a different payment id", () => {
    expect(
      resolveCaptureTransition(
        {
          paymentStatus: "captured",
          razorpayPaymentId: "pay_123",
        },
        "pay_456",
      ),
    ).toEqual({
      action: "conflict",
      reason: "Order is already captured with a different payment.",
    });
  });

  it("allows pending orders to transition to failed", () => {
    expect(resolveFailureTransition({ paymentStatus: "pending" })).toEqual({
      action: "fail",
    });
  });

  it("keeps captured orders captured after a failure event", () => {
    expect(resolveFailureTransition({ paymentStatus: "captured" })).toEqual({
      action: "noop",
    });
  });
});
