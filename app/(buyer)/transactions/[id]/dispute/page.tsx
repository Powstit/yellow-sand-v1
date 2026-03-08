"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LayoutDashboard, Package, Heart, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { useEffect } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "My Transactions", icon: Package },
  { href: "/saved", label: "Saved Vehicles", icon: Heart },
  { href: "/profile", label: "Settings", icon: Settings },
];

const DISPUTE_REASONS = [
  { value: "vehicle_not_as_described", label: "Vehicle not as described" },
  { value: "not_received", label: "Vehicle not received" },
  { value: "documentation_issue", label: "Documentation problem" },
  { value: "shipping_delay", label: "Excessive shipping delay" },
  { value: "damage", label: "Vehicle arrived damaged" },
  { value: "other", label: "Other" },
] as const;

const disputeSchema = z.object({
  reason: z.enum(["vehicle_not_as_described", "not_received", "documentation_issue", "shipping_delay", "damage", "other"]),
  description: z.string().min(20, "Please provide at least 20 characters describing your issue"),
});

type DisputeForm = z.infer<typeof disputeSchema>;

export default function DisputePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: Profile | null }> } } } })
        .from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    });
  }, [router]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DisputeForm>({ resolver: zodResolver(disputeSchema) });

  async function onSubmit(data: DisputeForm) {
    const res = await fetch(`/api/transactions/${params.id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success("Dispute opened. Our team will review within 24 hours.");
      router.push(`/transactions/${params.id}`);
    } else {
      toast.error(result.error ?? "Failed to open dispute");
    }
  }

  if (!profile) return null;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Open Dispute">
      <div className="max-w-2xl space-y-6">
        <Link
          href={`/transactions/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transaction
        </Link>

        <div>
          <h2 className="text-xl font-semibold">Open a Dispute</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Opening a dispute pauses the transaction and puts escrow funds on hold.
            Our team will review and respond within 24 hours.
          </p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Before opening a dispute, please contact the dealer directly to try to resolve
            the issue. Disputes should be a last resort.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dispute Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Reason for dispute</Label>
                <Select onValueChange={(v) => setValue("reason", v as DisputeForm["reason"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPUTE_REASONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason && (
                  <p className="text-xs text-destructive">Please select a reason</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail — include dates, what was promised vs what happened, and any evidence you have."
                  className="min-h-[140px] resize-none"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="destructive"
                  loading={isSubmitting}
                >
                  Submit Dispute
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
