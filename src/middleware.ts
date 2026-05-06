import { defineMiddleware } from "astro:middleware";
import { publicEnv } from "@/lib/env";
import { applySecurityHeaders } from "@/lib/securityHeaders";

const legacyRouteRedirects = new Map([
  ["/index.html", "/"],
  ["/index-v3.html", "/"],
  ["/story.html", "/story"],
  ["/returns.html", "/returns"],
  ["/contact.html", "/contact"],
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const cleanRoute = legacyRouteRedirects.get(url.pathname);

  if (cleanRoute) {
    url.pathname = cleanRoute;
    return applySecurityHeaders(context.redirect(url.toString(), 301), {
      convexUrl: publicEnv.convexUrl,
      mode: publicEnv.runtimeMode,
    });
  }

  if (!publicEnv.enableAdminSubdomain) {
    return applySecurityHeaders(await next(), {
      convexUrl: publicEnv.convexUrl,
      mode: publicEnv.runtimeMode,
    });
  }

  const isAdminHost = url.hostname === publicEnv.adminHost;

  if (isAdminHost) {
    if (url.pathname === "/") {
      return applySecurityHeaders(await context.rewrite("/admin"), {
        convexUrl: publicEnv.convexUrl,
        mode: publicEnv.runtimeMode,
      });
    }

    if (!url.pathname.startsWith("/admin")) {
      return applySecurityHeaders(await context.rewrite(`/admin${url.pathname}`), {
        convexUrl: publicEnv.convexUrl,
        mode: publicEnv.runtimeMode,
      });
    }

    return applySecurityHeaders(await next(), {
      convexUrl: publicEnv.convexUrl,
      mode: publicEnv.runtimeMode,
    });
  }

  if (url.pathname.startsWith("/admin")) {
    const adminUrl = new URL(url.toString());
    adminUrl.hostname = publicEnv.adminHost;
    return applySecurityHeaders(context.redirect(adminUrl.toString()), {
      convexUrl: publicEnv.convexUrl,
      mode: publicEnv.runtimeMode,
    });
  }

  return applySecurityHeaders(await next(), {
    convexUrl: publicEnv.convexUrl,
    mode: publicEnv.runtimeMode,
  });
});
