import { Resend } from "resend";
import { render } from "@react-email/render";

// ── Client ─────────────────────────────────────────────────────────

const FROM = process.env.EMAIL_FROM ?? "Yellow Sand <noreply@yellowsand.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Type imports ───────────────────────────────────────────────────

import type { EnquiryReceivedProps } from "@/emails/enquiry-received";
import type { ReservationCreatedProps } from "@/emails/reservation-created";
import type { ReservationDepositProps } from "@/emails/reservation-deposit";
import type { InspectionBookedProps } from "@/emails/inspection-booked";
import type { InspectionPassedProps } from "@/emails/inspection-passed";
import type { EscrowFundedProps } from "@/emails/escrow-funded";
import type { VehicleShippedProps } from "@/emails/vehicle-shipped";
import type { VehicleDeliveredProps } from "@/emails/vehicle-delivered";
import type { FundsReleasedProps } from "@/emails/funds-released";

// ── Internal send helper ───────────────────────────────────────────

async function send({
  to,
  subject,
  template,
}: {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = await render(template);

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("[email] send error:", error);
    throw new Error(error.message);
  }

  return data;
}

// ── URL helpers ────────────────────────────────────────────────────

export const urls = {
  vehicle: (id: string) => `${APP_URL}/vehicles/${id}`,
  transaction: (id: string) => `${APP_URL}/transactions/${id}`,
  dealerTransaction: (id: string) => `${APP_URL}/dealer/transactions/${id}`,
  dashboard: () => `${APP_URL}/dashboard`,
  dealerDashboard: () => `${APP_URL}/dealer/dashboard`,
  reservation: (vehicleId: string) => `${APP_URL}/vehicles/${vehicleId}`,
};

// ── Public email functions ─────────────────────────────────────────

/**
 * Dealer receives notification of a new buyer enquiry.
 */
export async function sendEnquiryReceived(
  to: string,
  props: Omit<EnquiryReceivedProps, never>
) {
  const { default: Template } = await import("@/emails/enquiry-received");
  return send({
    to,
    subject: `New enquiry: ${props.vehicleTitle}`,
    template: <Template {...props} />,
  });
}

/**
 * Both buyer and dealer are notified when a reservation is created.
 */
export async function sendReservationCreated(
  to: string,
  props: ReservationCreatedProps
) {
  const { default: Template } = await import("@/emails/reservation-created");
  return send({
    to,
    subject: `Reservation confirmed — ${props.referenceNumber}`,
    template: <Template {...props} />,
  });
}

/**
 * Buyer and dealer notified when a reservation deposit is paid.
 */
export async function sendReservationDeposit(
  to: string,
  props: ReservationDepositProps
) {
  const { default: Template } = await import("@/emails/reservation-deposit");
  return send({
    to,
    subject: `Reservation deposit confirmed — ${props.vehicleTitle}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when an inspection is booked.
 */
export async function sendInspectionBooked(
  to: string,
  props: InspectionBookedProps
) {
  const { default: Template } = await import("@/emails/inspection-booked");
  return send({
    to,
    subject: `Inspection scheduled — ${props.vehicleTitle}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when the vehicle passes inspection.
 */
export async function sendInspectionPassed(
  to: string,
  props: InspectionPassedProps
) {
  const { default: Template } = await import("@/emails/inspection-passed");
  return send({
    to,
    subject: `✅ Inspection passed — ${props.vehicleTitle}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when escrow is funded (payment confirmed).
 */
export async function sendEscrowFunded(
  to: string,
  props: EscrowFundedProps
) {
  const { default: Template } = await import("@/emails/escrow-funded");
  return send({
    to,
    subject: `🔒 Payment secured in escrow — ${props.referenceNumber}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when the vehicle is shipped.
 */
export async function sendVehicleShipped(
  to: string,
  props: VehicleShippedProps
) {
  const { default: Template } = await import("@/emails/vehicle-shipped");
  return send({
    to,
    subject: `🚢 Vehicle shipped — tracking ${props.trackingNumber}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when delivery is confirmed.
 */
export async function sendVehicleDelivered(
  to: string,
  props: VehicleDeliveredProps
) {
  const { default: Template } = await import("@/emails/vehicle-delivered");
  return send({
    to,
    subject: `📦 Vehicle delivered — ${props.referenceNumber}`,
    template: <Template {...props} />,
  });
}

/**
 * Both parties notified when escrow funds are released (transaction complete).
 */
export async function sendFundsReleased(
  to: string,
  props: FundsReleasedProps
) {
  const { default: Template } = await import("@/emails/funds-released");
  return send({
    to,
    subject: `✅ Transaction complete — ${props.referenceNumber}`,
    template: <Template {...props} />,
  });
}

// ── Convenience: send to both buyer and dealer ────────────────────

export async function sendToBothParties<T extends { role: "buyer" | "dealer" }>(
  buyerEmail: string,
  dealerEmail: string,
  sendFn: (to: string, props: T) => Promise<unknown>,
  buyerProps: T,
  dealerProps: T
) {
  await Promise.allSettled([
    sendFn(buyerEmail, buyerProps),
    sendFn(dealerEmail, dealerProps),
  ]);
}
