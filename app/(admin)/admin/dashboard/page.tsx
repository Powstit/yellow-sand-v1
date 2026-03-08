import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, TransactionStatus } from "@/types/database";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/dealers", label: "Dealers", icon: Users },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/transactions", label: "Transactions", icon: Package },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/accounts", label: "Accounts", icon: ShieldAlert },
];

interface TxRow {
  id: string;
  reference_number: string;
  status: TransactionStatus;
  total_amount_aed: number;
  created_at: string;
  vehicle: { title: string } | null;
  buyer: { full_name: string | null; email: string } | null;
}

interface DealerRow {
  id: string;
  business_name: string;
  location: string;
  created_at: string;
  verification_status: string;
  profile: { full_name: string | null; email: string } | null;
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const [
    { count: totalUsers },
    { count: pendingDealers },
    { count: activeTransactions },
    { count: openDisputes },
    transactionsResult,
    pendingDealerResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("dealer_profiles").select("id", { count: "exact", head: true }).in("verification_status", ["unverified", "kyc_pending"]),
    supabase.from("transactions").select("id", { count: "exact", head: true }).not("status", "in", '("completed","cancelled","refunded")'),
    supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    supabase
      .from("transactions")
      .select("id, reference_number, status, total_amount_aed, created_at, vehicle:vehicles(title), buyer:profiles!transactions_buyer_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("dealer_profiles")
      .select("id, business_name, location, created_at, verification_status, profile:profiles(full_name, email)")
      .in("verification_status", ["unverified", "kyc_pending"])
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  const recentTransactions = transactionsResult.data as unknown as TxRow[] | null;
  const pendingDealerList = pendingDealerResult.data as unknown as DealerRow[] | null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Admin Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Yellow Sand admin controls</p>
        </div>

        {((pendingDealers ?? 0) > 0 || (openDisputes ?? 0) > 0) && (
          <div className="flex flex-wrap gap-3">
            {(pendingDealers ?? 0) > 0 && (
              <Link
                href="/admin/dealers"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  {pendingDealers} dealer{pendingDealers !== 1 ? "s" : ""} pending approval
                </span>
              </Link>
            )}
            {(openDisputes ?? 0) > 0 && (
              <Link
                href="/admin/disputes"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  {openDisputes} open dispute{openDisputes !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={(totalUsers ?? 0).toString()} icon={<Users className="h-4 w-4" />} />
          <StatCard label="Pending Dealers" value={(pendingDealers ?? 0).toString()} icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Active Transactions" value={(activeTransactions ?? 0).toString()} icon={<Package className="h-4 w-4" />} />
          <StatCard label="Open Disputes" value={(openDisputes ?? 0).toString()} icon={<AlertTriangle className="h-4 w-4" />} />
        </div>

        {pendingDealerList && pendingDealerList.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Dealers Awaiting Approval</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/dealers" className="gap-1.5 text-xs">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingDealerList.map((dealer) => (
                  <Link
                    key={dealer.id}
                    href={`/admin/dealers/${dealer.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium">{dealer.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dealer.profile?.full_name ?? dealer.profile?.email} · {dealer.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{formatDate(dealer.created_at)}</span>
                      <Badge variant="warning" className="text-[10px]">Pending</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentTransactions && recentTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/transactions" className="gap-1.5 text-xs">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((tx) => {
                  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
                  return (
                    <Link
                      key={tx.id}
                      href={`/admin/transactions/${tx.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.buyer?.full_name ?? tx.buyer?.email} · {tx.reference_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-sand-400">{formatAed(tx.total_amount_aed)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
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
