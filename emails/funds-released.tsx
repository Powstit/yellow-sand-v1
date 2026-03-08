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

export interface FundsReleasedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  amountAed: string;
  completedAt: string;
  dashboardUrl: string;
}

export default function FundsReleased({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  amountAed,
  completedAt,
  dashboardUrl,
}: FundsReleasedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout preview={`✅ Transaction complete — ${referenceNumber}`}>
      <Heading>Transaction Complete 🎉</Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your transaction is fully complete. Thank you for using Yellow Sand!`
          : `Hi ${recipientName}, funds have been released to your account. Congratulations on the sale!`}
      </Subheading>

      <StatusBadge label="✅ Completed" color="#10B981" />

      <InfoTable>
        <InfoRow label="Transaction" value={referenceNumber} />
        <InfoRow label="Vehicle" value={vehicleTitle} />
        <InfoRow label="Amount" value={amountAed} />
        <InfoRow label="Completed" value={completedAt} />
      </InfoTable>

      {isBuyer ? (
        <>
          <Paragraph>
            Your vehicle ownership documents will be processed and delivered to
            you by your dealer. Keep your transaction reference for any future
            queries.
          </Paragraph>
          <Paragraph>
            Enjoying your vehicle? Leave a review for your dealer to help other
            buyers in the Yellow Sand community.
          </Paragraph>
        </>
      ) : (
        <>
          <Paragraph>
            The full sale amount of {amountAed} has been released from escrow
            and is being processed to your registered account. Please allow
            1–3 business days for the transfer to appear.
          </Paragraph>
          <Paragraph>
            Your rating has been updated. Keep up the great work — buyers
            appreciate verified, professional dealers.
          </Paragraph>
        </>
      )}

      <CtaButton href={dashboardUrl}>
        {isBuyer ? "Browse More Vehicles" : "View Earnings"}
      </CtaButton>

      <Paragraph>
        <small style={{ color: "#6b7280", fontSize: "12px" }}>
          A receipt for this transaction is available in your dashboard. For
          support, contact us at support@yellowsand.dev.
        </small>
      </Paragraph>
    </BaseLayout>
  );
}
