import {
  BaseLayout,
  CtaButton,
  Heading,
  InfoRow,
  InfoTable,
  Paragraph,
  Subheading,
  VehicleCard,
} from "./components/base-layout";

export interface EnquiryReceivedProps {
  dealerName: string;
  buyerName: string;
  buyerEmail: string;
  buyerCountry: string;
  vehicleTitle: string;
  vehiclePrice: string;
  vehicleLocation: string;
  vehicleUrl: string;
  message?: string;
  dashboardUrl: string;
}

export default function EnquiryReceived({
  dealerName,
  buyerName,
  buyerEmail,
  buyerCountry,
  vehicleTitle,
  vehiclePrice,
  vehicleLocation,
  vehicleUrl,
  message,
  dashboardUrl,
}: EnquiryReceivedProps) {
  return (
    <BaseLayout preview={`New enquiry from ${buyerName} — ${vehicleTitle}`}>
      <Heading>New Enquiry Received</Heading>
      <Subheading>
        Hi {dealerName}, a buyer is interested in one of your listings.
      </Subheading>

      <VehicleCard
        title={vehicleTitle}
        price={vehiclePrice}
        location={vehicleLocation}
        href={vehicleUrl}
      />

      <InfoTable>
        <InfoRow label="Buyer" value={buyerName} />
        <InfoRow label="Email" value={buyerEmail} />
        <InfoRow label="Country" value={buyerCountry} />
      </InfoTable>

      {message && (
        <>
          <Paragraph>Their message:</Paragraph>
          <Paragraph>
            <em style={{ color: "#9ca3af" }}>&quot;{message}&quot;</em>
          </Paragraph>
        </>
      )}

      <Paragraph>
        Respond promptly to increase your chances of closing this deal.
        Buyers typically make decisions within 24–48 hours.
      </Paragraph>

      <CtaButton href={dashboardUrl}>View in Dashboard</CtaButton>
    </BaseLayout>
  );
}
