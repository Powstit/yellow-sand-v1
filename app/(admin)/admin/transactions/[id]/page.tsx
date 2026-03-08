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
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MilestoneTracker } from "@/components/transaction/milestone-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, TransactionWithDetails } from "@/types";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/dealers", label: "Dealers", icon: Users },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/transactions", label: "Transactions", icon: Package },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/admin/accounts", label: "Accounts", icon: ShieldAlert },
];

interface PageProps {
  params: { id: string };
}

export default async function AdminTransactionDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  if (!profile) redirect("/auth/login");

  const { data: transaction } = await supabase
    .from("transactions")
    .select(
      `*,
       vehicle:vehicles(*, images:vehicle_images(*)),
       buyer:profiles!transactions_buyer_id_fkey(*),
       dealer:dealer_profiles(*, profile:profiles(*)),
       milestones:transaction_milestones(*),
       dispute:disputes(*)`
    )
    .eq("id", params.id)
    .single();

  if (!transaction) notFound();

  const tx = transaction as unknown as TransactionWithDetails;
  const statusConfig = TRANSACTION_STATUS_CONFIG[tx.status as keyof typeof TRANSACTION_STATUS_CONFIG];

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Transaction Details">
      <div className="space-y-6">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to transactions
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Transaction</p>
            <h2 className="text-xl font-semibold">{tx.reference_number}</h2>
            <p className="text-sm text-muted-foreground mt-1">{formatDate(tx.created_at)}</p>
          </div>
          <Badge variant="outline" className={`text-sm px-3 py-1 ${statusConfig?.color}`}>
            {statusConfig?.label ?? tx.status}
          </Badge>
        </div>

        {/* Milestone Tracker */}
        <MilestoneTracker
          milestones={tx.milestones ?? []}
          currentStatus={tx.status}
        />

        <div className="grid md:grid-cols-2 gap-4">
          {/* Vehicle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{tx.vehicle.title}</p>
              <p className="text-muted-foreground">
                {tx.vehicle.year} · {tx.vehicle.make} {tx.vehicle.model}
              </p>
              {tx.vehicle.location && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {tx.vehicle.location}
                </p>
              )}
              <Link
                href={`/vehicles/${tx.vehicle.id}`}
                className="text-sand-400 hover:text-sand-300 text-xs"
              >
                View listing →
              </Link>
            </CardContent>
          </Card>

          {/* Parties */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Buyer</p>
                <p className="font-medium">{tx.buyer?.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{tx.buyer?.email}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Dealer</p>
                <p className="font-medium">{tx.dealer?.business_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{tx.dealer?.profile?.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Price</span>
              <span>{formatAed(tx.vehicle_price_aed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>{formatAed(tx.platform_fee_aed)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-sand-400">{formatAed(tx.total_amount_aed)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dispute */}
        {tx.dispute && Array.isArray(tx.dispute) && tx.dispute.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-400">Dispute</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="capitalize">Reason: {tx.dispute[0].reason}</p>
              {tx.dispute[0].description && (
                <p className="text-muted-foreground">{tx.dispute[0].description}</p>
              )}
              <p className="text-xs text-muted-foreground capitalize">
                Status: {tx.dispute[0].status} · Filed: {formatDate(tx.dispute[0].created_at)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
