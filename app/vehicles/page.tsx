import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, Gauge, Calendar, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { formatAed, formatMileage } from "@/lib/utils";
import type { VerificationStatus } from "@/components/shared/verification-badge";

interface VehicleRow {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price_aed: number;
  mileage: number;
  location: string;
  fuel_type: string | null;
  export_ready: boolean;
  images: Array<{ url: string; is_primary: boolean }>;
  dealer: { verification_status: VerificationStatus } | null;
}

interface PageProps {
  searchParams: {
    make?: string;
    min?: string;
    max?: string;
    export?: string;
    q?: string;
  };
}

export const metadata = {
  title: "Browse Vehicles — Yellow Sand",
  description:
    "Export-ready vehicles from verified UAE dealers. Safe escrow payments, delivered to Nigeria and Ghana.",
};

export default async function VehiclesPage({ searchParams }: PageProps) {
  const supabase = createClient();

  let query = supabase
    .from("vehicles")
    .select(
      `id, title, make, model, year, price_aed, mileage, location, fuel_type, export_ready,
       images:vehicle_images(url, is_primary),
       dealer:dealer_profiles(verification_status)`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (searchParams.make) {
    query = query.ilike("make", `%${searchParams.make}%`);
  }
  if (searchParams.min) {
    query = query.gte("price_aed", Number(searchParams.min));
  }
  if (searchParams.max) {
    query = query.lte("price_aed", Number(searchParams.max));
  }
  if (searchParams.export === "true") {
    query = query.eq("export_ready", true);
  }
  if (searchParams.q) {
    query = query.textSearch("search_vector", searchParams.q, { type: "websearch" });
  }

  const { data, count } = await query.limit(48);
  const vehicles = data as unknown as VehicleRow[] | null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Browse Vehicles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {count ?? vehicles?.length ?? 0} export-ready vehicles from UAE dealers
            </p>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <FilterLink
              href="/vehicles"
              active={!searchParams.export && !searchParams.make}
              label="All"
            />
            <FilterLink
              href="/vehicles?export=true"
              active={searchParams.export === "true"}
              label="Export Ready"
            />
            {["Toyota", "Nissan", "Lexus", "Mitsubishi", "Land Rover"].map((make) => (
              <FilterLink
                key={make}
                href={`/vehicles?make=${make}`}
                active={searchParams.make === make}
                label={make}
              />
            ))}
          </div>

          {!vehicles || vehicles.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-2xl mb-3">🚗</p>
              <p className="text-muted-foreground">No vehicles found</p>
              <Link
                href="/vehicles"
                className="text-sm text-sand-400 hover:text-sand-300 mt-4 inline-block"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {vehicles.map((v) => {
                const primaryImage =
                  v.images.find((i) => i.is_primary) ?? v.images[0];
                return (
                  <Link
                    key={v.id}
                    href={`/vehicles/${v.id}`}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-sand-500/30 hover:shadow-lg hover:shadow-sand-500/5 transition-all"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] bg-muted/20">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={v.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground/20">
                          🚗
                        </div>
                      )}
                      {v.export_ready && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="gold" className="gap-1 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            Export Ready
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">
                        {v.make} · {v.model} · {v.year}
                      </p>
                      <p className="font-medium text-sm leading-snug line-clamp-2">{v.title}</p>
                      <p className="text-lg font-bold text-sand-400 mt-2">
                        {formatAed(v.price_aed)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {formatMileage(v.mileage)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.location}
                        </span>
                        {v.fuel_type && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {v.fuel_type}
                          </span>
                        )}
                      </div>
                      {v.dealer?.verification_status === "verified" && (
                        <div className="mt-2">
                          <VerificationBadge status="verified" size="sm" />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
        active
          ? "border-sand-500/50 bg-sand-500/10 text-sand-400"
          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
