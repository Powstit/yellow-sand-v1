import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const DEPOSIT_AMOUNT_GBP = parseInt(process.env.RESERVATION_DEPOSIT_GBP ?? "500", 10);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
// GBP to AED approximate rate (update via env if needed)
const GBP_TO_AED = parseFloat(process.env.GBP_TO_AED_RATE ?? "4.68");

const checkoutSchema = z.object({
  vehicle_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, full_name, email, country").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can reserve vehicles" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { vehicle_id } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  // Load vehicle with dealer info
  const { data: vehicle } = await db
    .from("vehicles")
    .select("id, title, status, price_aed, location, dealer_id, dealer:dealer_profiles(id, business_name, profile:profiles(email, full_name))")
    .eq("id", vehicle_id)
    .single();

  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  if (vehicle.status !== "active") {
    const msg =
      vehicle.status === "reserved"
        ? "This vehicle has already been reserved by another buyer"
        : vehicle.status === "sold"
        ? "This vehicle has already been sold"
        : "This vehicle is not available for reservation";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Check the buyer doesn't already have an active/pending reservation on this vehicle
  const { data: existingReservation } = await db
    .from("reservations")
    .select("id, status")
    .eq("vehicle_id", vehicle_id)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingReservation) {
    return NextResponse.json({ error: "You already have an active reservation on this vehicle" }, { status: 409 });
  }

  const depositAmountAed = Math.round(DEPOSIT_AMOUNT_GBP * GBP_TO_AED * 100) / 100;
  const p = profile as { role: string; full_name: string | null; email: string; country: string | null };

  // Create pending reservation record first (we need the ID for Stripe metadata)
  const { data: reservation, error: reservationError } = await db
    .from("reservations")
    .insert({
      vehicle_id,
      buyer_id: user.id,
      dealer_id: vehicle.dealer_id,
      status: "pending",
      deposit_amount_gbp: DEPOSIT_AMOUNT_GBP,
      deposit_amount_aed: depositAmountAed,
    })
    .select()
    .single();

  if (reservationError || !reservation) {
    console.error("[reservations/checkout] insert error:", reservationError);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }

  // Create Stripe Checkout Session
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "gbp",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: DEPOSIT_AMOUNT_GBP * 100,   // pence
            product_data: {
              name: `Reservation Deposit — ${vehicle.title}`,
              description: `48-hour hold on ${vehicle.title} (${vehicle.location}). Deposit credited toward final purchase price.`,
            },
          },
        },
      ],
      metadata: {
        reservation_id: reservation.id,
        vehicle_id,
        buyer_id: user.id,
        dealer_id: vehicle.dealer_id,
      },
      customer_email: p.email,
      success_url: `${APP_URL}/reservations/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/vehicles/${vehicle_id}?reservation=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min session window
    });
  } catch (err) {
    console.error("[reservations/checkout] stripe error:", err);
    // Clean up the pending reservation if Stripe fails
    await db.from("reservations").delete().eq("id", reservation.id);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }

  // Attach the checkout session ID to the reservation
  await db.from("reservations").update({
    stripe_checkout_session_id: session.id,
  }).eq("id", reservation.id);

  return NextResponse.json({ url: session.url, reservation_id: reservation.id });
}
