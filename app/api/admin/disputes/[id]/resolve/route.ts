import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { trustin } from "@/lib/trustin";

const resolveSchema = z.object({
  resolution: z.enum(["refund_buyer", "release_to_dealer", "partial_refund"]),
  resolution_notes: z.string().min(10),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: string } | null;
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: dispute } = await db
    .from("disputes")
    .select("*, transaction:transactions(*)")
    .eq("id", params.id)
    .single();

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const { resolution, resolution_notes } = parsed.data;
  const transaction = dispute.transaction as {
    id: string;
    trustin_escrow_id: string | null;
    buyer_id: string;
    dealer_id: string;
    reference_number: string;
  };

  const outcomeStatus = resolution === "refund_buyer" ? "refunded" : "completed";

  await db.from("disputes").update({
    status: resolution === "refund_buyer" ? "resolved_buyer" : "resolved_dealer",
    resolved_by: user.id,
    resolution,
    resolution_notes,
    resolved_at: new Date().toISOString(),
  }).eq("id", params.id);

  await db.from("transactions").update({
    status: outcomeStatus,
    completed_at: outcomeStatus === "completed" ? new Date().toISOString() : null,
  }).eq("id", transaction.id);

  if (transaction.trustin_escrow_id) {
    try {
      if (resolution === "refund_buyer") {
        await trustin.refund({ escrowId: transaction.trustin_escrow_id, reason: "Admin dispute: refund to buyer", notes: resolution_notes });
      } else {
        await trustin.releaseFunds({ escrowId: transaction.trustin_escrow_id, milestoneId: "delivery", notes: `Admin dispute: ${resolution}` });
      }
    } catch (err) {
      console.error("TrustIn escrow action failed during dispute resolution:", err);
    }
  }

  await db.from("transaction_events").insert({
    transaction_id: transaction.id,
    event_type: "dispute_resolved",
    actor_id: user.id,
    actor_role: "admin",
    payload: { resolution, resolution_notes },
  });

  const { data: dealerProfile } = await db.from("dealer_profiles").select("user_id").eq("id", transaction.dealer_id).single();

  const notifications = [
    { user_id: transaction.buyer_id, title: "Dispute Resolved", body: `Your dispute for ${transaction.reference_number} has been resolved: ${resolution_notes}`, type: "dispute_resolved", related_transaction_id: transaction.id },
    ...(dealerProfile ? [{ user_id: dealerProfile.user_id, title: "Dispute Resolved", body: `Dispute for ${transaction.reference_number} resolved: ${resolution_notes}`, type: "dispute_resolved", related_transaction_id: transaction.id }] : []),
  ];
  await db.from("notifications").insert(notifications);

  return NextResponse.json({ success: true, resolution, outcome: outcomeStatus });
}
