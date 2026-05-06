import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";

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

describe("AdminAccessGate", () => {
  beforeEach(() => {
    mocks.auth.isAuthenticated = false;
    mocks.auth.isLoading = false;
    mocks.boundaryOnline = true;
    mocks.queryResult = null;
    mocks.signIn.mockReset();
  });

  it("shows loading UI while auth state is loading", () => {
    mocks.auth.isLoading = true;

    render(
      <AdminAccessGate>
        <div>admin content</div>
      </AdminAccessGate>,
    );

    expect(screen.getByText("Checking admin session...")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("shows a sign-in CTA when the viewer is unauthenticated", () => {
    render(
      <AdminAccessGate>
        <div>admin content</div>
      </AdminAccessGate>,
    );

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("shows access denied for authenticated customers", () => {
    mocks.auth.isAuthenticated = true;
    mocks.queryResult = { role: "customer" };

    render(
      <AdminAccessGate>
        <div>admin content</div>
      </AdminAccessGate>,
    );

    expect(screen.getByText("This account is not an admin")).toBeInTheDocument();
    expect(screen.getByText("customer")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it.each(["admin", "super_admin"])("renders children for %s viewers", (role) => {
    mocks.auth.isAuthenticated = true;
    mocks.queryResult = { role };

    render(
      <AdminAccessGate>
        <div>admin content</div>
      </AdminAccessGate>,
    );

    expect(screen.getByText("admin content")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Admin sections" })).toHaveLength(2);
  });

  it("shows a misconfiguration state when Convex is unavailable", () => {
    mocks.boundaryOnline = false;

    render(
      <AdminAccessGate>
        <div>admin content</div>
      </AdminAccessGate>,
    );

    expect(screen.getByText("Live admin needs backend config")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });
});
