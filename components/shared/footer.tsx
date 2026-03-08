import Link from "next/link";
import { Car } from "lucide-react";

const FOOTER_LINKS = {
  Platform: [
    { label: "Browse Vehicles", href: "/vehicles" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Escrow Protection", href: "/how-it-works#escrow" },
    { label: "Landed Cost Calculator", href: "/vehicles#calculator" },
  ],
  For: [
    { label: "Buyers", href: "/for-buyers" },
    { label: "Dealers", href: "/for-dealers" },
    { label: "Dealer Registration", href: "/auth/register?role=dealer" },
  ],
  Company: [
    { label: "About Yellow Sand", href: "/about" },
    { label: "Contact Us", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-navy-600/50">
      <div className="container max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sand-400 to-sand-600 flex items-center justify-center">
                <Car className="h-4 w-4 text-navy" />
              </div>
              <span className="font-semibold text-lg">
                Yellow<span className="text-gold">Sand</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The safest way to buy export-ready vehicles from UAE dealers.
              Milestone-based escrow for every transaction.
            </p>
            <div className="flex gap-3 mt-6">
              <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground">
                🇦🇪 Dubai
              </span>
              <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground">
                🇳🇬 Nigeria
              </span>
              <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground">
                🇬🇭 Ghana
              </span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold mb-4">{section}</h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Yellow Sand. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Payments secured by{" "}
            <span className="text-foreground font-medium">Stripe</span> ·
            Escrow by{" "}
            <span className="text-foreground font-medium">TrustIn</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
