/** Allow base64 data URIs (avatar uploads) and https:// URLs only */
export function safeImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("data:image/")) return src;
  try {
    const u = new URL(src);
    return u.protocol === "https:" ? src : null;
  } catch { return null; }
}
