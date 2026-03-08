import {
  BaseLayout,
  CtaButton,
  Heading,
  InfoRow,
  InfoTable,
  Paragraph,
  StatusBadge,
  Subheading,
  VehicleCard,
} from "./components/base-layout";

export interface ReservationDepositProps {
  recipientName: string;
  role: "buyer" | "dealer";
  vehicleTitle: string;
  vehicleLocation: string;
  vehicleUrl: string;
  depositAmount: string;       // e.g. "£500.00"
  expiresAt: string;           // human-readable, e.g. "Tuesday 8 March at 14:30 UTC"
  dashboardUrl: string;
}

export default function ReservationDeposit({
  recipientName,
  role,
  vehicleTitle,
  vehicleLocation,
  vehicleUrl,
  depositAmount,
  expiresAt,
  dashboardUrl,
}: ReservationDepositProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`Reservation deposit confirmed — ${vehicleTitle}`}>
      <Heading>
        {isBuyer ? "Vehicle Reserved Successfully" : "New Reservation Deposit Received"}
      </Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your reservation deposit has been received. The vehicle is now on hold for you.`
          : `Hi ${recipientName}, a buyer has paid a reservation deposit on one of your vehicles.`}
      </Subheading>

      <StatusBadge label="✅ Deposit Confirmed" color="#10B981" />

      <VehicleCard
        title={vehicleTitle}
        price=""
        location={vehicleLocation}
        href={vehicleUrl}
      />

      <InfoTable>
        <InfoRow label="Deposit Paid" value={depositAmount} />
        <InfoRow label="Hold Expires" value={expiresAt} />
      </InfoTable>

      {isBuyer ? (
        <Paragraph>
          Your deposit of {depositAmount} secures this vehicle for 48 hours.
          Please proceed to full payment within this window. Your deposit will
          be credited toward the total purchase price.
        </Paragraph>
      ) : (
        <Paragraph>
          The vehicle has been placed on a 48-hour hold. If the buyer does not
          proceed to full payment, the vehicle will be automatically released
          back to available status.
        </Paragraph>
      )}

      <CtaButton href={dashboardUrl}>
        {isBuyer ? "Complete Purchase" : "View Dashboard"}
      </CtaButton>
    </BaseLayout>
  );
}
