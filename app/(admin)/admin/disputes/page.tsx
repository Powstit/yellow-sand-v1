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

interface DisputeRow {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  transaction: { reference_number: string } | null;
  claimant: { full_name: string | null; email: string } | null;
}

const statusVariant = (s: string) =>
  s === "open" ? "destructive" : s === "resolved" ? "success" : "secondary";

export const metadata = { title: "Disputes — Admin" };

export default async function AdminDisputesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data, count } = await supabase
    .from("disputes")
    .select(
      `id, reason, description, status, created_at,
       transaction:transactions(reference_number),
       claimant:profiles!disputes_claimant_id_fkey(full_name, email)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  const disputes = data as unknown as DisputeRow[] | null;
  const openCount = disputes?.filter((d) => d.status === "open").length ?? 0;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Disputes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Disputes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {openCount} open · {count ?? 0} total
            </p>
          </div>
          {openCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {openCount} requires action
            </Badge>
          )}
        </div>

        {(!disputes || disputes.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No disputes filed</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {disputes.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/disputes/${d.id}`}
                    className="flex items-start justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">{d.reason.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.transaction?.reference_number ?? "—"} · {d.claimant?.full_name ?? d.claimant?.email ?? "Buyer"} ·{" "}
                        {formatDate(d.created_at)}
                      </p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={statusVariant(d.status)}
                      className="text-[10px] capitalize ml-4 shrink-0"
                    >
                      {d.status}
                    </Badge>
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
