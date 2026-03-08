import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculatePlatformFee } from "@/lib/stripe";
import { DESTINATION_COUNTRIES, type DestinationCountryCode } from "@/lib/constants";

const createTransactionSchema = z.object({
  vehicle_id: z.string().uuid(),
  destination_country: z.enum(["NG", "GH"]),
  destination_port: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: string } | null;
  if (!profile || profile.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can create transactions" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { vehicle_id, destination_country, destination_port, notes } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: vehicle } = await db
    .from("vehicles")
    .select("*, dealer:dealer_profiles(id, user_id)")
    .eq("id", vehicle_id)
    .in("status", ["active", "reserved"])
    .single();

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found or not available" }, { status: 404 });

  // If vehicle is reserved, only the buyer who holds the reservation may proceed
  if (vehicle.status === "reserved") {
    const { data: reservation } = await db
      .from("reservations")
      .select("id")
      .eq("vehicle_id", vehicle_id)
      .eq("buyer_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "This vehicle is currently reserved by another buyer" }, { status: 409 });
    }
  }

  if (vehicle.dealer?.user_id === user.id) {
    return NextResponse.json({ error: "You cannot purchase your own listing" }, { status: 400 });
  }

  const { data: existingTx } = await db
    .from("transactions")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("vehicle_id", vehicle_id)
    .not("status", "in", '("completed","cancelled","refunded")')
    .single();

  if (existingTx) {
    return NextResponse.json({ error: "You already have an active transaction for this vehicle" }, { status: 409 });
  }

  const countryConfig = DESTINATION_COUNTRIES[destination_country as DestinationCountryCode];
  const platformFeeAed = calculatePlatformFee(vehicle.price_aed);
  const totalAmountAed = vehicle.price_aed + platformFeeAed;

  const { data: transaction, error } = await db
    .from("transactions")
    .insert({
      vehicle_id,
      buyer_id: user.id,
      dealer_id: vehicle.dealer.id,
      status: "pending_payment",
      vehicle_price_aed: vehicle.price_aed,
      platform_fee_aed: platformFeeAed,
      total_amount_aed: totalAmountAed,
      buyer_currency: countryConfig.currency,
      destination_country,
      destination_port: destination_port ?? countryConfig.defaultPort,
      notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("transaction_events").insert({
    transaction_id: transaction.id,
    event_type: "transaction_created",
    actor_id: user.id,
    actor_role: "buyer",
    payload: { vehicle_id, vehicle_price_aed: vehicle.price_aed, destination_country },
  });

  // Mark any active reservation as converted
  await db.from("reservations").update({ status: "converted", updated_at: new Date().toISOString() })
    .eq("vehicle_id", vehicle_id)
    .eq("buyer_id", user.id)
    .eq("status", "active");

  return NextResponse.json({ data: transaction }, { status: 201 });
}
