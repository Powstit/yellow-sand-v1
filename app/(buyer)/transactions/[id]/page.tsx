import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MilestoneTracker } from "@/components/transaction/milestone-tracker";
import { ConfirmDeliveryButton } from "@/components/transaction/confirm-delivery-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Heart,
  Package,
  Settings,
} from "lucide-react";
import { formatAed, formatDate } from "@/lib/utils";
import { TRANSACTION_STATUS_CONFIG } from "@/lib/constants";
import type { Profile, TransactionWithDetails } from "@/types";
import { canBeDisputed } from "@/lib/transaction-state-machine";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "My Transactions", icon: Package },
  { href: "/saved", label: "Saved Vehicles", icon: Heart },
  { href: "/profile", label: "Settings", icon: Settings },
];

interface PageProps {
  params: { id: string };
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: transaction }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("transactions")
      .select(
        `
        *,
        vehicle:vehicles(
          *,
          images:vehicle_images(*)
        ),
        buyer:profiles!transactions_buyer_id_fkey(*),
        dealer:dealer_profiles(
          *,
          profile:profiles(*)
        ),
        milestones:transaction_milestones(*),
        dispute:disputes(*)
      `
      )
      .eq("id", params.id)
      .eq("buyer_id", user.id)
      .single(),
  ]);

  if (!profile || !transaction) notFound();

  const tx = transaction as unknown as TransactionWithDetails;
  const statusConfig =
    TRANSACTION_STATUS_CONFIG[
      tx.status as keyof typeof TRANSACTION_STATUS_CONFIG
    ];
  const primaryImage = tx.vehicle.images?.find((img) => img.is_primary) ?? tx.vehicle.images?.[0];
  const disputeable = canBeDisputed(tx.status);

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      profile={profile as Profile}
      title="Transaction Detail"
    >
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            My Transactions
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Transaction Ref
            </p>
            <h1 className="text-xl font-bold font-mono">{tx.reference_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(tx.created_at)}
            </p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          {/* Left */}
          <div className="space-y-5">
            {/* Vehicle summary */}
            <Card>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {primaryImage && (
                    <div className="relative h-20 w-28 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={primaryImage.url}
                        alt={tx.vehicle.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tx.vehicle.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx.vehicle.year} · {tx.vehicle.make} {tx.vehicle.model}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {tx.vehicle.location}
                      </span>
                    </div>
                    <Link
                      href={`/vehicles/${tx.vehicle.id}`}
                      className="text-xs text-sand-400 hover:text-sand-300 mt-1 inline-block"
                    >
                      View listing →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestone tracker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Escrow Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneTracker
                  milestones={tx.milestones}
                  currentStatus={tx.status}
                />

                {/* Buyer actions */}
                {tx.status === "delivered" && (
                  <ConfirmDeliveryButton transactionId={tx.id} />
                )}

                {/* Tracking */}
                {tx.shipping_tracking_number && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Shipping Tracking
                    </p>
                    <p className="text-sm font-mono font-medium">
                      {tx.shipping_tracking_number}
                    </p>
                    {tx.estimated_delivery_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Estimated delivery: {formatDate(tx.estimated_delivery_date)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dispute */}
            {tx.dispute ? (
              <Card className="border-red-500/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <p className="font-semibold text-sm text-red-400">
                      Dispute Open
                    </p>
                    <Badge variant="destructive" className="ml-auto capitalize">
                      {tx.dispute.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tx.dispute.description}
                  </p>
                  {tx.dispute.resolution_notes && (
                    <p className="text-sm mt-2 text-foreground">
                      Resolution: {tx.dispute.resolution_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              disputeable && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                    asChild
                  >
                    <Link href={`/transactions/${tx.id}/dispute`}>
                      Open Dispute
                    </Link>
                  </Button>
                </div>
              )
            )}
          </div>

          {/* Right: Financial summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LineItem label="Vehicle Price" value={formatAed(tx.vehicle_price_aed)} />
                {tx.shipping_cost_aed && (
                  <LineItem label="Shipping" value={formatAed(tx.shipping_cost_aed)} />
                )}
                <LineItem label="Platform Fee" value={formatAed(tx.platform_fee_aed)} />
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">Total (AED)</span>
                  <span className="text-sm text-sand-400">{formatAed(tx.total_amount_aed)}</span>
                </div>
                {tx.total_amount_buyer_currency && tx.buyer_currency && (
                  <p className="text-xs text-muted-foreground text-right">
                    ≈ {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: tx.buyer_currency,
                      maximumFractionDigits: 0,
                    }).format(tx.total_amount_buyer_currency)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dealer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-sm">{tx.dealer.business_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {tx.dealer.location}
                </p>
              </CardContent>
            </Card>

            {tx.destination_country && (
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">Destination</p>
                  <p className="font-medium text-sm">{tx.destination_port ?? tx.destination_country}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
