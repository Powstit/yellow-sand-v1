import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Link href={BASE_URL} style={logoLink}>
              <Text style={logoText}>
                Yellow<span style={logoAccent}>Sand</span>
              </Text>
            </Link>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Yellow Sand — UAE Vehicles Delivered to Africa
            </Text>
            <Text style={footerLinks}>
              <Link href={`${BASE_URL}/vehicles`} style={footerLink}>
                Browse Vehicles
              </Link>
              {" · "}
              <Link href={`${BASE_URL}/dashboard`} style={footerLink}>
                My Dashboard
              </Link>
              {" · "}
              <Link href={`${BASE_URL}/help`} style={footerLink}>
                Help
              </Link>
            </Text>
            <Text style={footerDisclaimer}>
              You received this email because you have an account on Yellow Sand.
              <br />© {new Date().getFullYear()} Yellow Sand. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Shared building blocks ────────────────────────────────────────

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={heading}>{children}</Text>;
}

export function Subheading({ children }: { children: React.ReactNode }) {
  return <Text style={subheading}>{children}</Text>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={paragraph}>{children}</Text>;
}

export function StatusBadge({
  label,
  color = "#C9A84C",
}: {
  label: string;
  color?: string;
}) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
      <Text
        style={{
          display: "inline-block",
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}40`,
          borderRadius: "20px",
          padding: "6px 20px",
          fontSize: "13px",
          fontWeight: "600",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </Text>
    </Section>
  );
}

export function VehicleCard({
  title,
  price,
  location,
  href,
}: {
  title: string;
  price: string;
  location: string;
  href: string;
}) {
  return (
    <Section style={vehicleCard}>
      <Text style={vehicleTitle}>{title}</Text>
      <Text style={vehiclePrice}>{price}</Text>
      <Text style={vehicleMeta}>📍 {location}</Text>
      <Link href={href} style={vehicleLink}>
        View Vehicle →
      </Link>
    </Section>
  );
}

export function CtaButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
      <Link href={href} style={ctaButton}>
        {children}
      </Link>
    </Section>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={infoLabel}>{label}</td>
      <td style={infoValue}>{value}</td>
    </tr>
  );
}

export function InfoTable({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Section style={infoTableContainer}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
        <tbody>{children}</tbody>
      </table>
    </Section>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#0A0F1E",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: "40px 0",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
};

const header: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "24px",
};

const logoLink: React.CSSProperties = {
  textDecoration: "none",
};

const logoText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "800",
  color: "#ffffff",
  letterSpacing: "-0.5px",
  margin: 0,
};

const logoAccent: React.CSSProperties = {
  color: "#C9A84C",
};

const content: React.CSSProperties = {
  backgroundColor: "#0D1426",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "36px 40px",
};

const divider: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "24px 0 16px",
};

const footer: React.CSSProperties = {
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 8px",
};

const footerLinks: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 12px",
};

const footerLink: React.CSSProperties = {
  color: "#C9A84C",
  textDecoration: "none",
};

const footerDisclaimer: React.CSSProperties = {
  fontSize: "11px",
  color: "#4b5563",
  lineHeight: "1.6",
  margin: 0,
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#ffffff",
  margin: "0 0 8px",
  lineHeight: "1.3",
};

const subheading: React.CSSProperties = {
  fontSize: "15px",
  color: "#9ca3af",
  margin: "0 0 24px",
  lineHeight: "1.5",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  color: "#d1d5db",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const vehicleCard: React.CSSProperties = {
  backgroundColor: "rgba(201,168,76,0.06)",
  border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: "12px",
  padding: "20px 24px",
  margin: "20px 0",
};

const vehicleTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
  margin: "0 0 4px",
};

const vehiclePrice: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#C9A84C",
  margin: "0 0 4px",
};

const vehicleMeta: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "0 0 12px",
};

const vehicleLink: React.CSSProperties = {
  fontSize: "13px",
  color: "#C9A84C",
  textDecoration: "none",
  fontWeight: "600",
};

const ctaButton: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#C9A84C",
  color: "#0A0F1E",
  fontSize: "15px",
  fontWeight: "700",
  textDecoration: "none",
  borderRadius: "10px",
  padding: "14px 32px",
};

const infoTableContainer: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "16px 20px",
  margin: "20px 0",
};

const infoLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  padding: "6px 16px 6px 0",
  whiteSpace: "nowrap" as const,
  verticalAlign: "top" as const,
};

const infoValue: React.CSSProperties = {
  fontSize: "14px",
  color: "#e5e7eb",
  fontWeight: "500",
  padding: "6px 0",
  verticalAlign: "top" as const,
};
