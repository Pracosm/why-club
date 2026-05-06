import { ConvexError } from "convex/values";
import { isProductionDeployment, readOptionalEnv } from "./env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_ONBOARDING_SENDER = "WhÿClub <onboarding@resend.dev>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

type ResendPayload = EmailOptions & {
  from: string;
};

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnverifiedSenderError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("domain is not verified") || message.includes("verify your domain");
}

async function deliverWithResend(apiKey: string, payload: ResendPayload) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: htmlToText(payload.html),
    }),
  });

  if (response.ok) {
    return;
  }

  const message = await readResendError(response);
  throw new Error(`Resend API error (${response.status} ${response.statusText}): ${message}`);
}

async function readResendError(response: Response) {
  const rawBody = await response.text();
  try {
    const parsed = JSON.parse(rawBody) as { message?: string };
    return parsed.message || rawBody;
  } catch {
    return rawBody;
  }
}

function resolveSender() {
  const from = readOptionalEnv("RESEND_FROM_EMAIL");
  if (from) return from;

  if (isProductionDeployment()) {
    throw new ConvexError("Email sender is not configured.");
  }

  console.warn(
    "RESEND_FROM_EMAIL not configured. Falling back to onboarding@resend.dev; set a verified sender for production.",
  );
  return RESEND_ONBOARDING_SENDER;
}

export async function resendEmail(options: EmailOptions): Promise<void> {
  const apiKey = readOptionalEnv("RESEND_API_KEY");
  if (!apiKey) {
    throw new ConvexError("Email delivery is not configured.");
  }

  try {
    await deliverWithResend(apiKey, { ...options, from: resolveSender() });
  } catch (error) {
    if (!isProductionDeployment() && isUnverifiedSenderError(error)) {
      await deliverWithResend(apiKey, { ...options, from: RESEND_ONBOARDING_SENDER });
      return;
    }

    console.error("Email service error:", error);
    throw new ConvexError(
      "Failed to send email OTP. Check RESEND_API_KEY/RESEND_FROM_EMAIL and Resend domain/recipient verification.",
    );
  }
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  const displayName = name ? `${name.split(" ")[0]}` : "there";

  await resendEmail({
    to: email,
    subject: "Welcome to WhÿClub!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #000;">Welcome to WhÿClub, ${displayName}!</h1>
        <p>We're excited to have you on board. Start exploring our curated collection of products.</p>
        <a href="https://whyclub.store" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">
          Browse Collection
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Questions? Reply to this email or visit our help center.
        </p>
      </div>
    `,
  });
}
