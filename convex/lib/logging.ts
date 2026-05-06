type LogMetadata = Record<string, string | number | boolean | null | undefined>;

function sanitize(metadata: LogMetadata | undefined) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !/(secret|signature|otp|token|password)/i.test(key))
      .filter(([, value]) => value !== undefined),
  );
}

export function logInfo(event: string, metadata?: LogMetadata) {
  console.info(`[whyclub] ${event}`, sanitize(metadata));
}

export function logWarn(event: string, metadata?: LogMetadata) {
  console.warn(`[whyclub] ${event}`, sanitize(metadata));
}

export function logError(event: string, error: unknown, metadata?: LogMetadata) {
  console.error(`[whyclub] ${event}`, {
    ...sanitize(metadata),
    error: error instanceof Error ? error.message : String(error),
  });
}
