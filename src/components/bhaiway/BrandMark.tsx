import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/config/constants";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md";
}

/**
 * Text wordmark until a canonical logo asset is added under public/brand.
 * Do not recreate or approximate a logo graphic.
 */
export function BrandMark({ className, showTagline = false, size = "md" }: BrandMarkProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span
        className={cn(
          "font-semibold tracking-tight text-[var(--bw-brand)]",
          size === "sm" ? "text-base" : "text-lg",
        )}
      >
        {PRODUCT_NAME}
      </span>
      {showTagline ? (
        <span className="text-xs text-[var(--bw-text-muted)]">{PRODUCT_TAGLINE}</span>
      ) : null}
    </div>
  );
}
