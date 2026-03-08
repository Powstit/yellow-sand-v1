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

export interface VehicleShippedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  trackingNumber: string;
  shippingCompany: string;
  departurePort: string;
  destinationPort: string;
  estimatedArrival: string;
  transactionUrl: string;
}

export default function VehicleShipped({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  trackingNumber,
  shippingCompany,
  departurePort,
  destinationPort,
  estimatedArrival,
  transactionUrl,
}: VehicleShippedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`🚢 ${vehicleTitle} is on its way — tracking ${trackingNumber}`}>
      <Heading>Your Vehicle Has Shipped 🚢</Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your vehicle is on its way! Here are the shipping details.`
          : `Hi ${recipientName}, the vehicle has been confirmed as shipped.`}
      </Subheading>

      <StatusBadge label="🚢 In Transit" color="#3B82F6" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Shipping Co." value={shippingCompany} />
        <InfoRow label="Tracking No." value={trackingNumber} />
        <InfoRow label="From" value={departurePort} />
        <InfoRow label="To" value={destinationPort} />
        <InfoRow label="Est. Arrival" value={estimatedArrival} />
      </InfoTable>

      {isBuyer ? (
        <>
          <Paragraph>
            Your vehicle is en route. Use the tracking number above with
            {" "}{shippingCompany} to monitor progress. You'll receive another
            notification when it arrives at the destination port.
          </Paragraph>
          <Paragraph>
            Once you receive and inspect the vehicle, confirm delivery in your
            dashboard to release the escrow funds to the dealer.
          </Paragraph>
        </>
      ) : (
        <Paragraph>
          Shipping has been confirmed and logged on the transaction. Escrow
          funds remain held until the buyer confirms safe delivery.
        </Paragraph>
      )}

      <CtaButton href={transactionUrl}>Track Transaction</CtaButton>
    </BaseLayout>
  );
}
