import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const replySchema = z.object({
  reply: z.string().min(10),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "dealer") {
    return NextResponse.json({ error: "Only dealers can reply to enquiries" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Reply must be at least 10 characters" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: enquiry } = await db
    .from("enquiries")
    .select("id, dealer_id, buyer:profiles!enquiries_buyer_id_fkey(email, full_name), vehicle:vehicles(title)")
    .eq("id", params.id)
    .single();

  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

  // Verify this dealer owns the enquiry
  const { data: dealerProfile } = await db
    .from("dealer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dealerProfile || dealerProfile.id !== enquiry.dealer_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.from("enquiries").update({ status: "replied", reply: parsed.data.reply, replied_at: new Date().toISOString() }).eq("id", params.id);

  return NextResponse.json({ data: { success: true } });
}
