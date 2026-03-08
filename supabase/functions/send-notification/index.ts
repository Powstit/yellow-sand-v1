// Supabase Edge Function: send-notification
// Triggered by: API routes, database triggers, or direct invoke
// Sends in-app notification + email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  related_transaction_id?: string;
  related_vehicle_id?: string;
  send_email?: boolean;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: NotificationPayload = await req.json();

    // Create in-app notification
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: payload.user_id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        related_transaction_id: payload.related_transaction_id ?? null,
        related_vehicle_id: payload.related_vehicle_id ?? null,
      });

    if (notifError) {
      throw new Error(`Failed to create notification: ${notifError.message}`);
    }

    // Send email if requested
    if (payload.send_email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", payload.user_id)
        .single();

      if (profile?.email) {
        // In production: integrate with Resend, SendGrid, or Supabase's built-in SMTP
        // For now, log the email that would be sent
        console.log(`[Email] To: ${profile.email} | Subject: ${payload.title}`);
        console.log(`[Email] Body: ${payload.body}`);
        // await sendEmail({ to: profile.email, subject: payload.title, html: `<p>${payload.body}</p>` });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
