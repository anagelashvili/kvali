import "server-only";
import sharp from "sharp";
import { HttpError } from "@/lib/http";

const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export type Processed = { data: Buffer; width: number; height: number };

/**
 * Re-encodes an upload as WebP: applies EXIF rotation, fits it inside `max`
 * pixels and drops all metadata (including GPS) — sharp strips it by default.
 */
export async function toWebp(input: Buffer, max: number, quality = 82): Promise<Processed> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new HttpError(422, "File is not a readable image");
  }
  // sharp reports AVIF as "heif"; real HEIC files fail to decode below and get the same 422
  if (!format || !ACCEPTED.has(format)) throw new HttpError(422, "Unsupported image format");

  try {
    const { data, info } = await sharp(input, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new HttpError(422, "Could not process this image; try a JPEG or PNG");
  }
}

/** Square crop for avatars. */
export async function toAvatar(input: Buffer): Promise<Buffer> {
  await toWebp(input, 16); // validates the format
  return sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize(400, 400, { fit: "cover", position: "attention" })
    .webp({ quality: 85 })
    .toBuffer();
}
