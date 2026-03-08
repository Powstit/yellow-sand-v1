import Link from "next/link";
import { LayoutDashboard, Car, Package, MessageSquare, Settings, Plus, Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAed, formatDate, formatMileage } from "@/lib/utils";
import type { Profile, DealerProfile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/profile", label: "Settings", icon: Settings },
];

interface VehicleRow {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price_aed: number;
  mileage: number;
  status: string;
  export_ready: boolean;
  created_at: string;
}

export const metadata = { title: "My Listings — Yellow Sand" };

export default async function DealerListingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const dealerResult = await supabase
    .from("dealer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  const dealerProfile = dealerResult.data as DealerProfile | null;
  if (!dealerProfile) redirect("/auth/register?role=dealer");

  const isVerified = dealerProfile.verification_status === "verified";

  const { data, count } = await supabase
    .from("vehicles")
    .select("id, title, make, model, year, price_aed, mileage, status, export_ready, created_at", {
      count: "exact",
    })
    .eq("dealer_id", dealerProfile.id)
    .order("created_at", { ascending: false });

  const vehicles = data as unknown as VehicleRow[] | null;

  const statusVariant = (s: string) =>
    s === "active" ? "success" : s === "sold" ? "info" : s === "pending" ? "warning" : "secondary";

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="My Listings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">My Listings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {count ?? 0} vehicle{count !== 1 ? "s" : ""} listed
            </p>
          </div>
          {isVerified && (
            <Button variant="gold" size="sm" asChild>
              <Link href="/dealer/listings/new">
                <Plus className="h-4 w-4" /> New Listing
              </Link>
            </Button>
          )}
        </div>

        {!isVerified && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-sm text-yellow-400">
              {dealerProfile.verification_status === "kyc_pending"
                ? "Your verification is in progress. Listings can be created once approved."
                : "Complete dealer verification to create listings."}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dealer/verify">
                {dealerProfile.verification_status === "kyc_pending" ? "View Status" : "Get Verified"}
              </Link>
            </Button>
          </div>
        )}

        {(!vehicles || vehicles.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Car className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No listings yet</p>
              {isVerified && (
                <Button variant="gold" size="sm" asChild>
                  <Link href="/dealer/listings/new">Create Your First Listing</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Vehicles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.year} · {formatMileage(v.mileage)} · {formatDate(v.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4 shrink-0">
                      <p className="text-sm font-semibold text-sand-400">
                        {formatAed(v.price_aed)}
                      </p>
                      {v.export_ready && (
                        <Badge variant="gold" className="text-[10px]">
                          Export Ready
                        </Badge>
                      )}
                      <Badge variant={statusVariant(v.status)} className="text-[10px] capitalize">
                        {v.status}
                      </Badge>
                      <Link
                        href={`/dealer/listings/${v.id}/edit`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
