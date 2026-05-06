import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const imagesDir = path.join(process.cwd(), "public", "images");
const sourceExtensions = new Set([".jpg", ".jpeg", ".png"]);

const entries = await readdir(imagesDir, { withFileTypes: true });

await Promise.all(
  entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => {
      const extension = path.extname(entry.name).toLowerCase();
      if (!sourceExtensions.has(extension)) {
        return;
      }

      const sourcePath = path.join(imagesDir, entry.name);
      const outputPath = path.join(imagesDir, `${path.basename(entry.name, extension)}.webp`);

      await sharp(sourcePath)
        .rotate()
        .webp({ quality: 82, effort: 6 })
        .toFile(outputPath);
    }),
);
