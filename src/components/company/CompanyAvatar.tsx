import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/company";
import { resolveMediaUrl } from "@/lib/media";

interface CompanyAvatarProps {
  logoUrl?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Square with rounded corners (default) or fully round. */
  shape?: "rounded" | "circle";
}

const SIZE_CLASSES: Record<NonNullable<CompanyAvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-xl",
};

/**
 * Company logo with a graceful fallback (initials, then a building icon).
 * Used everywhere a company identity is shown: list rows, detail header,
 * dashboard header, topbar identity area.
 */
export function CompanyAvatar({ logoUrl, name, size = "md", className, shape = "rounded" }: CompanyAvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(logoUrl);
  const showImage = !!src && !failed;
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border bg-muted font-bold text-muted-foreground",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        SIZE_CLASSES[size],
        className
      )}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : initials !== "?" ? (
        <span dir="auto">{initials}</span>
      ) : (
        <Building2 className="h-1/2 w-1/2" />
      )}
    </div>
  );
}
