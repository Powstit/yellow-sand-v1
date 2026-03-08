import Link from "next/link";
import { LayoutDashboard, Car, Package, MessageSquare, Settings, User } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Profile, DealerProfile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/profile", label: "Settings", icon: Settings },
];

interface EnquiryRow {
  id: string;
  message: string;
  status: "new" | "read" | "replied";
  created_at: string;
  vehicle: { id: string; title: string } | null;
  buyer: { full_name: string | null; email: string } | null;
}

export const metadata = { title: "Enquiries — Yellow Sand" };

export default async function DealerEnquiriesPage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("enquiries")
    .select(
      `id, message, status, created_at,
       vehicle:vehicles(id, title),
       buyer:profiles!enquiries_buyer_id_fkey(full_name, email)`
    )
    .eq("dealer_id", dealerProfile.id)
    .order("created_at", { ascending: false });

  const enquiries = data as EnquiryRow[] | null;
  const newCount = enquiries?.filter((e) => e.status === "new").length ?? 0;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Enquiries">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Buyer Enquiries</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Messages from buyers interested in your vehicles
            </p>
          </div>
          {newCount > 0 && (
            <Badge variant="secondary" className="bg-sand-500/20 text-sand-400 border-sand-500/30">
              {newCount} new
            </Badge>
          )}
        </div>

        {(!enquiries || enquiries.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No enquiries yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Buyers can message you from your vehicle listings
              </p>
            </CardContent>
          </Card>
        )}

        {enquiries && enquiries.length > 0 && (
          <div className="space-y-2">
            {enquiries.map((enquiry) => (
              <EnquiryRow key={enquiry.id} enquiry={enquiry} dealerId={dealerProfile.id} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function EnquiryRow({ enquiry, dealerId }: { enquiry: EnquiryRow; dealerId: string }) {
  return (
    <Link
      href={`/dealer/enquiries/${enquiry.id}?dealer=${dealerId}`}
      className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-sand-500/20 hover:bg-white/3 transition-all"
    >
      <div className="h-9 w-9 rounded-full bg-muted/30 border border-border flex items-center justify-center shrink-0 mt-0.5">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium">
            {enquiry.buyer?.full_name ?? enquiry.buyer?.email ?? "Buyer"}
          </p>
          {enquiry.status === "new" && (
            <span className="h-2 w-2 rounded-full bg-sand-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Re: {enquiry.vehicle?.title ?? "Vehicle"} · {formatDate(enquiry.created_at)}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">{enquiry.message}</p>
      </div>
      <div className="shrink-0">
        <Badge
          variant={
            enquiry.status === "new"
              ? "secondary"
              : enquiry.status === "replied"
              ? "success"
              : "outline"
          }
          className={
            enquiry.status === "new"
              ? "bg-sand-500/20 text-sand-400 border-sand-500/30"
              : ""
          }
        >
          {enquiry.status}
        </Badge>
      </div>
    </Link>
  );
}
