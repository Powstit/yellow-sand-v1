"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  Car,
  MapPin,
  ShieldCheck,
  Gauge,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatAed, formatMileage, calculateLandedCost } from "@/lib/utils";
import { DESTINATION_COUNTRIES, type DestinationCountryCode } from "@/lib/constants";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const MOCK_RATES: Record<DestinationCountryCode, number> = { NG: 2100, GH: 4.3 };

interface VehiclePreview {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price_aed: number;
  location: string;
  images: Array<{ url: string; is_primary: boolean }>;
  dealer: { business_name: string };
}

// ── Stripe payment form ───────────────────────────────────────────────────────

function PaymentForm({
  transactionId,
  onSuccess,
}: {
  transactionId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/transactions/${transactionId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else {
      // Payment succeeded without redirect (e.g. card requires no 3DS)
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        loading={paying}
        disabled={!stripe || !elements}
      >
        {paying ? "Processing..." : "Confirm Payment"}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Payment secured by Stripe. Funds held in escrow until delivery confirmed.
      </p>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NewTransactionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const vehicleId = searchParams.get("vehicle");

  const [vehicle, setVehicle] = useState<VehiclePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<DestinationCountryCode>("NG");
  const [step, setStep] = useState<"review" | "payment">("review");
  const [creatingTx, setCreatingTx] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/auth/login?redirect=/transactions/new?vehicle=${vehicleId}`);
        return;
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("vehicles")
      .select("id, title, make, model, year, mileage, price_aed, location, images:vehicle_images(url, is_primary), dealer:dealer_profiles(business_name)")
      .eq("id", vehicleId)
      .eq("status", "active")
      .single()
      .then(({ data }: { data: VehiclePreview | null }) => {
        if (!data) router.push("/vehicles");
        setVehicle(data);
        setLoading(false);
      });
  }, [vehicleId, router]);

  async function handleProceed() {
    if (!vehicle) return;
    setCreatingTx(true);

    try {
      // Create transaction
      const txRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          destination_country: country,
          destination_port: DESTINATION_COUNTRIES[country].defaultPort,
        }),
      });
      const txData = await txRes.json();
      if (!txRes.ok) {
        toast.error(txData.error ?? "Failed to create transaction");
        return;
      }

      const txId = txData.data.id;

      // Create payment intent
      const intentRes = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok) {
        toast.error(intentData.error ?? "Failed to initialise payment");
        return;
      }

      setTransactionId(txId);
      setClientSecret(intentData.client_secret);
      setStep("payment");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCreatingTx(false);
    }
  }

  function handlePaymentSuccess() {
    toast.success("Payment confirmed! Your funds are held in escrow.");
    router.push(`/transactions/${transactionId}`);
  }

  if (!vehicleId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No vehicle selected.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) return null;

  const breakdown = calculateLandedCost(
    { vehiclePriceAed: vehicle.price_aed, destinationCountry: country },
    MOCK_RATES[country]
  );
  const countryConfig = DESTINATION_COUNTRIES[country];
  const primaryImage = vehicle.images?.find((i) => i.is_primary) ?? vehicle.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <Link
            href={`/vehicles/${vehicle.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to vehicle
          </Link>

          <h1 className="text-2xl font-bold mb-6">
            {step === "review" ? "Review Your Purchase" : "Complete Payment"}
          </h1>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* Left: Review / Payment */}
            <div className="space-y-5">
              {/* Vehicle card */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex gap-4">
                  <div className="relative h-20 w-28 rounded-lg overflow-hidden shrink-0 bg-muted/20">
                    {primaryImage ? (
                      <Image src={primaryImage.url} alt={vehicle.title} fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {vehicle.make} · {vehicle.model} · {vehicle.year}
                    </p>
                    <p className="font-semibold mt-0.5 leading-snug">{vehicle.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {formatMileage(vehicle.mileage)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {vehicle.location}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sold by {vehicle.dealer?.business_name}
                    </p>
                  </div>
                </div>
              </div>

              {step === "review" && (
                <>
                  {/* Destination selector */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <h2 className="text-sm font-semibold">Destination</h2>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Destination Country</Label>
                      <Select
                        value={country}
                        onValueChange={(v) => setCountry(v as DestinationCountryCode)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DESTINATION_COUNTRIES).map(([code, cfg]) => (
                            <SelectItem key={code} value={code}>
                              {cfg.name} — Port: {cfg.defaultPort}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* What happens next */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-sm font-semibold mb-3">What happens next</h2>
                    <ol className="space-y-2">
                      {[
                        "Your payment is held in secure escrow — not released to the dealer yet.",
                        "An independent inspector verifies the vehicle condition.",
                        "Export documents are prepared and verified.",
                        "Vehicle is shipped from UAE to your destination port.",
                        "You confirm delivery, funds are released to the dealer.",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full border border-sand-500/30 bg-sand-500/10 text-sand-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={handleProceed}
                    loading={creatingTx}
                  >
                    Reserve Vehicle & Proceed to Payment
                  </Button>
                </>
              )}

              {step === "payment" && clientSecret && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold mb-4">Payment Details</h2>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "night",
                        variables: {
                          colorPrimary: "#C9A84C",
                          colorBackground: "#0D1426",
                          colorText: "#f8f8f8",
                          borderRadius: "8px",
                        },
                      },
                    }}
                  >
                    <PaymentForm transactionId={transactionId!} onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              )}
            </div>

            {/* Right: Order summary */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold mb-1">Order Summary</h2>

                <div className="space-y-2">
                  <SummaryRow label="Vehicle Price" value={formatAed(vehicle.price_aed)} />
                  <SummaryRow label="Platform Fee (2.5%)" value={formatAed(breakdown.platformFeeAed)} />
                  <SummaryRow label="Shipping (est.)" value={formatAed(breakdown.shippingCostAed)} />
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span className="text-sm">Total (AED)</span>
                  <span className="text-sm text-sand-400">{formatAed(breakdown.totalAed)}</span>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-sand-500/10 border border-sand-500/20 text-center">
                  <p className="text-xs text-muted-foreground">Approx. in {countryConfig.name}</p>
                  <p className="text-base font-bold text-sand-400">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: countryConfig.currency,
                      maximumFractionDigits: 0,
                    }).format(breakdown.totalBuyerCurrency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Excl. import duties</p>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span>Funds held in escrow until delivery is confirmed. 100% refundable if inspection fails.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionPageContent />
    </Suspense>
  );
}
