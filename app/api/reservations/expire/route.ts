// GET /api/reservations/expire
//
// Releases expired reservations and frees vehicles back to "active".
// Called by Vercel Cron Job every 15 minutes (see vercel.json).
// Protected by CRON_SECRET header or query param.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const now = new Date().toISOString();

  // Find all active reservations that have expired
  const { data: expiredReservations } = await db
    .from("reservations")
    .select("id, vehicle_id, buyer_id, stripe_payment_intent_id, deposit_amount_gbp")
    .eq("status", "active")
    .lt("expires_at", now);

  if (!expiredReservations || expiredReservations.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  const vehicleIds = expiredReservations.map((r: { vehicle_id: string }) => r.vehicle_id);
  const reservationIds = expiredReservations.map((r: { id: string }) => r.id);

  // Mark reservations expired
  await db.from("reservations").update({
    status: "expired",
    updated_at: now,
  }).in("id", reservationIds);

  // Release vehicles back to active
  await db.from("vehicles").update({
    status: "active",
    updated_at: now,
  }).in("id", vehicleIds).eq("status", "reserved");

  // Notify buyers and (optionally) issue refunds via Stripe
  for (const reservation of expiredReservations as {
    id: string;
    vehicle_id: string;
    buyer_id: string;
    stripe_payment_intent_id: string | null;
    deposit_amount_gbp: number;
  }[]) {
    // Notify buyer
    await db.from("notifications").insert({
      user_id: reservation.buyer_id,
      title: "Reservation Expired",
      body: "Your 48-hour vehicle reservation has expired. The vehicle is now available to other buyers.",
      type: "reservation_expired",
      related_vehicle_id: reservation.vehicle_id,
    });

    // Issue Stripe refund for the deposit
    if (reservation.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({
          payment_intent: reservation.stripe_payment_intent_id,
          reason: "requested_by_customer",
        });
        console.log(`Refunded deposit for expired reservation ${reservation.id}`);
      } catch (err) {
        console.error(`Failed to refund reservation ${reservation.id}:`, err);
      }
    }
  }

  console.log(`Released ${expiredReservations.length} expired reservation(s)`);
  return NextResponse.json({ released: expiredReservations.length, ids: reservationIds });
}
