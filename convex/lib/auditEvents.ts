export type AuditMetadataValue = string | number | boolean | null;
export type AuditMetadata = Record<string, AuditMetadataValue>;

export function sanitizeAuditMetadata(
  metadata: AuditMetadata | undefined,
): AuditMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata).filter(
    ([key]) => !/(secret|signature|otp|token|password)/i.test(key),
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
