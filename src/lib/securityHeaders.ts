import type { RuntimeMode } from "./env";

type SecurityHeaderConfig = {
  convexUrl?: string;
  mode: RuntimeMode;
};

const razorpaySources = [
  "https://checkout.razorpay.com",
  "https://api.razorpay.com",
  "https://cdn.razorpay.com",
  "https://lumberjack.razorpay.com",
  "https://*.razorpay.com",
];
const selfAndRazorpaySources = ["'self'", ...razorpaySources];

const googleSources = [
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.google.com",
  "https://www.gstatic.com",
];

const turnstileSources = ["https://challenges.cloudflare.com"];

function getConvexOrigins(convexUrl: string | undefined) {
  if (!convexUrl) {
    return [];
  }

  try {
    const url = new URL(convexUrl);
    const websocketOrigin = `wss://${url.host}`;
    return [url.origin, websocketOrigin];
  } catch {
    return [];
  }
}

function getDevelopmentConnectSources(mode: RuntimeMode) {
  return mode === "development"
    ? ["ws://localhost:*", "ws://127.0.0.1:*", "http://localhost:*", "http://127.0.0.1:*"]
    : [];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function buildContentSecurityPolicy(config: SecurityHeaderConfig) {
  const scriptSources = unique([
    ...selfAndRazorpaySources,
    "'unsafe-inline'",
    ...googleSources,
    ...turnstileSources,
  ]);
  const connectSources = unique([
    ...selfAndRazorpaySources,
    "https://*.convex.cloud",
    "wss://*.convex.cloud",
    "https://*.convex.site",
    "wss://*.convex.site",
    ...googleSources,
    ...turnstileSources,
    ...getConvexOrigins(config.convexUrl),
    ...getDevelopmentConnectSources(config.mode),
  ]);
  const frameSources = unique([
    ...selfAndRazorpaySources,
    ...razorpaySources,
    ...googleSources,
    ...turnstileSources,
  ]);
  const styleSources = unique([
    ...selfAndRazorpaySources,
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    ...googleSources,
  ]);
  const fontSources = unique([
    ...selfAndRazorpaySources,
    "data:",
    "https://fonts.gstatic.com",
  ]);
  const imageSources = unique([
    ...selfAndRazorpaySources,
    "data:",
    "blob:",
    "https:",
  ]);
  const mediaSources = unique([
    ...selfAndRazorpaySources,
    "data:",
    "blob:",
  ]);
  const workerSources = unique([
    ...selfAndRazorpaySources,
    "blob:",
  ]);
  const formSources = unique([
    ...selfAndRazorpaySources,
    "https://*.convex.cloud",
    "https://*.convex.site",
    ...googleSources,
    ...getConvexOrigins(config.convexUrl).filter((origin) =>
      origin.startsWith("https://"),
    ),
  ]);

  return [
    `default-src ${selfAndRazorpaySources.join(" ")}`,
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `form-action ${formSources.join(" ")}`,
    `img-src ${imageSources.join(" ")}`,
    `font-src ${fontSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `script-src ${scriptSources.join(" ")}`,
    `script-src-elem ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    `child-src ${frameSources.join(" ")}`,
    `media-src ${mediaSources.join(" ")}`,
    `manifest-src ${selfAndRazorpaySources.join(" ")}`,
    `worker-src ${workerSources.join(" ")}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

export function buildSecurityHeaders(config: SecurityHeaderConfig) {
  const headers = new Headers();
  headers.set("Content-Security-Policy", buildContentSecurityPolicy(config));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com" "https://*.razorpay.com")',
  );

  if (config.mode === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return headers;
}

export function applySecurityHeaders(
  response: Response,
  config: SecurityHeaderConfig,
) {
  const headers = buildSecurityHeaders(config);
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}
