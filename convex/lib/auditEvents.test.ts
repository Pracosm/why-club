import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "./auditEvents";

describe("audit event helpers", () => {
  it("removes secret-like metadata keys", () => {
    expect(
      sanitizeAuditMetadata({
        paymentId: "pay_1",
        signature: "secret",
        otpCode: "123456",
      }),
    ).toEqual({ paymentId: "pay_1" });
  });
});
