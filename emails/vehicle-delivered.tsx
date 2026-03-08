import {
  BaseLayout,
  CtaButton,
  Heading,
  InfoRow,
  InfoTable,
  Paragraph,
  StatusBadge,
  Subheading,
} from "./components/base-layout";

export interface VehicleDeliveredProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  deliveryDate: string;
  transactionUrl: string;
}

export default function VehicleDelivered({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  deliveryDate,
  transactionUrl,
}: VehicleDeliveredProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`📦 ${vehicleTitle} has been delivered — action required`}>
      <Heading>
        {isBuyer ? "Your Vehicle Has Arrived! 🎉" : "Delivery Confirmed"}
      </Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your vehicle has arrived at the destination port. Please confirm receipt to release funds.`
          : `Hi ${recipientName}, the buyer has confirmed delivery of the vehicle.`}
      </Subheading>

      <StatusBadge label="📦 Delivered" color="#8B5CF6" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Delivered On" value={deliveryDate} />
      </InfoTable>

      {isBuyer ? (
        <>
          <Paragraph>
            Please inspect the vehicle carefully. If everything matches the
            listing and inspection report, confirm delivery in your dashboard
            to release the payment to the dealer.
          </Paragraph>
          <Paragraph>
            <strong style={{ color: "#F59E0B" }}>
              Action required within 48 hours:
            </strong>{" "}
            If we don't hear from you, escrow will be automatically released
            after 48 hours per our buyer protection policy.
          </Paragraph>
          <Paragraph>
            If there's an issue with the vehicle, raise a dispute before
            confirming delivery.
          </Paragraph>
        </>
      ) : (
        <Paragraph>
          The buyer has confirmed receipt. Escrow funds will be released to
          your account shortly. You'll receive a final confirmation once the
          transfer is processed.
        </Paragraph>
      )}

      <CtaButton href={transactionUrl}>
        {isBuyer ? "Confirm Delivery & Release Funds" : "View Transaction"}
      </CtaButton>
    </BaseLayout>
  );
}
