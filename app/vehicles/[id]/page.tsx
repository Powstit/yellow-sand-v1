import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  Gauge,
  Calendar,
  Fuel,
  Settings,
  Hash,
  ArrowLeft,
  Star,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LandedCostCalculator } from "@/components/transaction/landed-cost-calculator";
import { formatAed, formatMileage, formatDate } from "@/lib/utils";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { VehicleActions } from "@/components/vehicle/vehicle-actions";
import type { VehicleWithDetails } from "@/types";
import type { VerificationStatus } from "@/components/shared/verification-badge";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: rawMeta } = await supabase
    .from("vehicles")
    .select("title, make, model, year, price_aed")
    .eq("id", params.id)
    .single();

  const vehicle = rawMeta as { title: string; make: string; model: string; year: number; price_aed: number } | null;
  if (!vehicle) return {};

  return {
    title: `${vehicle.title} — ${formatAed(vehicle.price_aed)}`,
    description: `${vehicle.year} ${vehicle.make} ${vehicle.model} available for export from UAE.`,
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [vehicleResult, savedResult, reservationResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select(`*, images:vehicle_images(*), inspection_report:inspection_reports(*), dealer:dealer_profiles(*, profile:profiles(*))`)
      .eq("id", params.id)
      .in("status", ["active", "reserved"])   // show reserved vehicles too
      .single(),
    user
      ? supabase.from("saved_vehicles").select("id").eq("user_id", user.id).eq("vehicle_id", params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user
      ? (supabase as any).from("reservations").select("id, status, expires_at, deposit_amount_gbp").eq("vehicle_id", params.id).eq("buyer_id", user.id).in("status", ["pending", "active"]).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rawVehicle = vehicleResult.data;
  const isSaved = !!savedResult.data;
  const userReservation = reservationResult.data as { id: string; status: string; expires_at: string; deposit_amount_gbp: number } | null;
  const userHasReservation = !!userReservation;

  const vehicle = rawVehicle;
  if (!vehicle) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicleTyped = vehicle as any;

  void vehicleTyped; // suppresses unused warning; used for type-safe access below
  const v = vehicle as unknown as VehicleWithDetails;
  const primaryImage = v.images.find((img) => img.is_primary) ?? v.images[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-6xl mx-auto">
          {/* Back */}
          <Link
            href="/vehicles"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to vehicles
          </Link>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* Left: Images + Details */}
            <div className="space-y-6">
              {/* Image gallery */}
              <div className="rounded-xl overflow-hidden bg-card border border-border">
                <div className="relative aspect-[16/9]">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={v.title}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 1024px) 100vw, 65vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                      <span className="text-6xl">🚗</span>
                    </div>
                  )}
                  {v.export_ready && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="gold" className="gap-1.5 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Export Ready
                      </Badge>
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {v.images.length > 1 && (
                  <div className="p-3 flex gap-2 overflow-x-auto">
                    {v.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-border"
                      >
                        <Image
                          src={img.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specs */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-4">Vehicle Specifications</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <SpecItem icon={<Calendar className="h-4 w-4" />} label="Year" value={v.year.toString()} />
                  <SpecItem icon={<Gauge className="h-4 w-4" />} label="Mileage" value={formatMileage(v.mileage)} />
                  <SpecItem icon={<Fuel className="h-4 w-4" />} label="Fuel" value={v.fuel_type ?? "—"} />
                  <SpecItem icon={<Settings className="h-4 w-4" />} label="Transmission" value={v.transmission ?? "—"} />
                  <SpecItem icon={<MapPin className="h-4 w-4" />} label="Location" value={v.location} />
                  {v.vin && <SpecItem icon={<Hash className="h-4 w-4" />} label="VIN" value={v.vin} />}
                </div>

                {v.description && (
                  <>
                    <Separator className="my-5" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {v.description}
                    </p>
                  </>
                )}
              </div>

              {/* Inspection Report */}
              {v.inspection_report && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="h-5 w-5 text-green-400" />
                    <h2 className="font-semibold">Inspection Report</h2>
                    {v.inspection_report.overall_rating && (
                      <Badge
                        variant={
                          v.inspection_report.overall_rating === "pass"
                            ? "success"
                            : v.inspection_report.overall_rating === "conditional"
                            ? "warning"
                            : "destructive"
                        }
                        className="ml-auto capitalize"
                      >
                        {v.inspection_report.overall_rating}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <InspectionItem label="Engine" rating={v.inspection_report.engine_condition} />
                    <InspectionItem label="Body" rating={v.inspection_report.body_condition} />
                    <InspectionItem label="Interior" rating={v.inspection_report.interior_condition} />
                  </div>
                  {v.inspection_report.notes && (
                    <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                      {v.inspection_report.notes}
                    </p>
                  )}
                  {v.inspection_report.inspection_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Inspected on {formatDate(v.inspection_report.inspection_date)}
                    </p>
                  )}
                </div>
              )}

              {/* Landed Cost Calculator */}
              <LandedCostCalculator
                vehiclePriceAed={v.price_aed}
              />
            </div>

            {/* Right: Purchase panel */}
            <div className="lg:sticky lg:top-24 space-y-4 h-fit">
              {/* Price card */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {v.make} · {v.model} · {v.year}
                  </p>
                  <h1 className="text-xl font-bold mt-1 leading-tight">{v.title}</h1>
                </div>

                <p className="text-3xl font-bold text-sand-400 mt-3 mb-1">
                  {formatAed(v.price_aed)}
                </p>
                <p className="text-xs text-muted-foreground mb-5">
                  Excl. shipping & import duties
                </p>

                <div className="space-y-3">
                  {/* Only show full purchase CTA when buyer has an active reservation */}
                  {userHasReservation && (
                    <Button variant="gold" size="lg" className="w-full" asChild>
                      <Link href={`/transactions/new?vehicle=${v.id}`}>
                        Complete Purchase with Escrow
                      </Link>
                    </Button>
                  )}
                  {!userHasReservation && v.status === "active" && (
                    <Button variant="gold" size="lg" className="w-full" asChild>
                      <Link href={`/transactions/new?vehicle=${v.id}`}>
                        Purchase with Escrow
                      </Link>
                    </Button>
                  )}
                  <VehicleActions
                    vehicleId={v.id}
                    isSaved={isSaved}
                    isAuthenticated={!!user}
                    vehicleStatus={v.status as "active" | "reserved" | "sold" | "draft" | "pending_review" | "suspended"}
                    userHasReservation={userHasReservation}
                    depositAmountGbp={userReservation?.deposit_amount_gbp ?? parseInt(process.env.NEXT_PUBLIC_RESERVATION_DEPOSIT_GBP ?? "500", 10)}
                  />
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  <span>Funds held in escrow until delivery confirmed</span>
                </div>
              </div>

              {/* Dealer card */}
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground mb-3">Sold by</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-sand-500/10 border border-sand-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-sand-400">
                      {v.dealer.business_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{v.dealer.business_name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-sand-400 fill-sand-400" />
                      <span className="text-xs text-muted-foreground">
                        {v.dealer.rating.toFixed(1)} ·{" "}
                        {v.dealer.total_transactions} sales
                      </span>
                    </div>
                  </div>
                  <span className="ml-auto">
                    <VerificationBadge
                      status={(v.dealer as unknown as { verification_status: VerificationStatus }).verification_status}
                    />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {v.dealer.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}

function InspectionItem({
  label,
  rating,
}: {
  label: string;
  rating: string | null;
}) {
  const colorMap: Record<string, string> = {
    excellent: "text-green-400",
    good: "text-blue-400",
    fair: "text-yellow-400",
    poor: "text-red-400",
  };
  return (
    <div className="text-center p-3 rounded-lg bg-muted/20 border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold capitalize ${rating ? colorMap[rating] ?? "" : "text-muted-foreground"}`}>
        {rating ?? "N/A"}
      </p>
    </div>
  );
}
