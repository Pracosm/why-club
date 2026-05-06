import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeveloperAccessGate } from "@/components/developer/DeveloperAccessGate";

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isLoading: false,
  },
  boundaryOnline: true,
  queryResult: null as null | undefined | { role: string },
  signIn: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => mocks.auth,
  useQuery: () => mocks.queryResult,
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mocks.signIn }),
}));

vi.mock("@/components/react/ConvexClientBoundary", () => ({
  ConvexClientBoundary: ({
    children,
    fallback,
  }: {
    children: ReactNode;
    fallback: ReactNode;
  }) => (mocks.boundaryOnline ? children : fallback),
}));

describe("DeveloperAccessGate", () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = false;
    mocks.auth.isLoading = false;
    mocks.boundaryOnline = true;
    mocks.queryResult = null;
    mocks.signIn.mockReset();
  });

  it("shows sign-in UI for signed-out viewers", () => {
    render(
      <DeveloperAccessGate>
        <div>developer content</div>
      </DeveloperAccessGate>,
    );

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText("developer content")).not.toBeInTheDocument();
  });

  it.each(["customer", "admin", "editor"])("blocks %s users", (role) => {
    mocks.auth.isAuthenticated = true;
    mocks.queryResult = { role };

    render(
      <DeveloperAccessGate>
        <div>developer content</div>
      </DeveloperAccessGate>,
    );

    expect(screen.getByText("This account cannot open dev tools")).toBeInTheDocument();
    expect(screen.getByText(role)).toBeInTheDocument();
    expect(screen.queryByText("developer content")).not.toBeInTheDocument();
  });

  it("renders children for super admins", () => {
    mocks.auth.isAuthenticated = true;
    mocks.queryResult = { role: "super_admin" };

    render(
      <DeveloperAccessGate>
        <div>developer content</div>
      </DeveloperAccessGate>,
    );

    expect(screen.getByText("developer content")).toBeInTheDocument();
  });
});
