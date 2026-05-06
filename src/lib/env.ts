export type RuntimeMode = "development" | "production";

export function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

export function getRuntimeMode(isProd: boolean): RuntimeMode {
  return isProd ? "production" : "development";
}

export function isProductionMode(mode: RuntimeMode) {
  return mode === "production";
}

export function assertPublicRuntimeConfig(config: {
  convexUrl: string;
  mode: RuntimeMode;
}) {
  if (isProductionMode(config.mode) && config.convexUrl.length === 0) {
    throw new Error("PUBLIC_CONVEX_URL is required in production.");
  }
}

const runtimeMode = getRuntimeMode(import.meta.env.PROD);
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL ?? "";

assertPublicRuntimeConfig({
  convexUrl,
  mode: runtimeMode,
});

export const publicEnv = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
  appName: import.meta.env.PUBLIC_APP_NAME ?? "WhÿClub",
  adminHost: import.meta.env.PUBLIC_ADMIN_HOST ?? "admin.localhost",
  enableAdminSubdomain: parseBoolean(
    import.meta.env.PUBLIC_ENABLE_ADMIN_SUBDOMAIN,
  ),
  convexUrl,
  razorpayKeyId: import.meta.env.PUBLIC_RAZORPAY_KEY_ID ?? "",
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "",
  razorpayCheckoutMode:
    import.meta.env.PUBLIC_RAZORPAY_CHECKOUT_MODE === "standard"
      ? "standard"
      : "magic" as "standard" | "magic",
  runtimeMode,
};

export function isConfiguredForConvex() {
  return publicEnv.convexUrl.length > 0;
}
