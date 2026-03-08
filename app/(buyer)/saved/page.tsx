import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Heart, Package, Settings, MapPin, Gauge } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAed, formatMileage } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "My Transactions", icon: Package },
  { href: "/saved", label: "Saved Vehicles", icon: Heart },
  { href: "/profile", label: "Settings", icon: Settings },
];

interface SavedRow {
  id: string;
  created_at: string;
  vehicle: {
    id: string;
    title: string;
    price_aed: number;
    mileage: number;
    location: string;
    year: number;
    images: Array<{ url: string; is_primary: boolean }>;
  } | null;
}

export const metadata = { title: "Saved Vehicles — Yellow Sand" };

export default async function SavedVehiclesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data } = await supabase
    .from("saved_vehicles")
    .select(
      `id, created_at, vehicle:vehicles(
        id, title, price_aed, mileage, location, year,
        images:vehicle_images(url, is_primary)
      )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const saved = data as unknown as SavedRow[] | null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Saved Vehicles">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Saved Vehicles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {saved?.length ?? 0} vehicle{saved?.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {(!saved || saved.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Heart className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No saved vehicles yet
              </p>
              <Button variant="gold" size="sm" asChild>
                <Link href="/vehicles">Browse Vehicles</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {saved.map(({ id, vehicle }) => {
              if (!vehicle) return null;
              const primaryImage =
                vehicle.images.find((i) => i.is_primary) ?? vehicle.images[0];
              return (
                <Link
                  key={id}
                  href={`/vehicles/${vehicle.id}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:border-sand-500/30 transition-all"
                >
                  <div className="relative aspect-[16/10] bg-muted/20">
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={vehicle.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground/20">
                        🚗
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-sm leading-snug">{vehicle.title}</p>
                    <p className="text-lg font-bold text-sand-400 mt-1">
                      {formatAed(vehicle.price_aed)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {formatMileage(vehicle.mileage)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {vehicle.location}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
