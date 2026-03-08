import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Car,
  Package,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

interface DisputeDetail {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  transaction: {
    id: string;
    reference_number: string;
    total_amount_aed: number;
    status: string;
  } | null;
  claimant: { full_name: string | null; email: string } | null;
}

const statusVariant = (s: string) =>
  s === "open" ? "destructive" : s === "resolved" ? "success" : "secondary";

interface PageProps {
  params: { id: string };
}

export default async function AdminDisputeDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data: dispute } = await supabase
    .from("disputes")
    .select(
      `id, reason, description, status, resolution, created_at, resolved_at,
       transaction:transactions(id, reference_number, total_amount_aed, status),
       claimant:profiles!disputes_claimant_id_fkey(full_name, email)`
    )
    .eq("id", params.id)
    .single();

  if (!dispute) notFound();

  const d = dispute as unknown as DisputeDetail;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Dispute Detail">
      <div className="space-y-6">
        <Link
          href="/admin/disputes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to disputes
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Dispute</p>
            <h2 className="text-xl font-semibold capitalize">
              {d.reason.replace(/_/g, " ")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Filed {formatDate(d.created_at)}</p>
          </div>
          <Badge variant={statusVariant(d.status)} className="text-sm px-3 py-1 capitalize">
            {d.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Claimant */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filed By</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{d.claimant?.full_name ?? "—"}</p>
              <p className="text-muted-foreground">{d.claimant?.email}</p>
            </CardContent>
          </Card>

          {/* Transaction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Related Transaction</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {d.transaction ? (
                <>
                  <p className="font-medium">{d.transaction.reference_number}</p>
                  <p className="text-muted-foreground">
                    {formatAed(d.transaction.total_amount_aed)} · <span className="capitalize">{d.transaction.status}</span>
                  </p>
                  <Link
                    href={`/admin/transactions/${d.transaction.id}`}
                    className="text-sand-400 hover:text-sand-300 text-xs"
                  >
                    View transaction →
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground">No transaction linked</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {d.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Resolution */}
        {d.status === "resolved" && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-400">Resolution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {d.resolution && (
                <p className="text-muted-foreground leading-relaxed">{d.resolution}</p>
              )}
              {d.resolved_at && (
                <p className="text-xs text-muted-foreground">
                  Resolved on {formatDate(d.resolved_at)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin actions placeholder */}
        {d.status === "open" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the admin API to resolve this dispute. Resolution actions require
                manual review and should be processed through the internal operations panel.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
