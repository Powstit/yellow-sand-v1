// Supabase Edge Function: release-escrow
// Handles automatic 48-hour delivery confirmation + fund release
// Called by: pg_cron job or direct HTTP trigger

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const TRUSTIN_API_URL = Deno.env.get("TRUSTIN_API_URL") ?? "https://api.trustin.com/v1";
  const TRUSTIN_API_KEY = Deno.env.get("TRUSTIN_API_KEY") ?? "";

  // Find transactions in 'delivered' state for more than 48 hours
  const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, reference_number, trustin_escrow_id, buyer_id, dealer_id")
    .eq("status", "delivered")
    .lt("updated_at", cutoffTime);

  if (!transactions || transactions.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, message: "No transactions ready for auto-release" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const tx of transactions) {
    try {
      // Release TrustIn escrow
      if (tx.trustin_escrow_id) {
        const response = await fetch(
          `${TRUSTIN_API_URL}/escrows/${tx.trustin_escrow_id}/release`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TRUSTIN_API_KEY}`,
            },
            body: JSON.stringify({
              milestone_id: "delivery",
              notes: "Auto-released after 48h delivery confirmation timeout",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`TrustIn release failed: ${response.status}`);
        }
      }

      // Update transaction to completed
      await supabase
        .from("transactions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      // Complete milestones
      await supabase.from("transaction_milestones").upsert(
        [
          {
            transaction_id: tx.id,
            milestone_type: "delivery_confirmed",
            status: "completed",
            completed_at: new Date().toISOString(),
            notes: "Auto-confirmed after 48h timeout",
          },
          {
            transaction_id: tx.id,
            milestone_type: "funds_released",
            status: "completed",
            completed_at: new Date().toISOString(),
            notes: "Auto-released after 48h timeout",
          },
        ],
        { onConflict: "transaction_id,milestone_type" }
      );

      // Audit event
      await supabase.from("transaction_events").insert({
        transaction_id: tx.id,
        event_type: "auto_completion_48h",
        actor_id: null,
        actor_role: "system",
        payload: { reason: "48h delivery confirmation timeout" },
      });

      // Notify buyer + dealer
      const { data: dealerProfile } = await supabase
        .from("dealer_profiles")
        .select("user_id")
        .eq("id", tx.dealer_id)
        .single();

      await supabase.from("notifications").insert([
        {
          user_id: tx.buyer_id,
          title: "Transaction Completed",
          body: `Transaction ${tx.reference_number} was automatically completed after 48 hours.`,
          type: "transaction_update",
          related_transaction_id: tx.id,
        },
        ...(dealerProfile
          ? [
              {
                user_id: dealerProfile.user_id,
                title: "Funds Released",
                body: `Funds for transaction ${tx.reference_number} have been released to your account.`,
                type: "transaction_update" as const,
                related_transaction_id: tx.id,
              },
            ]
          : []),
      ]);

      results.push({ id: tx.id, success: true });
    } catch (err) {
      console.error(`Failed to auto-release transaction ${tx.id}:`, err);
      results.push({
        id: tx.id,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  return new Response(
    JSON.stringify({
      processed: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
