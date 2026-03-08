import Link from "next/link";
import {
  LayoutDashboard,
  Car,
  Package,
  MessageSquare,
  Plus,
  Settings,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, DealerProfile, TransactionStatus } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/profile", label: "Settings", icon: Settings },
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

interface VehicleRow {
  id: string;
  title: string;
  status: string;
  price_aed: number;
  created_at: string;
}

export default async function DealerDashboardPage() {
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

  // Redirect unverified dealers to the KYC onboarding page
  if (dealerProfile.verification_status === "unverified") {
    redirect("/dealer/verify");
  }

  const [vehiclesResult, transactionsResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, title, status, price_aed, created_at", { count: "exact" })
      .eq("dealer_id", dealerProfile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("transactions")
      .select("id, reference_number, status, total_amount_aed, created_at, vehicle:vehicles(title), buyer:profiles!transactions_buyer_id_fkey(full_name, email)")
      .eq("dealer_id", dealerProfile.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const vehicles = vehiclesResult.data as unknown as VehicleRow[] | null;
  const vehicleCount = vehiclesResult.count;
  const transactions = transactionsResult.data as unknown as TxRow[] | null;

  const activeTransactions =
    transactions?.filter((t) => !["completed", "cancelled", "refunded"].includes(t.status)) ?? [];

  const totalRevenue =
    transactions?.filter((t) => t.status === "completed").reduce((s, t) => s + t.total_amount_aed, 0) ?? 0;

  const isKycPending = dealerProfile.verification_status === "kyc_pending";
  const isVerified = dealerProfile.verification_status === "verified";
  const isSuspended = dealerProfile.verification_status === "suspended";

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Dealer Dashboard">
      <div className="space-y-6">
        {isKycPending && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">⏳</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400">Verification In Progress</p>
              <p className="text-xs text-muted-foreground">
                TrustIn is reviewing your documents. You&apos;ll be notified once approved (1–2 business days).
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dealer/verify">View Status</Link>
            </Button>
          </div>
        )}

        {isSuspended && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">⛔</div>
            <div>
              <p className="text-sm font-semibold text-red-400">Account Suspended</p>
              <p className="text-xs text-muted-foreground">
                Contact{" "}
                <a href="mailto:support@yellowsand.dev" className="text-sand-400 hover:underline">
                  support@yellowsand.dev
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{dealerProfile.business_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <VerificationBadge
                status={dealerProfile.verification_status as "unverified" | "kyc_pending" | "verified" | "suspended"}
              />
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Listings" value={(vehicleCount ?? 0).toString()} icon={<Car className="h-4 w-4" />} />
          <StatCard label="Active Deals" value={activeTransactions.length.toString()} icon={<Package className="h-4 w-4" />} />
          <StatCard label="Completed Sales" value={dealerProfile.total_transactions.toString()} icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard
            label="Revenue (AED)"
            value={totalRevenue > 0 ? `${Math.round(totalRevenue / 1000)}k` : "0"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        {transactions && transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dealer/transactions" className="gap-1.5 text-xs">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
                  return (
                    <Link
                      key={tx.id}
                      href={`/dealer/transactions/${tx.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.buyer?.full_name ?? tx.buyer?.email ?? "Buyer"} · {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-sand-400">{formatAed(tx.total_amount_aed)}</p>
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

        {vehicles && vehicles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Listings</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dealer/listings" className="gap-1.5 text-xs">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium">{formatAed(v.price_aed)}</p>
                      <Badge
                        variant={v.status === "active" ? "success" : v.status === "sold" ? "info" : "secondary"}
                        className="capitalize text-[10px]"
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
