import Link from "next/link";
import {
  LayoutDashboard,
  Heart,
  Package,
  Settings,
  ArrowRight,
  Car,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, TransactionStatus, Reservation } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "My Transactions", icon: Package },
  { href: "/saved", label: "Saved Vehicles", icon: Heart },
  { href: "/profile", label: "Settings", icon: Settings },
];

interface TxRow {
  id: string;
  reference_number: string;
  status: TransactionStatus;
  total_amount_aed: number;
  created_at: string;
  vehicle: { title: string } | null;
}

export default async function BuyerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [profileResult, transactionsResult, savedResult, reservationsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("transactions")
      .select("id, reference_number, status, total_amount_aed, created_at, vehicle:vehicles(title)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("saved_vehicles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("reservations")
      .select("id, status, deposit_amount_gbp, expires_at, created_at, vehicle:vehicles(id, title, location)")
      .eq("buyer_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data as Profile | null;
  const transactions = transactionsResult.data as unknown as TxRow[] | null;
  const savedCount = savedResult.count;
  const activeReservations = (reservationsResult.data ?? []) as (Omit<Reservation, "vehicle_id" | "buyer_id" | "dealer_id"> & { vehicle: { id: string; title: string; location: string } | null })[];

  if (!profile) redirect("/auth/login");

  const activeTransactions =
    transactions?.filter(
      (t) => !["completed", "cancelled", "refunded"].includes(t.status)
    ) ?? [];

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      profile={profile}
      title="Buyer Dashboard"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">
            Welcome back, {profile.full_name?.split(" ")[0] ?? "there"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your purchases
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Deals" value={activeTransactions.length.toString()} icon={<Package className="h-4 w-4" />} />
          <StatCard label="Total Purchases" value={(transactions?.length ?? 0).toString()} icon={<Car className="h-4 w-4" />} />
          <StatCard label="Saved Vehicles" value={(savedCount ?? 0).toString()} icon={<Heart className="h-4 w-4" />} />
          <StatCard
            label="Completed"
            value={(transactions?.filter((t) => t.status === "completed") ?? []).length.toString()}
            icon={<Package className="h-4 w-4" />}
          />
        </div>

        {/* Active reservations */}
        {activeReservations.length > 0 && (
          <Card className="border-sand-500/20 bg-sand-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-sand-400" />
                Active Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeReservations.map((r) => {
                  const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
                  const hoursLeft = expiresAt
                    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000))
                    : null;
                  return (
                    <Link
                      key={r.id}
                      href={r.vehicle ? `/vehicles/${r.vehicle.id}` : "#"}
                      className="flex items-center justify-between p-3 rounded-lg border border-sand-500/20 hover:border-sand-500/40 hover:bg-sand-500/5 transition-all"
                    >
                      <div>
                        <p className="text-sm font-medium">{r.vehicle?.title ?? "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.vehicle?.location} · £{Number(r.deposit_amount_gbp).toFixed(0)} deposit paid
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-sand-400">
                          {hoursLeft !== null ? `${hoursLeft}h remaining` : "Expiring soon"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Complete purchase</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Transactions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions" className="gap-1.5 text-xs">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No active transactions yet</p>
                <Button variant="gold" size="sm" asChild>
                  <Link href="/vehicles">Browse Vehicles</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTransactions.map((tx) => {
                  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
                  return (
                    <Link
                      key={tx.id}
                      href={`/transactions/${tx.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.reference_number} · {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-sand-400">{formatAed(tx.total_amount_aed)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browse CTA */}
        <div className="relative overflow-hidden rounded-xl border border-sand-500/20 bg-gradient-to-r from-sand-500/10 to-transparent p-6">
          <h3 className="font-semibold mb-1">Ready to find your next vehicle?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Thousands of export-ready vehicles from verified UAE dealers.
          </p>
          <Button variant="gold" size="sm" asChild>
            <Link href="/vehicles">
              Browse Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
