import Link from "next/link";
import { LayoutDashboard, Heart, Package, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, TransactionStatus } from "@/types/database";

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
  vehicle: { id: string; title: string } | null;
}

export const metadata = { title: "My Transactions — Yellow Sand" };

export default async function BuyerTransactionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data } = await supabase
    .from("transactions")
    .select("id, reference_number, status, total_amount_aed, created_at, vehicle:vehicles(id, title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const transactions = data as unknown as TxRow[] | null;

  const active = transactions?.filter((t) => !["completed", "cancelled", "refunded"].includes(t.status)) ?? [];
  const past = transactions?.filter((t) => ["completed", "cancelled", "refunded"].includes(t.status)) ?? [];

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="My Transactions">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">My Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all your vehicle purchases and escrow status
          </p>
        </div>

        {(!transactions || transactions.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No transactions yet</p>
              <Link
                href="/vehicles"
                className="text-sm text-sand-400 hover:text-sand-300 font-medium"
              >
                Browse vehicles →
              </Link>
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Active</h3>
            <div className="space-y-2">
              {active.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">History</h3>
            <div className="space-y-2">
              {past.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function TransactionRow({ tx }: { tx: TxRow }) {
  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
  return (
    <Link
      href={`/transactions/${tx.id}`}
      className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
    >
      <div>
        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tx.reference_number} · {formatDate(tx.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-sand-400">{formatAed(tx.total_amount_aed)}</p>
        <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${statusConfig?.color}`}>
          {statusConfig?.label ?? tx.status}
        </Badge>
      </div>
    </Link>
  );
}
