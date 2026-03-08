"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, LayoutDashboard, Package, Heart, MessageSquare, Settings, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/types/database";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>("");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        setRole((data as Profile).role);
        reset({ full_name: data.full_name ?? "", phone: data.phone ?? "" });
      }
    });
  }, [router, reset]);

  async function onSubmit(data: ProfileForm) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone ?? null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
      setProfile((p) => p ? { ...p, ...data } : p);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const dashboardHref = role === "dealer" ? "/dealer/dashboard" : role === "admin" ? "/admin/dashboard" : "/dashboard";
  const navItems = role === "buyer"
    ? [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/transactions", label: "My Transactions", icon: Package },
        { href: "/saved", label: "Saved Vehicles", icon: Heart },
        { href: "/profile", label: "Settings", icon: Settings },
      ]
    : [
        { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/dealer/listings", label: "My Listings", icon: Car },
        { href: "/dealer/transactions", label: "Transactions", icon: Package },
        { href: "/dealer/enquiries", label: "Enquiries", icon: MessageSquare },
        { href: "/profile", label: "Settings", icon: Settings },
      ];

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Simple top nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={dashboardHref} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Car className="h-4 w-4" />
            <span className="font-semibold text-foreground">Yellow<span className="text-sand-400">Sand</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${href === "/profile" ? "text-foreground bg-white/5" : "text-muted-foreground hover:text-foreground hover:bg-white/3"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="container max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
        </div>

        {/* Profile info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" {...register("full_name")} />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+234 800 000 0000" {...register("phone")} />
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={profile.country ?? "—"} disabled className="opacity-60" />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={profile.role} disabled className="opacity-60 capitalize" />
              </div>

              <Button
                type="submit"
                variant="gold"
                loading={isSubmitting}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign out */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sign Out</p>
            <p className="text-xs text-muted-foreground">Sign out of your Yellow Sand account</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
