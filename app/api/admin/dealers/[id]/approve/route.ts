import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: string } | null;
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { action, rejection_reason } = parsed.data;
  const isApproving = action === "approve";

  const updatePayload: Record<string, unknown> = {
    verification_status: isApproving ? "verified" : "unverified",
    rejection_reason: isApproving ? null : (rejection_reason ?? "Does not meet requirements"),
  };
  if (isApproving) {
    updatePayload.verified_at = new Date().toISOString();
    updatePayload.verified_by = user.id;
  }

  const { data: dealerProfile, error } = await db
    .from("dealer_profiles")
    .update(updatePayload)
    .eq("id", params.id)
    .select("user_id, business_name")
    .single();

  if (error || !dealerProfile) {
    return NextResponse.json({ error: error?.message ?? "Dealer not found" }, { status: 404 });
  }

  await db.from("notifications").insert({
    user_id: dealerProfile.user_id,
    title: isApproving ? "Dealer Account Approved" : "Dealer Application Status",
    body: isApproving
      ? `Congratulations! Your dealer account for ${dealerProfile.business_name} has been approved.`
      : `Your dealer application was not approved. Reason: ${rejection_reason ?? "Does not meet requirements"}`,
    type: "dealer_approved",
  });

  return NextResponse.json({ success: true, action, dealer_id: params.id });
}
