import Link from "next/link";
import { LayoutDashboard, Car, Package, MessageSquare, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Transactions — Yellow Sand" };

export default async function DealerTransactionsPage() {
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
    .select("id")
    .eq("user_id", user.id)
    .single();
  const dealerProfile = dealerResult.data as Pick<DealerProfile, "id"> | null;
  if (!dealerProfile) redirect("/auth/register?role=dealer");

  const { data } = await supabase
    .from("transactions")
    .select(
      `id, reference_number, status, total_amount_aed, created_at,
       vehicle:vehicles(title),
       buyer:profiles!transactions_buyer_id_fkey(full_name, email)`
    )
    .eq("dealer_id", dealerProfile.id)
    .order("created_at", { ascending: false });

  const transactions = data as unknown as TxRow[] | null;

  const active = transactions?.filter((t) => !["completed", "cancelled", "refunded"].includes(t.status)) ?? [];
  const past = transactions?.filter((t) => ["completed", "cancelled", "refunded"].includes(t.status)) ?? [];

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Transactions">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All buyer transactions for your vehicles
          </p>
        </div>

        {(!transactions || transactions.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Active</h3>
            <div className="space-y-2">
              {active.map((tx) => (
                <DealerTransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">History</h3>
            <div className="space-y-2">
              {past.map((tx) => (
                <DealerTransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function DealerTransactionRow({ tx }: { tx: TxRow }) {
  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
  return (
    <Link
      href={`/dealer/transactions/${tx.id}`}
      className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
    >
      <div>
        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tx.buyer?.full_name ?? tx.buyer?.email ?? "Buyer"} · {tx.reference_number} ·{" "}
          {formatDate(tx.created_at)}
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
