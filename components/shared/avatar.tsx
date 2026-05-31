import { cn } from "@/lib/utils";

type Props = {
  name: string;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  xs: "w-5 h-5 text-[7px]",
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-[11px]",
  lg: "w-10 h-10 text-[13px]",
};

function isSafeImageSrc(src: string): boolean {
  // Allow base64 data URLs (from avatar upload) and https URLs only
  if (src.startsWith("data:image/")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:";
  } catch { return false; }
}

export function Avatar({ name, image, size = "md", className }: Props) {
  const initials = name.slice(0, 2).toUpperCase();
  const safeSrc = image && isSafeImageSrc(image) ? image : null;
  return (
    <div className={cn("rounded-full overflow-hidden flex-shrink-0 bg-brand-subtle border border-brand-muted flex items-center justify-center", SIZE[size], className)}>
      {safeSrc ? (
        <img src={safeSrc} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-brand leading-none">{initials}</span>
      )}
    </div>
  );
}
