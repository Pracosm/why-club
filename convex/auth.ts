import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { resendEmail } from "./lib/email";
import { getSuperAdminEmails, isProdDeployment } from "./lib/env";

function generateOtpCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return (bytes[0] % 1_000_000).toString().padStart(6, "0");
}

function resolveRole(email: string | undefined, existingRole?: string) {
  if (existingRole && existingRole !== "customer") {
    return existingRole;
  }

  if (email && getSuperAdminEmails().has(email.toLowerCase())) {
    return "super_admin" as const;
  }

  return "customer" as const;
}

function defaultRedirect() {
  return process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";
}

function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? process.env.PUBLIC_GOOGLE_CLIENT_ID;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      maxAge: 60 * 10,
      generateVerificationToken: async () => generateOtpCode(),
      sendVerificationRequest: async ({ identifier, token, expires }) => {
        if (!process.env.RESEND_API_KEY) {
          if (isProdDeployment()) {
            throw new ConvexError(
              "Email OTP is not configured (missing RESEND_API_KEY).",
            );
          }

          console.warn(
            "RESEND_API_KEY not configured. Email OTP will be logged for local testing.",
          );
          console.info(
            `DEV OTP for ${identifier}: ${token} (expires ${expires.toISOString()})`,
          );
          return;
        }

        await resendEmail({
          to: identifier,
          subject: "Your WhÿClub Verification Code",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                </style>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f6f1e8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 40px 0;">
                      <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid rgba(17, 17, 17, 0.05); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.04);">
                        <tr>
                          <td style="padding: 60px 40px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; margin-bottom: 40px; color: #111111;">
                              WhÿClub
                            </div>

                            <h1 style="font-size: 32px; font-weight: 900; color: #111111; margin: 0 0 16px; letter-spacing: -0.02em; text-transform: uppercase;">
                              Verify your identity
                            </h1>

                            <p style="font-size: 16px; line-height: 1.6; color: rgba(17, 17, 17, 0.6); margin: 0 0 40px;">
                              To complete your request, please enter the following 6-digit verification code.
                            </p>

                            <div style="background-color: #f6f1e8; border-radius: 16px; padding: 32px; margin-bottom: 40px; border: 1px solid rgba(17, 17, 17, 0.03);">
                              <div style="font-family: monospace; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #111111; margin-left: 12px;">
                                ${token}
                              </div>
                            </div>

                            <p style="font-size: 14px; color: rgba(17, 17, 17, 0.4); margin: 0;">
                              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 32px; background-color: #111111; text-align: center;">
                            <p style="font-size: 12px; color: rgba(255, 255, 255, 0.4); margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                              &copy; ${new Date().getFullYear()} WhÿClub. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
        });
      },
    }),
    Password({
      profile(params: { email?: string; name?: string }) {
        return {
          email: params.email ?? "",
          ...(params.name ? { name: params.name } : {}),
        };
      },
    }),
    Google({
      clientId: googleClientId(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = args.profile.email?.toLowerCase();
      const now = Date.now();

      if (args.existingUserId) {
        const existing = await ctx.db.get(args.existingUserId);
        await ctx.db.patch(args.existingUserId, {
          name: typeof args.profile.name === "string" ? args.profile.name : existing?.name,
          image:
            typeof args.profile.image === "string"
              ? args.profile.image
              : existing?.image,
          email: email ?? existing?.email,
          emailVerificationTime:
            args.profile.emailVerified === true
              ? now
              : existing?.emailVerificationTime,
          role: resolveRole(email, existing?.role),
          updatedAt: now,
        });
        return args.existingUserId;
      }

      return await ctx.db.insert("users", {
        name: typeof args.profile.name === "string" ? args.profile.name : undefined,
        image:
          typeof args.profile.image === "string" ? args.profile.image : undefined,
        email,
        emailVerificationTime: args.profile.emailVerified === true ? now : undefined,
        role: resolveRole(email),
        createdAt: now,
        updatedAt: now,
      });
    },
    async beforeSessionCreation(ctx, args) {
      await ctx.db.patch(args.userId, {
        lastSeenAt: Date.now(),
      });
    },
    async redirect({ redirectTo }) {
      if (!redirectTo) {
        return defaultRedirect();
      }

      try {
        const fallback = new URL(defaultRedirect());
        const destination = new URL(redirectTo, fallback);
        const adminHost = process.env.PUBLIC_ADMIN_HOST;

        // Always allow localhost and its subdomains in development
        if (destination.hostname === "localhost" || destination.hostname.endsWith(".localhost")) {
          return destination.toString();
        }

        const allowedOrigins = new Set([fallback.origin]);

        if (adminHost) {
          allowedOrigins.add(`https://${adminHost}`);
          allowedOrigins.add(`http://${adminHost}`);

          // Also allow the admin host with the same port as the fallback (common in dev)
          if (fallback.port) {
            allowedOrigins.add(`http://${adminHost}:${fallback.port}`);
            allowedOrigins.add(`https://${adminHost}:${fallback.port}`);
          }
        }

        if (allowedOrigins.has(destination.origin)) {
          return destination.toString();
        }
      } catch {
        return defaultRedirect();
      }

      return defaultRedirect();
    },
  },
});
