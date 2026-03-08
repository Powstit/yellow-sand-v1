import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { trustin } from "@/lib/trustin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sendEscrowFunded,
  sendReservationDeposit,
  sendToBothParties,
  urls,
} from "@/lib/email";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use untyped admin client for webhook handler — all writes are service-role only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const transactionId = intent.metadata?.transaction_id;
      if (!transactionId) break;

      const { data: transaction } = await db
        .from("transactions")
        .select("*, vehicle:vehicles(title, price_aed), buyer:profiles!transactions_buyer_id_fkey(email, full_name), dealer:dealer_profiles(business_name, profile:profiles(email))")
        .eq("id", transactionId)
        .single();

      if (!transaction || transaction.status !== "pending_payment") break;

      let trustinEscrowId: string | null = null;
      try {
        const escrow = await trustin.createEscrow({
          transactionReference: transaction.reference_number,
          buyerEmail: transaction.buyer?.email ?? "",
          sellerEmail: transaction.dealer?.profile?.email ?? "",
          amountAed: transaction.total_amount_aed,
          description: `Yellow Sand — ${transaction.vehicle?.title ?? "Vehicle"}`,
          milestones: [
            { id: "inspection", name: "Inspection Verified", percentage: 0 },
            { id: "documentation", name: "Documentation Verified", percentage: 0 },
            { id: "shipping", name: "Shipping Confirmed", percentage: 0 },
            { id: "delivery", name: "Delivery Confirmed", percentage: 100 },
          ],
          metadata: { transaction_id: transactionId, reference: transaction.reference_number },
        });
        trustinEscrowId = escrow.id;
      } catch (err) {
        console.error("TrustIn escrow creation failed:", err);
      }

      await db.from("transactions").update({
        status: "inspection_pending",
        funded_at: new Date().toISOString(),
        stripe_charge_id: typeof intent.latest_charge === "string" ? intent.latest_charge : null,
        trustin_escrow_id: trustinEscrowId,
      }).eq("id", transactionId);

      await db.from("transaction_milestones").insert([
        { transaction_id: transactionId, milestone_type: "payment_received", status: "completed", completed_at: new Date().toISOString(), notes: `Stripe ${intent.id}` },
        { transaction_id: transactionId, milestone_type: "inspection_verified", status: "in_progress" },
      ]);

      await db.from("vehicles").update({ status: "sold" }).eq("id", transaction.vehicle_id);

      await db.from("transaction_events").insert({
        transaction_id: transactionId,
        event_type: "payment_received",
        actor_id: null,
        actor_role: "system",
        payload: { stripe_payment_intent: intent.id, trustin_escrow_id: trustinEscrowId },
      });

      await db.from("notifications").insert({
        user_id: transaction.buyer_id,
        title: "Payment Received",
        body: `Your payment for ${transaction.vehicle?.title ?? "vehicle"} has been received and held in escrow.`,
        type: "transaction_update",
        related_transaction_id: transactionId,
      });

      // Send escrow funded emails to both parties
      if (transaction.buyer?.email && transaction.dealer?.profile?.email) {
        const sharedProps = {
          referenceNumber: transaction.reference_number,
          vehicleTitle: transaction.vehicle?.title ?? "Vehicle",
          amountAed: `AED ${Number(transaction.total_amount_aed).toLocaleString()}`,
          escrowId: trustinEscrowId ?? "pending",
          nextStep: "An independent inspection of the vehicle will be arranged.",
        };
        await sendToBothParties(
          transaction.buyer.email,
          transaction.dealer.profile.email,
          sendEscrowFunded,
          { ...sharedProps, recipientName: transaction.buyer.full_name ?? "Buyer", role: "buyer", transactionUrl: urls.transaction(transactionId) },
          { ...sharedProps, recipientName: transaction.dealer.business_name, role: "dealer", transactionUrl: urls.dealerTransaction(transactionId) }
        );
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const transactionId = intent.metadata?.transaction_id;
      if (transactionId) {
        console.error(`Payment failed for transaction ${transactionId}:`, intent.last_payment_error?.message);
      }
      break;
    }

    // ── Reservation deposit: Stripe Checkout Session ────────────────────────────

    case "checkout.session.completed": {
      const session = event.data.object;
      const { reservation_id, vehicle_id, buyer_id, dealer_id } = session.metadata ?? {};

      // Only handle reservation sessions (transaction payments use PaymentIntents)
      if (!reservation_id || !vehicle_id || !buyer_id) break;
      if (session.payment_status !== "paid") break;

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      // Activate reservation
      await db.from("reservations").update({
        status: "active",
        stripe_payment_intent_id: paymentIntentId,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq("id", reservation_id).eq("status", "pending");

      // Mark vehicle as reserved (only if still active — race condition guard)
      const { data: vehicleUpdate } = await db
        .from("vehicles")
        .update({ status: "reserved", updated_at: new Date().toISOString() })
        .eq("id", vehicle_id)
        .eq("status", "active")
        .select("title, location, dealer_id")
        .single();

      if (!vehicleUpdate) {
        // Vehicle was already taken — refund and cancel reservation
        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "duplicate" });
        }
        await db.from("reservations").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", reservation_id);
        console.warn(`[checkout.session.completed] Vehicle ${vehicle_id} no longer active — refunded reservation ${reservation_id}`);
        break;
      }

      // Notify buyer
      await db.from("notifications").insert({
        user_id: buyer_id,
        title: "Vehicle Reserved",
        body: `Your reservation for ${vehicleUpdate.title} is confirmed. You have 48 hours to complete the full purchase.`,
        type: "reservation_created",
        related_vehicle_id: vehicle_id,
      });

      // Notify dealer
      if (dealer_id) {
        const { data: dealerProfile } = await db
          .from("dealer_profiles")
          .select("user_id")
          .eq("id", dealer_id)
          .single();

        if (dealerProfile) {
          await db.from("notifications").insert({
            user_id: dealerProfile.user_id,
            title: "Vehicle Reserved by Buyer",
            body: `A buyer has placed a reservation deposit on ${vehicleUpdate.title}. They have 48 hours to complete the purchase.`,
            type: "reservation_created",
            related_vehicle_id: vehicle_id,
          });
        }
      }

      // Send emails
      const { data: buyer } = await db.from("profiles").select("email, full_name").eq("id", buyer_id).single();
      const { data: dealer } = await db
        .from("dealer_profiles")
        .select("business_name, profile:profiles(email)")
        .eq("id", dealer_id ?? "")
        .single();

      const depositGbp = session.amount_total ? `£${(session.amount_total / 100).toFixed(2)}` : "£500.00";
      const expiresReadable = new Date(expiresAt).toLocaleString("en-GB", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      }) + " UTC";

      if (buyer?.email) {
        sendReservationDeposit(buyer.email, {
          recipientName: buyer.full_name ?? "Buyer",
          role: "buyer",
          vehicleTitle: vehicleUpdate.title,
          vehicleLocation: vehicleUpdate.location,
          vehicleUrl: urls.vehicle(vehicle_id),
          depositAmount: depositGbp,
          expiresAt: expiresReadable,
          dashboardUrl: urls.dashboard(),
        }).catch((err: unknown) => console.error("[email] buyer reservation deposit:", err));
      }

      const dealerEmail = (dealer as { business_name: string; profile: { email: string } } | null)?.profile?.email;
      const dealerName = (dealer as { business_name: string } | null)?.business_name ?? "Dealer";
      if (dealerEmail) {
        sendReservationDeposit(dealerEmail, {
          recipientName: dealerName,
          role: "dealer",
          vehicleTitle: vehicleUpdate.title,
          vehicleLocation: vehicleUpdate.location,
          vehicleUrl: urls.vehicle(vehicle_id),
          depositAmount: depositGbp,
          expiresAt: expiresReadable,
          dashboardUrl: urls.dealerDashboard(),
        }).catch((err: unknown) => console.error("[email] dealer reservation deposit:", err));
      }

      console.log(`Reservation ${reservation_id} activated for vehicle ${vehicle_id}`);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const { reservation_id } = session.metadata ?? {};
      if (!reservation_id) break;

      // Cancel the pending reservation — no payment was made so no refund needed
      await db.from("reservations").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", reservation_id).eq("status", "pending");

      console.log(`Reservation ${reservation_id} cancelled (checkout session expired)`);
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
