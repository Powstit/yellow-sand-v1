import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { canBeDisputed } from "@/lib/transaction-state-machine";
import type { TransactionStatus } from "@/types/database";

const disputeSchema = z.object({
  reason: z.enum(["vehicle_not_as_described", "not_received", "documentation_issue", "shipping_delay", "damage", "other"]),
  description: z.string().min(20, "Please provide at least 20 characters"),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: string } | null;
  if (!profile || profile.role !== "buyer") return NextResponse.json({ error: "Only buyers can open disputes" }, { status: 403 });

  const body = await request.json();
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db.from("transactions").select("id, status, buyer_id").eq("id", params.id).eq("buyer_id", user.id).single();
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (!canBeDisputed(transaction.status as TransactionStatus)) {
    return NextResponse.json({ error: `Cannot dispute transaction in status: ${transaction.status}` }, { status: 422 });
  }

  const { data: existingDispute } = await db.from("disputes").select("id").eq("transaction_id", params.id).single();
  if (existingDispute) return NextResponse.json({ error: "A dispute already exists" }, { status: 409 });

  const { data: dispute, error: disputeError } = await db.from("disputes").insert({
    transaction_id: params.id,
    raised_by: user.id,
    reason: parsed.data.reason,
    description: parsed.data.description,
    status: "open",
  }).select().single();

  if (disputeError) return NextResponse.json({ error: disputeError.message }, { status: 500 });

  await db.from("transactions").update({ status: "disputed" }).eq("id", params.id);

  await db.from("transaction_events").insert({
    transaction_id: params.id,
    event_type: "dispute_opened",
    actor_id: user.id,
    actor_role: "buyer",
    payload: { dispute_id: dispute?.id, reason: parsed.data.reason },
  });

  return NextResponse.json({ data: dispute }, { status: 201 });
}
