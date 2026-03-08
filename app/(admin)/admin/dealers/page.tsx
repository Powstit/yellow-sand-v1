import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Star,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface DealerRow {
  id: string;
  business_name: string;
  location: string;
  verification_status: string;
  rating: number;
  total_transactions: number;
  created_at: string;
  profile: { full_name: string | null; email: string } | null;
}

const verificationVariant = (s: string) =>
  s === "verified" ? "success" : s === "suspended" ? "destructive" : s === "kyc_pending" ? "warning" : "secondary";

export const metadata = { title: "Dealers — Admin" };

export default async function AdminDealersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data, count } = await supabase
    .from("dealer_profiles")
    .select(
      `id, business_name, location, verification_status, rating, total_transactions, created_at,
       profile:profiles(full_name, email)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  const dealers = data as unknown as DealerRow[] | null;
  const pendingCount = dealers?.filter((d) => ["unverified", "kyc_pending"].includes(d.verification_status)).length ?? 0;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Dealers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Dealers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {count ?? 0} total · {pendingCount} pending review
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="warning" className="text-xs">
              {pendingCount} awaiting verification
            </Badge>
          )}
        </div>

        {(!dealers || dealers.length === 0) ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No dealers registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {dealers.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/dealers/${d.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.business_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {d.location}
                        </span>
                        <span>·</span>
                        <span>{d.profile?.email}</span>
                        <span>·</span>
                        <span>{formatDate(d.created_at)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-sand-400 fill-sand-400" />
                        {d.rating.toFixed(1)} · {d.total_transactions} sales
                      </span>
                      <Badge
                        variant={verificationVariant(d.verification_status)}
                        className="text-[10px] capitalize"
                      >
                        {d.verification_status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
