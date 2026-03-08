/**
 * POST /api/dealer/kyc/start
 *
 * Initiates TrustIn KYC onboarding for the authenticated dealer.
 * - Dealer must be in `unverified` status
 * - Calls TrustIn to create a KYC session
 * - Stores the session ID and sets status → `kyc_pending`
 * - Returns { redirect_url } — client should navigate to this URL
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { trustin } from "@/lib/trustin";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load dealer profile
  const { data: rawDealer } = await supabase
    .from("dealer_profiles")
    .select("id, verification_status, business_name, trade_license_number")
    .eq("user_id", user.id)
    .single();

  const dealer = rawDealer as {
    id: string;
    verification_status: string;
    business_name: string;
    trade_license_number: string | null;
  } | null;

  if (!dealer) {
    return NextResponse.json({ error: "Dealer profile not found" }, { status: 404 });
  }

  if (dealer.verification_status === "verified") {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  if (dealer.verification_status === "kyc_pending") {
    return NextResponse.json({ error: "Verification already in progress" }, { status: 400 });
  }

  if (dealer.verification_status === "suspended") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  // Load dealer email from profile
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as { email: string } | null;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let kycSession;
  try {
    kycSession = await trustin.startKyc({
      dealerProfileId: dealer.id,
      email: profile.email,
      businessName: dealer.business_name,
      tradeLicenseNumber: dealer.trade_license_number,
      redirectUrl: `${appUrl}/dealer/verify?kyc=complete`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TrustIn error";
    console.error("[kyc/start] TrustIn error:", message);
    return NextResponse.json({ error: "Failed to initiate verification. Try again." }, { status: 502 });
  }

  // Persist KYC session ID + update status → kyc_pending
  const db = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => {
      update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<void> };
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .from("dealer_profiles")
    .update({
      trustin_kyc_id: kycSession.id,
      verification_status: "kyc_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealer.id);

  return NextResponse.json({ redirect_url: kycSession.url });
}
