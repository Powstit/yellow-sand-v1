import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, FileCheck, Star, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sand-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sand-500/20 bg-sand-500/5 text-sand-400 text-xs font-medium mb-8">
            <ShieldCheck className="h-3.5 w-3.5" />
            Milestone-based escrow protection on every transaction
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            UAE Vehicles,{" "}
            <span className="text-gold">Delivered Safely</span>
            <br />
            to Africa
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Browse thousands of export-ready vehicles from verified UAE dealers.
            Your funds are held in escrow until every milestone is confirmed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gold" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/vehicles">
                Browse Vehicles <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/how-it-works">How It Works</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <TrustItem icon="🛡️" label="Escrow Protected" />
            <TrustItem icon="✅" label="Verified Dealers Only" />
            <TrustItem icon="🌍" label="Nigeria & Ghana" />
            <TrustItem icon="📦" label="Full Export Documentation" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-border bg-card/30">
        <div className="container max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatItem value="2,400+" label="Vehicles Listed" />
          <StatItem value="380+" label="Verified Dealers" />
          <StatItem value="1,200+" label="Completed Sales" />
          <StatItem value="$24M+" label="Escrow Processed" />
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4" id="how-it-works">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Cross-Border Trust
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every transaction follows a strict milestone flow. Funds only move
              when you confirm each stage is complete.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Car className="h-6 w-6" />,
                step: "01",
                title: "Choose Your Vehicle",
                description:
                  "Browse export-ready vehicles from UAE-verified dealers. Review inspection reports and specs.",
              },
              {
                icon: <ShieldCheck className="h-6 w-6" />,
                step: "02",
                title: "Funds Go Into Escrow",
                description:
                  "Pay securely via Stripe. Your money is held in escrow — not released until all milestones pass.",
              },
              {
                icon: <Truck className="h-6 w-6" />,
                step: "03",
                title: "Track Every Milestone",
                description:
                  "Inspection → Documentation → Shipping → Delivery. Confirm each step before funds are released.",
              },
            ].map(({ icon, step, title, description }) => (
              <div
                key={step}
                className="relative p-6 rounded-xl border border-border bg-card hover:border-sand-500/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-sand-500/10 border border-sand-500/20 flex items-center justify-center text-sand-400 shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-sand-400/60 mb-1">
                      Step {step}
                    </p>
                    <h3 className="font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-24 px-4 bg-card/30 border-y border-border">
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Everything You Need for a{" "}
                <span className="text-gold">Safe Import</span>
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: <FileCheck className="h-4 w-4" />,
                    title: "Full Export Documentation",
                    description:
                      "Title deeds, export certificates, customs declarations — all verified before shipping.",
                  },
                  {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    title: "Pre-shipment Inspection",
                    description:
                      "Every vehicle is inspected and rated before funds are released.",
                  },
                  {
                    icon: <Star className="h-4 w-4" />,
                    title: "Landed Cost Calculator",
                    description:
                      "Know your total cost — vehicle + shipping + duties + VAT — before you buy.",
                  },
                  {
                    icon: <Users className="h-4 w-4" />,
                    title: "Verified Dealers Only",
                    description:
                      "All dealers are manually reviewed and approved by our team.",
                  },
                ].map(({ icon, title, description }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-sand-500/10 border border-sand-500/20 flex items-center justify-center text-sand-400 shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA card */}
            <div className="relative p-8 rounded-2xl border border-sand-500/20 bg-gradient-to-br from-sand-500/5 to-transparent">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sand-500/5 to-transparent" />
              <div className="relative">
                <h3 className="text-2xl font-bold mb-2">
                  Are you a UAE Dealer?
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  List your export-ready vehicles and reach thousands of buyers
                  across Nigeria and Ghana. Zero listing fees.
                </p>
                <Button variant="gold" asChild>
                  <Link href="/auth/register?role=dealer">
                    Register as a Dealer <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Free to join · Earn when you sell · Manual verification
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl md:text-3xl font-bold text-sand-400">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
