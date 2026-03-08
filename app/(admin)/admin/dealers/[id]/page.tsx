import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/dealers", label: "Dealers", icon: Users },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/transactions", label: "Transactions", icon: Package },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/accounts", label: "Accounts", icon: ShieldAlert },
];

interface DealerDetail {
  id: string;
  business_name: string;
  location: string;
  trade_license_number: string | null;
  verification_status: string;
  rating: number;
  total_transactions: number;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    country: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
}

interface VehicleRow {
  id: string;
  title: string;
  status: string;
  price_aed: number;
  created_at: string;
}

const verificationVariant = (s: string) =>
  s === "verified" ? "success" : s === "suspended" ? "destructive" : s === "kyc_pending" ? "warning" : "secondary";

interface PageProps {
  params: { id: string };
}

export default async function AdminDealerDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const adminProfile = profileResult.data as Profile | null;
  if (!adminProfile) redirect("/auth/login");

  const { data: dealer } = await supabase
    .from("dealer_profiles")
    .select(
      `id, business_name, location, trade_license_number, verification_status,
       rating, total_transactions, created_at,
       profile:profiles(*)`
    )
    .eq("id", params.id)
    .single();

  if (!dealer) notFound();

  const d = dealer as unknown as DealerDetail;

  const { data: vehiclesData, count: vehicleCount } = await supabase
    .from("vehicles")
    .select("id, title, status, price_aed, created_at", { count: "exact" })
    .eq("dealer_id", d.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const vehicles = vehiclesData as unknown as VehicleRow[] | null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={adminProfile} title="Dealer Review">
      <div className="space-y-6">
        <Link
          href="/admin/dealers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dealers
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold">{d.business_name}</h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {d.location}
            </p>
          </div>
          <Badge
            variant={verificationVariant(d.verification_status)}
            className="text-sm px-3 py-1 capitalize"
          >
            {d.verification_status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Dealer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {d.trade_license_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Trade License</p>
                  <p className="font-medium">{d.trade_license_number}</p>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-medium flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-sand-400 fill-sand-400" />
                    {d.rating.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="font-medium">{d.total_transactions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicles</p>
                  <p className="font-medium">{vehicleCount ?? 0}</p>
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Joined {formatDate(d.created_at)}
              </p>
            </CardContent>
          </Card>

          {/* Account Owner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Account Owner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{d.profile?.full_name ?? "—"}</p>
              <p className="text-muted-foreground">{d.profile?.email}</p>
              {d.profile?.country && (
                <p className="text-muted-foreground">Country: {d.profile.country}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={d.profile?.is_active ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {d.profile?.is_active ? "Active" : "Suspended"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Listings */}
        {vehicles && vehicles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Listings ({vehicleCount})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <p className="font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={v.status === "active" ? "success" : v.status === "sold" ? "info" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification actions */}
        {d.verification_status === "kyc_pending" && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-400">KYC In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This dealer has submitted documents to TrustIn for KYC / AML review. Status will update
                automatically via webhook when TrustIn completes the check (1–2 business days). You can
                also manually override using the admin approve API.
              </p>
            </CardContent>
          </Card>
        )}

        {d.verification_status === "unverified" && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Not Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This dealer has not yet started the TrustIn KYC verification process. They cannot create
                listings until they complete verification from their dealer dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
