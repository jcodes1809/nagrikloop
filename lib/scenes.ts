import type { Category } from "./data";

export const PROBLEM_SCENE: Record<Category, string> = {
  garbage: "scene:garbage", pothole: "scene:pothole", streetlight: "scene:light", water: "scene:water", drain: "scene:drain",
};
export const FIXED_SCENE: Record<Category, string> = {
  garbage: "scene:clean", pothole: "scene:cleanroad", streetlight: "scene:litlight", water: "scene:clean", drain: "scene:clean",
};

/** Resize + re-encode any chosen photo to a small JPEG data URL (also strips anything that is not a real image). */
export async function fileToJpeg(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please choose a JPG, PNG or WebP photo.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Photo is too big. Max 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Could not read that image.")); i.src = url;
    });
    const max = 720; const r = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.72);
  } finally { URL.revokeObjectURL(url); }
}
