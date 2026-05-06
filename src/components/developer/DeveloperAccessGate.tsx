import { useConvexAuth, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { api } from "../../../convex/_generated/api";
import { DeveloperAccessDenied } from "./DeveloperAccessDenied";

type DeveloperAccessGateProps = {
  children: ReactNode;
};

function DeveloperAccessGateSurface({ children }: DeveloperAccessGateProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && user === undefined)) {
    return <DeveloperAccessDenied variant="loading" />;
  }

  if (!isAuthenticated) {
    return <DeveloperAccessDenied variant="unauthenticated" />;
  }

  if (user?.role !== "super_admin") {
    return <DeveloperAccessDenied variant="forbidden" role={user?.role} />;
  }

  return <>{children}</>;
}

export function DeveloperAccessGate({ children }: DeveloperAccessGateProps) {
  return (
    <ConvexClientBoundary
      fallback={<DeveloperAccessDenied variant="misconfigured" />}
    >
      <DeveloperAccessGateSurface>{children}</DeveloperAccessGateSurface>
    </ConvexClientBoundary>
  );
}
