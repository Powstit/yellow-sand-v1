import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { trustin } from "@/lib/trustin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-trustin-signature") ?? "";

  // Verify webhook signature (reads TRUSTIN_WEBHOOK_SECRET from env internally)
  const isValid = await trustin.verifyWebhook(body, signature);
  if (!isValid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  switch (event.type) {
    case "escrow.funds_released": {
      const escrowId = event.data.escrow_id as string;
      if (!escrowId) break;

      await db
        .from("transactions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("escrow_id", escrowId)
        .neq("status", "completed");

      console.log(`Escrow ${escrowId} funds released → transaction completed`);
      break;
    }

    case "escrow.refunded": {
      const escrowId = event.data.escrow_id as string;
      if (!escrowId) break;

      await db
        .from("transactions")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("escrow_id", escrowId)
        .neq("status", "refunded");

      console.log(`Escrow ${escrowId} refunded`);
      break;
    }

    case "escrow.disputed": {
      const escrowId = event.data.escrow_id as string;
      if (!escrowId) break;

      await db
        .from("transactions")
        .update({ status: "disputed", updated_at: new Date().toISOString() })
        .eq("escrow_id", escrowId);

      console.log(`Escrow ${escrowId} disputed`);
      break;
    }

    // ── KYC Events ─────────────────────────────────────────────────────────────

    case "kyc.approved": {
      const kycId = event.data.kyc_session_id as string;
      if (!kycId) break;

      const { data: rawDealer } = await db
        .from("dealer_profiles")
        .select("id, user_id, business_name")
        .eq("trustin_kyc_id", kycId)
        .single();

      if (!rawDealer) {
        console.error(`[kyc.approved] No dealer found for kyc_session_id ${kycId}`);
        break;
      }

      const dealer = rawDealer as { id: string; user_id: string; business_name: string };

      await db.from("dealer_profiles").update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", dealer.id);

      await db.from("notifications").insert({
        user_id: dealer.user_id,
        title: "Verification Approved",
        body: "Your dealer account has been verified. You can now create listings.",
        type: "dealer_approved",
      });

      console.log(`Dealer ${dealer.id} (${dealer.business_name}) KYC approved`);
      break;
    }

    case "kyc.rejected": {
      const kycId = event.data.kyc_session_id as string;
      const rejectionReason = (event.data.rejection_reason as string | undefined) ?? null;
      if (!kycId) break;

      const { data: rawDealer } = await db
        .from("dealer_profiles")
        .select("id, user_id")
        .eq("trustin_kyc_id", kycId)
        .single();

      if (!rawDealer) break;

      const dealer = rawDealer as { id: string; user_id: string };

      // Reset to unverified so dealer can re-attempt
      await db.from("dealer_profiles").update({
        verification_status: "unverified",
        rejection_reason: rejectionReason,
        trustin_kyc_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", dealer.id);

      await db.from("notifications").insert({
        user_id: dealer.user_id,
        title: "Verification Unsuccessful",
        body: rejectionReason
          ? `Your verification could not be completed: ${rejectionReason}. Please try again.`
          : "Your verification could not be completed. Please review your documents and try again.",
        type: "general",
      });

      console.log(`Dealer ${dealer.id} KYC rejected: ${rejectionReason}`);
      break;
    }

    case "kyc.pending": {
      // TrustIn is still processing — status already set to kyc_pending in /api/dealer/kyc/start
      const kycId = event.data.kyc_session_id as string;
      console.log(`KYC session ${kycId} still pending`);
      break;
    }

    default:
      // Log unhandled event types for debugging
      console.log(`Unhandled TrustIn event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
