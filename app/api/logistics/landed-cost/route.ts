import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateLandedCost } from "@/lib/utils";
import type { DestinationCountryCode } from "@/lib/constants";

const landedCostSchema = z.object({
  vehiclePriceAed: z.number().positive(),
  destinationCountry: z.enum(["NG", "GH"]),
  shippingCostAed: z.number().positive().optional(),
  // Exchange rates can be passed from frontend (from a live rate API)
  exchangeRate: z.number().positive().optional(),
});

// Mock exchange rates — replace with live API (e.g. Open Exchange Rates)
const MOCK_RATES: Record<DestinationCountryCode, number> = {
  NG: 2100,
  GH: 4.3,
};

// POST /api/logistics/landed-cost
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = landedCostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { vehiclePriceAed, destinationCountry, shippingCostAed, exchangeRate } =
    parsed.data;

  const rate = exchangeRate ?? MOCK_RATES[destinationCountry as DestinationCountryCode];

  const breakdown = calculateLandedCost(
    { vehiclePriceAed, destinationCountry: destinationCountry as DestinationCountryCode, shippingCostAed },
    rate
  );

  return NextResponse.json({ data: breakdown });
}
