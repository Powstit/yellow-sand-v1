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

export interface ReservationCreatedProps {
  recipientName: string;
  role: "buyer" | "dealer";
  referenceNumber: string;
  vehicleTitle: string;
  vehiclePrice: string;
  vehicleLocation: string;
  vehicleUrl: string;
  totalAmount: string;
  buyerCurrency: string;
  destinationCountry: string;
  transactionUrl: string;
}

export default function ReservationCreated({
  recipientName,
  role,
  referenceNumber,
  vehicleTitle,
  vehiclePrice,
  vehicleLocation,
  vehicleUrl,
  totalAmount,
  buyerCurrency,
  destinationCountry,
  transactionUrl,
}: ReservationCreatedProps) {
  const isBuyer = role === "buyer";

  return (
    <BaseLayout
      preview={`Reservation ${referenceNumber} created — ${vehicleTitle}`}
    >
      <Heading>
        {isBuyer ? "Your Reservation is Confirmed" : "New Reservation Received"}
      </Heading>
      <Subheading>
        {isBuyer
          ? `Hi ${recipientName}, your vehicle reservation has been created and is pending payment.`
          : `Hi ${recipientName}, a buyer has reserved one of your vehicles.`}
      </Subheading>

      <StatusBadge label="⏳ Awaiting Payment" color="#F59E0B" />

      <VehicleCard
        title={vehicleTitle}
        price={vehiclePrice}
        location={vehicleLocation}
        href={vehicleUrl}
      />

      <InfoTable>
        <InfoRow label="Reference" value={referenceNumber} />
        <InfoRow label="Total Amount" value={totalAmount} />
        <InfoRow label="Currency" value={buyerCurrency} />
        <InfoRow label="Destination" value={destinationCountry} />
      </InfoTable>

      {isBuyer ? (
        <Paragraph>
          Complete your payment to secure this vehicle. Funds are held in escrow
          and only released to the dealer after you confirm safe delivery.
        </Paragraph>
      ) : (
        <Paragraph>
          The vehicle has been reserved. It will be marked as sold once the
          buyer completes payment. You'll receive another notification when
          funds are secured in escrow.
        </Paragraph>
      )}

      <CtaButton href={transactionUrl}>
        {isBuyer ? "Complete Payment" : "View Transaction"}
      </CtaButton>
    </BaseLayout>
  );
}
