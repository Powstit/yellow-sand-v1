/**
 * POST /api/email/send
 * Internal endpoint for sending transactional emails.
 * Only callable server-side (requires RESEND_API_KEY).
 *
 * Body: { event: EmailEvent; to: string; payload: object }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export type EmailEvent =
  | "enquiry_received"
  | "reservation_created"
  | "inspection_booked"
  | "inspection_passed"
  | "escrow_funded"
  | "vehicle_shipped"
  | "vehicle_delivered"
  | "funds_released";

export async function POST(request: NextRequest) {
  // Verify this is an internal call via shared secret
  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json() as {
    event: EmailEvent;
    to: string;
    payload: Record<string, unknown>;
  };

  const { event, to, payload } = body;

  if (!event || !to || !payload) {
    return NextResponse.json({ error: "Missing event, to, or payload" }, { status: 400 });
  }

  try {
    // Dynamic import keeps email templates out of the main bundle
    const emailLib = await import("@/lib/email");

    switch (event) {
      case "enquiry_received":
        await emailLib.sendEnquiryReceived(to, payload as unknown as Parameters<typeof emailLib.sendEnquiryReceived>[1]);
        break;
      case "reservation_created":
        await emailLib.sendReservationCreated(to, payload as unknown as Parameters<typeof emailLib.sendReservationCreated>[1]);
        break;
      case "inspection_booked":
        await emailLib.sendInspectionBooked(to, payload as unknown as Parameters<typeof emailLib.sendInspectionBooked>[1]);
        break;
      case "inspection_passed":
        await emailLib.sendInspectionPassed(to, payload as unknown as Parameters<typeof emailLib.sendInspectionPassed>[1]);
        break;
      case "escrow_funded":
        await emailLib.sendEscrowFunded(to, payload as unknown as Parameters<typeof emailLib.sendEscrowFunded>[1]);
        break;
      case "vehicle_shipped":
        await emailLib.sendVehicleShipped(to, payload as unknown as Parameters<typeof emailLib.sendVehicleShipped>[1]);
        break;
      case "vehicle_delivered":
        await emailLib.sendVehicleDelivered(to, payload as unknown as Parameters<typeof emailLib.sendVehicleDelivered>[1]);
        break;
      case "funds_released":
        await emailLib.sendFundsReleased(to, payload as unknown as Parameters<typeof emailLib.sendFundsReleased>[1]);
        break;
      default:
        return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
    }

    return NextResponse.json({ sent: true, event, to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[email/send] ${event} → ${to}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
