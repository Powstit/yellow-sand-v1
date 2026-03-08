import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DESTINATION_COUNTRIES,
  DEFAULT_SHIPPING_COST_AED,
  INSURANCE_PERCENT,
  PLATFORM_FEE_PERCENT,
  type DestinationCountryCode,
} from "./constants";
import type { LandedCostInput, LandedCostBreakdown } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAed(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatMileage(km: number): string {
  if (km >= 1000) {
    return `${Math.round(km / 1000)}k km`;
  }
  return `${km} km`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diff = (new Date(dateString).getTime() - Date.now()) / 1000;
  const absDiff = Math.abs(diff);
  if (absDiff < 60) return rtf.format(Math.round(diff), "second");
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / 2592000), "month");
}

/**
 * Calculate full landed cost for a vehicle purchase.
 * Exchange rates should be fetched from a live API in production.
 */
export function calculateLandedCost(
  input: LandedCostInput,
  exchangeRate: number
): LandedCostBreakdown {
  const country = DESTINATION_COUNTRIES[input.destinationCountry];
  const shippingCostAed = input.shippingCostAed ?? DEFAULT_SHIPPING_COST_AED;
  const insuranceAed = input.vehiclePriceAed * INSURANCE_PERCENT;

  // CIF = Cost + Insurance + Freight
  const cifAed = input.vehiclePriceAed + insuranceAed + shippingCostAed;

  const importDutyAed = cifAed * (country.importDutyPercent / 100);
  const levyAed = cifAed * (country.levyPercent / 100);
  const vatableBase = cifAed + importDutyAed + levyAed;
  const vatAed = vatableBase * (country.vatPercent / 100);
  const portChargesAed = country.portChargesAed;
  const platformFeeAed = input.vehiclePriceAed * PLATFORM_FEE_PERCENT;

  const totalAed =
    input.vehiclePriceAed +
    shippingCostAed +
    importDutyAed +
    vatAed +
    levyAed +
    portChargesAed +
    platformFeeAed;

  return {
    vehiclePriceAed: input.vehiclePriceAed,
    shippingCostAed,
    cifAed,
    importDutyPercent: country.importDutyPercent,
    importDutyAed,
    vatPercent: country.vatPercent,
    vatAed,
    levyAed,
    portChargesAed,
    platformFeeAed,
    totalAed,
    exchangeRate,
    totalBuyerCurrency: totalAed * exchangeRate,
    buyerCurrency: country.currency as "NGN" | "GHS",
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
