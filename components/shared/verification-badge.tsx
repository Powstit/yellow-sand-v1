import { ShieldCheck, Clock, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationStatus = "unverified" | "kyc_pending" | "verified" | "suspended";

interface VerificationBadgeProps {
  status: VerificationStatus;
  /** "sm" = inline badge (listings, cards), "lg" = prominent display (profile, verify page) */
  size?: "sm" | "lg";
  className?: string;
}

export function VerificationBadge({ status, size = "sm", className }: VerificationBadgeProps) {
  if (status === "verified") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold text-emerald-400",
          size === "lg" ? "text-sm gap-1.5" : "text-[10px] gap-1",
          className
        )}
      >
        <ShieldCheck className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
        Verified Dealer
      </span>
    );
  }

  if (status === "kyc_pending") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium text-yellow-400",
          size === "lg" ? "text-sm gap-1.5" : "text-[10px] gap-1",
          className
        )}
      >
        <Clock className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
        Verification Pending
      </span>
    );
  }

  if (status === "suspended") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium text-red-400",
          size === "lg" ? "text-sm gap-1.5" : "text-[10px] gap-1",
          className
        )}
      >
        <ShieldOff className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
        Suspended
      </span>
    );
  }

  // unverified — show nothing on public surfaces, only in dealer-facing UI
  if (size === "lg") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground",
          className
        )}
      >
        <ShieldOff className="h-4 w-4" />
        Not Verified
      </span>
    );
  }

  return null;
}
