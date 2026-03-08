import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Yellow Sand — UAE Vehicles Delivered to Africa",
    template: "%s | Yellow Sand",
  },
  description:
    "Browse export-ready vehicles from verified UAE dealers. Safe escrow payments. Delivery to Nigeria and Ghana.",
  keywords: [
    "UAE cars export",
    "buy car Nigeria",
    "buy car Ghana",
    "Toyota Land Cruiser export",
    "Dubai cars Africa",
    "vehicle escrow",
  ],
  openGraph: {
    title: "Yellow Sand — UAE Vehicles Delivered to Africa",
    description:
      "Browse export-ready vehicles from verified UAE dealers with milestone-based escrow protection.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(225 40% 9%)",
              border: "1px solid hsl(225 25% 16%)",
              color: "hsl(210 20% 96%)",
            },
          }}
        />
      </body>
    </html>
  );
}
