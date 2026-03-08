import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertTransition,
} from "@/lib/transaction-state-machine";
import type { TransactionStatus, MilestoneType } from "@/types/database";

const completeMilestoneSchema = z.object({
  milestone_type: z.enum([
    "payment_received",
    "inspection_verified",
    "documentation_verified",
    "shipping_confirmed",
    "delivery_confirmed",
    "funds_released",
  ]),
  notes: z.string().optional(),
  document_url: z.string().url().optional(),
  tracking_number: z.string().optional(),
  estimated_delivery_date: z.string().optional(),
});

const MILESTONE_TO_STATUS: Record<MilestoneType, TransactionStatus> = {
  payment_received: "funded",
  inspection_verified: "inspection_complete",
  documentation_verified: "documentation_verified",
  shipping_confirmed: "in_transit",
  delivery_confirmed: "delivered",
  funds_released: "completed",
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: string } | null;
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = completeMilestoneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const { milestone_type, notes, document_url, tracking_number, estimated_delivery_date } = parsed.data;
  const newStatus = MILESTONE_TO_STATUS[milestone_type];
  const actor = profile.role as "buyer" | "dealer" | "admin";

  try {
    assertTransition(transaction.status as TransactionStatus, newStatus, actor);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }

  await db.from("transaction_milestones").upsert(
    { transaction_id: params.id, milestone_type, status: "completed", completed_by: user.id, completed_at: new Date().toISOString(), notes: notes ?? null, document_url: document_url ?? null },
    { onConflict: "transaction_id,milestone_type" }
  );

  const statusUpdate: Record<string, unknown> = { status: newStatus };
  if (newStatus === "funded") statusUpdate.funded_at = new Date().toISOString();
  if (newStatus === "completed") statusUpdate.completed_at = new Date().toISOString();
  if (tracking_number) statusUpdate.shipping_tracking_number = tracking_number;
  if (estimated_delivery_date) statusUpdate.estimated_delivery_date = estimated_delivery_date;

  const { data: updatedTx, error: txError } = await db.from("transactions").update(statusUpdate).eq("id", params.id).select().single();
  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  await db.from("transaction_events").insert({
    transaction_id: params.id,
    event_type: `milestone_${milestone_type}_completed`,
    actor_id: user.id,
    actor_role: actor,
    payload: { milestone_type, new_status: newStatus, notes },
  });

  const nextMilestoneMap: Partial<Record<TransactionStatus, MilestoneType>> = {
    funded: "inspection_verified",
    inspection_complete: "documentation_verified",
    documentation_verified: "shipping_confirmed",
    in_transit: "delivery_confirmed",
    delivered: "funds_released",
  };

  const nextMilestone = nextMilestoneMap[newStatus];
  if (nextMilestone) {
    await db.from("transaction_milestones").upsert(
      { transaction_id: params.id, milestone_type: nextMilestone, status: "in_progress" },
      { onConflict: "transaction_id,milestone_type" }
    );
  }

  return NextResponse.json({ data: updatedTx });
}
