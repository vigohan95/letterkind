import type { PageImage } from '../ai/types';

/**
 * Getting a picture of a letter ready for the on-device model: upright, no
 * larger than it needs to be, and in a format the model accepts. All of it
 * happens on a canvas in this browser.
 */

/** The longest side handed to the model, in pixels. A full letter page was read at this size in testing. */
export const MAX_SIDE = 1600;

export function fitWithin(width: number, height: number, maxSide: number = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

/** One page as a picture: what the model is shown, and the same picture for the reader to compare against. */
export interface PagePicture {
  image: PageImage;
  preview: Blob;
}

export async function canvasToPicture(canvas: HTMLCanvasElement): Promise<PagePicture> {
  const preview = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The picture could not be prepared.'))), 'image/jpeg', 0.92);
  });
  return { image: { mimeType: 'image/jpeg', data: await blobToBase64(preview) }, preview };
}

/** A photo or scan, turned the right way up (as the camera recorded it) and scaled down if it is very large. */
export async function photoToPicture(file: Blob): Promise<PagePicture> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The picture could not be prepared.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvasToPicture(canvas);
  } finally {
    bitmap.close();
  }
}
