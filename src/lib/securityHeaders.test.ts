import { describe, expect, it } from "vitest";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./securityHeaders";

function getDirective(policy: string, name: string) {
  return policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `));
}

const razorpayHosts = [
  "https://checkout.razorpay.com",
  "https://api.razorpay.com",
  "https://cdn.razorpay.com",
  "https://lumberjack.razorpay.com",
  "https://*.razorpay.com",
];

const razorpayDirectives = [
  "default-src",
  "form-action",
  "img-src",
  "font-src",
  "style-src",
  "script-src",
  "script-src-elem",
  "connect-src",
  "frame-src",
  "child-src",
  "media-src",
  "manifest-src",
  "worker-src",
];

describe("security headers", () => {
  it("allows required commerce and backend origins in the CSP", () => {
    const policy = buildContentSecurityPolicy({
      convexUrl: "https://steady-goat-123.convex.cloud",
      mode: "production",
    });

    expect(policy).toContain("https://steady-goat-123.convex.cloud");
    expect(policy).toContain("wss://steady-goat-123.convex.cloud");
    expect(policy).toContain("wss://*.convex.cloud");
    expect(policy).toContain("https://checkout.razorpay.com");
    expect(policy).toContain("https://cdn.razorpay.com");
    expect(policy).toContain("https://lumberjack.razorpay.com");
    expect(policy).toContain("https://*.razorpay.com");
    expect(policy).toContain("script-src-elem");
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).toContain("https://accounts.google.com");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("allows Razorpay Magic Checkout telemetry connections", () => {
    const policy = buildContentSecurityPolicy({
      convexUrl: "https://steady-goat-123.convex.cloud",
      mode: "production",
    });
    const connectSrc = getDirective(policy, "connect-src");

    expect(connectSrc).toContain("https://lumberjack.razorpay.com");
    expect(connectSrc).toContain("https://*.razorpay.com");
  });

  it("allows Razorpay across every checkout-relevant policy surface", () => {
    const policy = buildContentSecurityPolicy({
      convexUrl: "https://steady-goat-123.convex.cloud",
      mode: "production",
    });

    for (const directiveName of razorpayDirectives) {
      const directive = getDirective(policy, directiveName);
      expect(directive, directiveName).toBeDefined();
      for (const host of razorpayHosts) {
        expect(directive, `${directiveName} ${host}`).toContain(host);
      }
    }
  });

  it("keeps local Vite websocket allowances out of production", () => {
    const devPolicy = buildContentSecurityPolicy({
      convexUrl: "https://steady-goat-123.convex.cloud",
      mode: "development",
    });
    const prodPolicy = buildContentSecurityPolicy({
      convexUrl: "https://steady-goat-123.convex.cloud",
      mode: "production",
    });

    expect(devPolicy).toContain("ws://localhost:*");
    expect(devPolicy).toContain("http://127.0.0.1:*");
    expect(prodPolicy).not.toContain("ws://localhost:*");
    expect(prodPolicy).not.toContain("http://127.0.0.1:*");
  });

  it("sets HSTS only for production", () => {
    const devHeaders = buildSecurityHeaders({ mode: "development" });
    const prodHeaders = buildSecurityHeaders({ mode: "production" });

    expect(devHeaders.has("Strict-Transport-Security")).toBe(false);
    expect(prodHeaders.get("Strict-Transport-Security")).toContain(
      "includeSubDomains",
    );
  });

  it("applies headers to middleware responses", () => {
    const response = new Response("ok");

    applySecurityHeaders(response, { mode: "development" });

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("allows Razorpay payment permission", () => {
    const headers = buildSecurityHeaders({ mode: "production" });

    expect(headers.get("Permissions-Policy")).toContain(
      "https://checkout.razorpay.com",
    );
    expect(headers.get("Permissions-Policy")).toContain(
      "https://*.razorpay.com",
    );
  });
});
