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

export interface EscrowFundedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  amountAed: string;
  escrowId: string;
  nextStep: string;
  transactionUrl: string;
}

export default function EscrowFunded({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  amountAed,
  escrowId,
  nextStep,
  transactionUrl,
}: EscrowFundedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`Escrow funded — ${amountAed} secured for ${vehicleTitle}`}>
      <Heading>
        {isBuyer ? "Payment Secured in Escrow" : "Escrow Funded — Deal Active"}
      </Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your payment of ${amountAed} is now safely held in escrow.`
          : `Hi ${recipientName}, the buyer's payment has been secured. Your deal is now active.`}
      </Subheading>

      <StatusBadge label="🔒 Funds in Escrow" color="#10B981" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Secured Amount" value={amountAed} />
        <InfoRow label="Escrow ID" value={escrowId} />
      </InfoTable>

      <Paragraph>
        <strong style={{ color: "#e5e7eb" }}>What happens next: </strong>
        {nextStep}
      </Paragraph>

      {isBuyer ? (
        <Paragraph>
          Your funds are protected until you confirm delivery. Yellow Sand will
          never release payment to the dealer without your confirmation.
        </Paragraph>
      ) : (
        <Paragraph>
          Proceed with the inspection milestone to advance the transaction.
          Funds will be released to you once the buyer confirms delivery.
        </Paragraph>
      )}

      <CtaButton href={transactionUrl}>Track Your Transaction</CtaButton>

      <Paragraph>
        <small style={{ color: "#6b7280", fontSize: "12px" }}>
          Escrow is provided by TrustIn. Funds are held in a regulated account
          and released only when all milestones are completed.
        </small>
      </Paragraph>
    </BaseLayout>
  );
}
