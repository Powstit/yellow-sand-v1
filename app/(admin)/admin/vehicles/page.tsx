import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAed, formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/dealers", label: "Dealers", icon: Users },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/transactions", label: "Transactions", icon: Package },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/accounts", label: "Accounts", icon: ShieldAlert },
];

interface VehicleRow {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price_aed: number;
  status: string;
  export_ready: boolean;
  created_at: string;
  dealer: { business_name: string } | null;
}

export const metadata = { title: "Vehicles — Admin" };

export default async function AdminVehiclesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data, count } = await supabase
    .from("vehicles")
    .select(
      `id, title, make, model, year, price_aed, status, export_ready, created_at,
       dealer:dealer_profiles(business_name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  const vehicles = data as unknown as VehicleRow[] | null;

  const statusVariant = (s: string) =>
    s === "active" ? "success" : s === "sold" ? "info" : s === "pending" ? "warning" : "secondary";

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="All Vehicles">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">All Vehicles</h2>
          <p className="text-sm text-muted-foreground mt-1">{count ?? 0} total listings</p>
        </div>

        {(!vehicles || vehicles.length === 0) ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No vehicles listed yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {vehicles.map((v) => (
                  <Link
                    key={v.id}
                    href={`/vehicles/${v.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{v.title}</p>
                        {v.export_ready && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.dealer?.business_name ?? "—"} · {formatDate(v.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <p className="text-sm font-medium text-sand-400">
                        {formatAed(v.price_aed)}
                      </p>
                      <Badge
                        variant={statusVariant(v.status)}
                        className="text-[10px] capitalize"
                      >
                        {v.status}
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
