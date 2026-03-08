import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLATFORM_FEE_PERCENT =
  parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? "2.5") / 100;

/**
 * Calculate the platform fee in AED (as minor units for Stripe = fils).
 * AED uses 2 decimal places, so multiply by 100.
 */
export function calculatePlatformFee(vehiclePriceAed: number): number {
  return Math.round(vehiclePriceAed * PLATFORM_FEE_PERCENT * 100) / 100;
}

/**
 * Convert AED amount to Stripe minor units (fils).
 */
export function toStripeAmount(aed: number): number {
  return Math.round(aed * 100);
}
