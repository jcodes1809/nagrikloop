import { createHash } from "node:crypto";
import { cfg } from "./config";
import { HttpError } from "./errors";

const MAX_BYTES = 4_000_000; // Vercel request limit is ~4.5MB, so resize photos client-side

export type LoadedImage = { bytes: Buffer; mime: string; b64: string };

export const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

function sniff(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function finish(bytes: Buffer): LoadedImage {
  if (!bytes.length) throw new HttpError(400, "Empty image");
  if (bytes.length > MAX_BYTES) throw new HttpError(413, "Image too large. Resize to under 4MB (about 1280px wide).");
  const mime = sniff(bytes);
  if (!mime) throw new HttpError(415, "Unsupported image type. Use JPEG, PNG or WebP.");
  return { bytes, mime, b64: bytes.toString("base64") };
}

export async function loadImage(i: { image_base64?: string; image_url?: string }): Promise<LoadedImage> {
  if (typeof i.image_base64 === "string" && i.image_base64.trim()) {
    let s = i.image_base64.trim();
    const m = s.match(/^data:[^;]+;base64,([\s\S]*)$/);
    if (m) s = m[1];
    return finish(Buffer.from(s, "base64"));
  }
  if (typeof i.image_url === "string" && i.image_url.trim()) {
    let u: URL;
    try {
      u = new URL(i.image_url);
    } catch {
      throw new HttpError(400, "image_url is not a valid URL");
    }
    if (u.protocol !== "https:") throw new HttpError(400, "image_url must be https");
    const allowed = cfg().allowedImageHosts;
    if (allowed.length && !allowed.some((h) => u.hostname === h || u.hostname.endsWith("." + h)))
      throw new HttpError(400, "image_url host not allowed");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), cfg().timeoutMs);
    try {
      const res = await fetch(u, { signal: ctl.signal });
      if (!res.ok) throw new HttpError(400, `Could not download image (HTTP ${res.status})`);
      const buf = Buffer.from(await res.arrayBuffer());
      return finish(buf);
    } catch (e: any) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, "Could not download image");
    } finally {
      clearTimeout(t);
    }
  }
  throw new HttpError(400, "Send image_base64 or image_url");
}
