import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Transactions — Admin" };

export default async function AdminTransactionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data, count } = await supabase
    .from("transactions")
    .select(
      `id, reference_number, status, total_amount_aed, created_at,
       vehicle:vehicles(title),
       buyer:profiles!transactions_buyer_id_fkey(full_name, email)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  const transactions = data as unknown as TxRow[] | null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="All Transactions">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">All Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {count ?? 0} total transactions
          </p>
        </div>

        {(!transactions || transactions.length === 0) ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];
                  return (
                    <Link
                      key={tx.id}
                      href={`/admin/transactions/${tx.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.vehicle?.title ?? "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.reference_number} · {tx.buyer?.full_name ?? tx.buyer?.email ?? "Buyer"} ·{" "}
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <p className="text-sm font-semibold text-sand-400">
                          {formatAed(tx.total_amount_aed)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] whitespace-nowrap ${statusConfig?.color}`}
                        >
                          {statusConfig?.label ?? tx.status}
                        </Badge>
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
