const OTP_LENGTH = 6;
const OTP_PATTERN = /^\d{6}$/;

export function normalizeOtpCode(value: string) {
  return value.replace(/\s/g, "").trim();
}

export function isValidOtpCode(value: string) {
  return OTP_PATTERN.test(normalizeOtpCode(value));
}

export function generateOtpCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function assertOtpPepper(
  value: string | undefined,
  isProduction: boolean,
) {
  if (!value && isProduction) {
    throw new Error("OTP_HASH_PEPPER is required in production.");
  }

  return value ?? "development-otp-pepper";
}

export async function hashOtpCode(args: {
  email: string;
  code: string;
  createdAt: number;
  pepper: string;
}) {
  const payload = `${args.pepper}:${args.email}:${normalizeOtpCode(args.code)}:${args.createdAt}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqualHex(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
