import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthChoicePanel } from "@/components/auth/AuthChoicePanel";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  flags: undefined as undefined | { emailOtpEnabled: boolean },
}));

vi.mock("convex/react", () => ({
  useQuery: () => mocks.flags,
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mocks.signIn }),
}));

describe("AuthChoicePanel", () => {
  beforeEach(() => {
    mocks.signIn.mockReset();
    mocks.flags = undefined;
  });

  it("defaults to Google-only before auth flags resolve", () => {
    render(<AuthChoicePanel />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText("Send email code")).not.toBeInTheDocument();
  });

  it("shows email OTP controls when the flag is enabled", () => {
    mocks.flags = { emailOtpEnabled: true };

    render(<AuthChoicePanel />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send email code/ })).toBeInTheDocument();
  });

  it("hides email OTP controls when the flag is disabled", () => {
    mocks.flags = { emailOtpEnabled: false };

    render(<AuthChoicePanel />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText("Send email code")).not.toBeInTheDocument();
    expect(screen.queryByText(/Email OTP/i)).not.toBeInTheDocument();
  });
});
