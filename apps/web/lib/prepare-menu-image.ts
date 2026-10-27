// Bound inline photos so they fit the existing JSON request limit and free DB quota.
export const MAX_MENU_PHOTO_BYTES = 60 * 1024;

export async function prepareMenuImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP, or GIF image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    for (const edge of [512, 384, 256]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this photo.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (blob && blob.size <= MAX_MENU_PHOTO_BYTES) return new File([blob], 'menu-photo.webp', { type: blob.type });
      }
    }
    throw new Error('This photo is too large. Try a smaller image.');
  } finally { bitmap.close(); }
}
