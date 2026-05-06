import { describe, expect, it, vi } from "vitest";
import {
  GUEST_ACCESS_TOKEN_KEY,
  loadGuestAccessToken,
  saveGuestAccessToken,
} from "./guestAccessToken";

describe("guest access token storage", () => {
  it("returns undefined when storage throws while loading", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage unavailable");
      }),
    } as unknown as Storage;

    expect(loadGuestAccessToken(storage)).toBeUndefined();
  });

  it("does not write when token is undefined", () => {
    const storage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    saveGuestAccessToken(storage, undefined);

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("writes the token when provided", () => {
    const storage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    saveGuestAccessToken(storage, "guest-token");

    expect(storage.setItem).toHaveBeenCalledWith(
      GUEST_ACCESS_TOKEN_KEY,
      "guest-token",
    );
  });
});
