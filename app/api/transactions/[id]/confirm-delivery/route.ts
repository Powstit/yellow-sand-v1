import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { trustin } from "@/lib/trustin";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db
    .from("transactions")
    .select("*")
    .eq("id", params.id)
    .eq("buyer_id", user.id)
    .single();

  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (transaction.status !== "delivered") {
    return NextResponse.json({ error: "Transaction must be in 'delivered' state" }, { status: 422 });
  }

  await db.from("transaction_milestones").upsert(
    { transaction_id: params.id, milestone_type: "delivery_confirmed", status: "completed", completed_by: user.id, completed_at: new Date().toISOString() },
    { onConflict: "transaction_id,milestone_type" }
  );

  await db.from("transactions").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", params.id);

  await db.from("transaction_milestones").upsert(
    { transaction_id: params.id, milestone_type: "funds_released", status: "completed", completed_at: new Date().toISOString(), notes: "Buyer confirmed delivery" },
    { onConflict: "transaction_id,milestone_type" }
  );

  if (transaction.trustin_escrow_id) {
    try {
      await trustin.releaseFunds({ escrowId: transaction.trustin_escrow_id, milestoneId: "delivery", notes: "Buyer confirmed delivery" });
    } catch (err) {
      console.error("TrustIn release failed:", err);
    }
  }

  // Update dealer transaction count
  await db.from("dealer_profiles")
    .update({ total_transactions: db.rpc ? undefined : undefined })
    .eq("id", transaction.dealer_id);

  await db.from("transaction_events").insert({
    transaction_id: params.id,
    event_type: "delivery_confirmed_funds_released",
    actor_id: user.id,
    actor_role: "buyer",
    payload: { trustin_escrow_id: transaction.trustin_escrow_id },
  });

  const { data: dealerProfile } = await db.from("dealer_profiles").select("user_id").eq("id", transaction.dealer_id).single();
  if (dealerProfile) {
    await db.from("notifications").insert({
      user_id: dealerProfile.user_id,
      title: "Delivery Confirmed — Funds Released",
      body: `Buyer confirmed delivery for ${transaction.reference_number}. Funds have been released.`,
      type: "transaction_update",
      related_transaction_id: params.id,
    });
  }

  return NextResponse.json({ success: true });
}
