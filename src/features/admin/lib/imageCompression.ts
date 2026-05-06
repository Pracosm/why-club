export async function compressImageFileToWebp(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image file.`);
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };
    img.src = objectUrl;
  });

  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Browser image conversion is unavailable.");
  }

  context.drawImage(image, 0, 0, width, height);

  return await new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Could not convert ${file.name} to WebP.`));
          return;
        }

        if (blob.size > 900_000) {
          reject(new Error(`${file.name} is still too large after WebP conversion.`));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Could not encode ${file.name}.`));
        reader.readAsDataURL(blob);
      },
      "image/webp",
      0.82,
    );
  });
}
