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

export interface InspectionPassedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  inspectorName: string;
  inspectionDate: string;
  engineCondition: string;
  bodyCondition: string;
  interiorCondition: string;
  notes?: string;
  transactionUrl: string;
}

export default function InspectionPassed({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  inspectorName,
  inspectionDate,
  engineCondition,
  bodyCondition,
  interiorCondition,
  notes,
  transactionUrl,
}: InspectionPassedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`✅ Inspection passed — ${vehicleTitle}`}>
      <Heading>Inspection Passed ✅</Heading>
      <Subheading>
        {isBuyer
          ? `Great news ${recipientName}! Your vehicle has passed independent inspection.`
          : `Hi ${recipientName}, the vehicle inspection has been completed successfully.`}
      </Subheading>

      <StatusBadge label="✅ Inspection Passed" color="#10B981" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Inspector" value={inspectorName} />
        <InfoRow label="Date" value={inspectionDate} />
        <InfoRow label="Engine" value={engineCondition} />
        <InfoRow label="Body" value={bodyCondition} />
        <InfoRow label="Interior" value={interiorCondition} />
      </InfoTable>

      {notes && (
        <Paragraph>
          <strong style={{ color: "#e5e7eb" }}>Inspector notes: </strong>
          {notes}
        </Paragraph>
      )}

      {isBuyer ? (
        <Paragraph>
          The vehicle is in the condition described. Documentation verification
          is the next step — your dealer will upload the required export
          documents shortly.
        </Paragraph>
      ) : (
        <Paragraph>
          Please proceed to upload the vehicle title deed, export certificate,
          and any other required documentation to complete the next milestone.
        </Paragraph>
      )}

      <CtaButton href={transactionUrl}>View Full Report</CtaButton>
    </BaseLayout>
  );
}
