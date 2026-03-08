"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Building2,
  ArrowRight,
  LayoutDashboard,
  Car,
  Package,
  MessageSquare,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import type { Profile, DealerProfile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/profile", label: "Settings", icon: Settings },
];

const KYC_STEPS = [
  {
    icon: User,
    title: "Identity Verification",
    desc: "Confirm your personal identity with a government-issued ID (passport or Emirates ID).",
  },
  {
    icon: Building2,
    title: "Business Verification",
    desc: "Submit your trade license, business registration, and ownership documents.",
  },
  {
    icon: FileText,
    title: "AML Screening",
    desc: "Anti-money laundering check against global watchlists. Fully automated.",
  },
];

type DealerVerificationStatus = "unverified" | "kyc_pending" | "verified" | "suspended";

export default function DealerVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kycComplete = searchParams.get("kyc") === "complete";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [dealer, setDealer] = useState<DealerProfile | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [profileRes, dealerRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("profiles").select("*").eq("id", user.id).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("dealer_profiles").select("*").eq("user_id", user.id).single(),
      ]);

      setProfile(profileRes.data as Profile | null);
      setDealer(dealerRes.data as DealerProfile | null);
    });
  }, [router]);

  async function handleStartVerification() {
    setStarting(true);
    try {
      const res = await fetch("/api/dealer/kyc/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start verification");
        return;
      }

      // Redirect to TrustIn hosted KYC form
      window.location.href = data.redirect_url;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  if (!profile || !dealer) return null;

  const status = dealer.verification_status as DealerVerificationStatus;

  return (
    <DashboardShell navItems={NAV_ITEMS} profile={profile} title="Verification">
      <div className="max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold">Dealer Verification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete identity and business verification to list vehicles on Yellow Sand.
          </p>
        </div>

        {/* Status card */}
        {status === "verified" && (
          <div className="flex items-start gap-4 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-400">Verification Complete</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your account is verified. You can now create listings and accept payments.
              </p>
              <Button variant="gold" size="sm" className="mt-4" asChild>
                <Link href="/dealer/listings/new">
                  Create Your First Listing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {status === "kyc_pending" && (
          <div className="flex items-start gap-4 p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-yellow-400">Verification In Progress</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                TrustIn is reviewing your identity and business documents. This usually takes
                1–2 business days. You&apos;ll receive an email and notification when complete.
              </p>
              {kycComplete && (
                <p className="text-xs text-yellow-400/70 mt-2">
                  Your documents have been submitted. We&apos;ll notify you when the review is complete.
                </p>
              )}
            </div>
          </div>
        )}

        {status === "suspended" && (
          <div className="flex items-start gap-4 p-5 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-400">Account Suspended</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your dealer account has been suspended. Please contact{" "}
                <a href="mailto:support@yellowsand.dev" className="text-sand-400 hover:underline">
                  support@yellowsand.dev
                </a>{" "}
                for assistance.
              </p>
            </div>
          </div>
        )}

        {status === "unverified" && (
          <>
            {/* Rejection notice (if previously rejected) */}
            {dealer.rejection_reason && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Previous verification unsuccessful</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dealer.rejection_reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please review the reason above and start a new verification with corrected documents.
                  </p>
                </div>
              </div>
            )}

            {/* What verification covers */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-4">What verification involves</h3>
              <div className="space-y-4">
                {KYC_STEPS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sand-500/10 border border-sand-500/20 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-sand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What to prepare */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">Documents to have ready</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Passport or Emirates ID",
                  "UAE Trade License",
                  "Business registration certificate",
                  "Proof of business address",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sand-500/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Button
                variant="gold"
                onClick={handleStartVerification}
                loading={starting}
                className="gap-2"
              >
                Start Verification
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Powered by TrustIn · Secure · Encrypted
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
