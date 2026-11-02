export function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateDifference(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export async function compressProductImage(file: File): Promise<Blob> {
  if (
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  const image = await createImageBitmap(file);
  try {
    const maxDimension = 900;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.width, image.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create a canvas to compress the image.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not encode the compressed image."));
          }
        },
        "image/webp",
        0.65,
      );
    });

    return compressed.type === "image/webp" && compressed.size < file.size
      ? compressed
      : file;
  } finally {
    image.close();
  }
}
