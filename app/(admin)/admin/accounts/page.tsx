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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface AccountRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  country: string | null;
  is_active: boolean;
  created_at: string;
}

export const metadata = { title: "Accounts — Admin" };

export default async function AdminAccountsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const [buyersResult, dealersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, country, is_active, created_at", { count: "exact" })
      .eq("role", "buyer")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, country, is_active, created_at", { count: "exact" })
      .eq("role", "dealer")
      .order("created_at", { ascending: false }),
  ]);

  const buyers = buyersResult.data as unknown as AccountRow[] | null;
  const dealers = dealersResult.data as unknown as AccountRow[] | null;

  const suspendedCount =
    [...(buyers ?? []), ...(dealers ?? [])].filter((a) => !a.is_active).length;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {(buyersResult.count ?? 0) + (dealersResult.count ?? 0)} total ·{" "}
              {suspendedCount} suspended
            </p>
          </div>
        </div>

        {/* Buyers */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Buyers ({buyersResult.count ?? 0})
          </h3>
          <AccountTable accounts={buyers ?? []} />
        </section>

        {/* Dealers */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Dealers ({dealersResult.count ?? 0})
          </h3>
          <AccountTable accounts={dealers ?? []} dealerLinks />
        </section>
      </div>
    </DashboardShell>
  );
}

async function AccountTable({
  accounts,
  dealerLinks,
}: {
  accounts: AccountRow[];
  dealerLinks?: boolean;
}) {
  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No accounts yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-6 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{a.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.email} · {a.country ?? "—"} · Joined {formatDate(a.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Badge
                  variant={a.is_active ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {a.is_active ? "Active" : "Suspended"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
