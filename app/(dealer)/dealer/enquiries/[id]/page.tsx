"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Car, Package, MessageSquare, Settings, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/profile", label: "Settings", icon: Settings },
];

const replySchema = z.object({
  reply: z.string().min(10, "Reply must be at least 10 characters"),
});

type ReplyForm = z.infer<typeof replySchema>;

interface EnquiryDetail {
  id: string;
  message: string;
  status: string;
  created_at: string;
  vehicle: { id: string; title: string } | null;
  buyer: { full_name: string | null; email: string } | null;
}

export default function EnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [replied, setReplied] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ReplyForm>({ resolver: zodResolver(replySchema) });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }

      const { data: profileData } = await (supabase as unknown as {
        from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: Profile | null }> } } }
      }).from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      // Mark as read and fetch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enq } = await (supabase as any)
        .from("enquiries")
        .select("id, message, status, created_at, vehicle:vehicles(id, title), buyer:profiles!enquiries_buyer_id_fkey(full_name, email)")
        .eq("id", params.id)
        .single();

      if (enq) {
        setEnquiry(enq as EnquiryDetail);
        if (enq.status === "new") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("enquiries").update({ status: "read" }).eq("id", params.id);
        }
      }
    });
  }, [params.id, router]);

  async function onSubmit(data: ReplyForm) {
    const res = await fetch(`/api/enquiries/${params.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: data.reply }),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success("Reply sent to buyer");
      setReplied(true);
    } else {
      toast.error(result.error ?? "Failed to send reply");
    }
  }

  if (!profile || !enquiry) return null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Enquiry">
      <div className="max-w-2xl space-y-6">
        <Link
          href="/dealer/enquiries"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to enquiries
        </Link>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              {enquiry.buyer?.full_name ?? enquiry.buyer?.email ?? "Buyer"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Re:{" "}
              {enquiry.vehicle ? (
                <Link href={`/vehicles/${enquiry.vehicle.id}`} className="text-sand-400 hover:text-sand-300">
                  {enquiry.vehicle.title}
                </Link>
              ) : (
                "Vehicle"
              )}{" "}
              · {formatDate(enquiry.created_at)}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{enquiry.message}</p>
          </CardContent>
        </Card>

        {replied ? (
          <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
            <p className="text-sm text-green-400 font-medium">Reply sent successfully.</p>
            <p className="text-xs text-muted-foreground mt-1">
              The buyer has been notified by email.
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reply to Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reply">Your reply</Label>
                  <Textarea
                    id="reply"
                    placeholder="Write your response to the buyer's enquiry..."
                    className="min-h-[120px] resize-none"
                    {...register("reply")}
                  />
                  {errors.reply && (
                    <p className="text-xs text-destructive">{errors.reply.message}</p>
                  )}
                </div>
                <Button type="submit" variant="gold" loading={isSubmitting}>
                  Send Reply
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
