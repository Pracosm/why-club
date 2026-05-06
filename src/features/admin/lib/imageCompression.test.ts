import { describe, expect, it } from "vitest";
import { compressImageFileToWebp } from "./imageCompression";

describe("compressImageFileToWebp", () => {
  it("rejects non-image files before touching browser APIs", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    await expect(compressImageFileToWebp(file)).rejects.toThrow("not an image file");
  });
});
