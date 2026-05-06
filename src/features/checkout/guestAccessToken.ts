export const GUEST_ACCESS_TOKEN_KEY = "whyclub-guest-access-token-v1";

export function loadGuestAccessToken(storage: Storage | undefined) {
  try {
    return storage?.getItem(GUEST_ACCESS_TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveGuestAccessToken(
  storage: Storage | undefined,
  token: string | undefined,
) {
  if (!token) {
    return;
  }

  try {
    storage?.setItem(GUEST_ACCESS_TOKEN_KEY, token);
  } catch {
    // Checkout can still complete without local order-lookup persistence.
  }
}
