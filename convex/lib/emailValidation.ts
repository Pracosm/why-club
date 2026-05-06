const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function assertValidEmail(value: string) {
  const email = normalizeEmail(value);
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}
