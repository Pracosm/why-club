import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { getConvexClient, hasConvexUrl } from "@/lib/convex";
import { publicEnv } from "@/lib/env";

type ConvexClientBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export function ConvexClientBoundary({
  children,
  fallback,
}: ConvexClientBoundaryProps) {
  const client = getConvexClient();

  if (!hasConvexUrl() || !client) {
    if (publicEnv.runtimeMode === "production") {
      return (
        <div role="alert">
          WhÿClub is temporarily unavailable. Runtime configuration is incomplete.
        </div>
      );
    }

    return <>{fallback}</>;
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
