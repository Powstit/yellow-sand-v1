/**
 * POST /api/enquiries
 * Buyer sends a message to a dealer about a specific vehicle.
 * Stores the enquiry and emails the dealer.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEnquiryReceived, urls } from "@/lib/email";

const enquirySchema = z.object({
  vehicle_id: z.string().uuid(),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as { role: string; full_name: string | null; email: string } | null;
  if (!profile || profile.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can send enquiries" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: vehicle } = await db
    .from("vehicles")
    .select("id, title, dealer_id, dealer:dealer_profiles(id, business_name, profile:profiles(email, full_name))")
    .eq("id", parsed.data.vehicle_id)
    .eq("status", "active")
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (vehicle.dealer?.profile?.email === profile.email) {
    return NextResponse.json({ error: "You cannot enquire about your own listing" }, { status: 400 });
  }

  const { data: enquiry, error } = await db
    .from("enquiries")
    .insert({
      vehicle_id: vehicle.id,
      buyer_id: user.id,
      dealer_id: vehicle.dealer_id,
      message: parsed.data.message,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify dealer via email (non-blocking)
  const dealerEmail = vehicle.dealer?.profile?.email;
  if (dealerEmail) {
    sendEnquiryReceived(dealerEmail, {
      dealerName: vehicle.dealer.business_name,
      buyerName: profile.full_name ?? "A buyer",
      buyerEmail: profile.email,
      buyerCountry: "",
      vehicleTitle: vehicle.title,
      vehiclePrice: "",
      vehicleLocation: "",
      vehicleUrl: urls.vehicle(vehicle.id),
      message: parsed.data.message,
      dashboardUrl: urls.dealerDashboard(),
    }).catch((err: unknown) => console.error("[enquiry] Email failed:", err));
  }

  return NextResponse.json({ data: enquiry }, { status: 201 });
}
