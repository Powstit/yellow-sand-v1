import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe, toStripeAmount } from "@/lib/stripe";

const createIntentSchema = z.object({
  transaction_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createIntentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: transaction } = await db
    .from("transactions")
    .select("*, vehicle:vehicles(title), buyer:profiles!transactions_buyer_id_fkey(email, full_name)")
    .eq("id", parsed.data.transaction_id)
    .eq("buyer_id", user.id)
    .eq("status", "pending_payment")
    .single();

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found or not in pending_payment state" }, { status: 404 });
  }

  if (transaction.stripe_payment_intent_id) {
    const intent = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id);
    return NextResponse.json({ client_secret: intent.client_secret, payment_intent_id: intent.id });
  }

  const intent = await stripe.paymentIntents.create({
    amount: toStripeAmount(transaction.total_amount_aed),
    currency: "aed",
    metadata: {
      transaction_id: transaction.id,
      reference_number: transaction.reference_number,
      vehicle_id: transaction.vehicle_id,
      buyer_id: user.id,
    },
    description: `Yellow Sand: ${transaction.vehicle?.title ?? "Vehicle"} — ${transaction.reference_number}`,
    receipt_email: transaction.buyer?.email,
  });

  await db.from("transactions").update({ stripe_payment_intent_id: intent.id }).eq("id", transaction.id);

  return NextResponse.json({
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
    amount_aed: transaction.total_amount_aed,
  });
}
