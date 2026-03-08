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

export interface InspectionBookedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  inspectorName: string;
  inspectionDate: string;
  inspectionLocation: string;
  transactionUrl: string;
}

export default function InspectionBooked({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  inspectorName,
  inspectionDate,
  inspectionLocation,
  transactionUrl,
}: InspectionBookedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`Inspection booked for ${vehicleTitle} — ${referenceNumber}`}>
      <Heading>Vehicle Inspection Booked</Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, the inspection for your vehicle has been scheduled.`
          : `Hi ${recipientName}, an independent inspection has been booked for this vehicle.`}
      </Subheading>

      <StatusBadge label="🔍 Inspection Scheduled" color="#3B82F6" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Inspector" value={inspectorName} />
        <InfoRow label="Date" value={inspectionDate} />
        <InfoRow label="Location" value={inspectionLocation} />
      </InfoTable>

      {isBuyer ? (
        <Paragraph>
          An independent inspector will assess the vehicle condition, engine,
          body, and interior. You'll receive the full report once complete.
          No action needed from you right now.
        </Paragraph>
      ) : (
        <Paragraph>
          Please ensure the vehicle is accessible and all documentation is
          available at the time of inspection. The buyer has been notified.
        </Paragraph>
      )}

      <Paragraph>
        The inspection report will be shared with both parties and attached to
        your transaction record on Yellow Sand.
      </Paragraph>

      <CtaButton href={transactionUrl}>Track Transaction</CtaButton>
    </BaseLayout>
  );
}
