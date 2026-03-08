"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Car,
  Package,
  Settings,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { VEHICLE_MAKES, BODY_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/dealer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dealer/listings", label: "My Listings", icon: Car },
  { href: "/dealer/transactions", label: "Transactions", icon: Package },
  { href: "/profile", label: "Settings", icon: Settings },
];

const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().int().min(1990).max(2030),
  mileage: z.coerce.number().int().min(0),
  price_aed: z.coerce.number().positive("Price must be positive"),
  description: z.string().optional(),
  condition: z.enum(["excellent", "good", "fair"]),
  color: z.string().optional(),
  fuel_type: z.enum(["petrol", "diesel", "hybrid", "electric"]),
  transmission: z.enum(["automatic", "manual"]),
  body_type: z.string().min(1),
  vin: z.string().optional(),
  export_ready: z.boolean().default(false),
  shipping_port: z.string().default("Jebel Ali, Dubai"),
});

type ListingForm = z.infer<typeof listingSchema>;

export default function NewListingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data as unknown as Profile);
    });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      condition: "good",
      fuel_type: "petrol",
      transmission: "automatic",
      export_ready: true,
      shipping_port: "Jebel Ali, Dubai",
    },
  });

  const onSubmit = async (data: ListingForm) => {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error ?? "Failed to create listing");
      return;
    }

    toast.success("Listing submitted for review!");
    router.push("/dealer/listings");
  };

  if (!profile) return null;

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      profile={profile}
      title="New Listing"
    >
      <div className="max-w-3xl">
        <Link
          href="/dealer/listings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          My Listings
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Listing Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Toyota Land Cruiser GXR 2022 — Excellent Condition"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Select onValueChange={(v) => setValue("make", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_MAKES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.make && (
                    <p className="text-xs text-destructive">{errors.make.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="e.g. Land Cruiser" {...register("model")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" placeholder="2022" min={1990} max={2030} {...register("year")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mileage">Mileage (km)</Label>
                  <Input id="mileage" type="number" placeholder="45000" min={0} {...register("mileage")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price_aed">Price (AED)</Label>
                  <Input id="price_aed" type="number" placeholder="280000" min={1} {...register("price_aed")} />
                  {errors.price_aed && (
                    <p className="text-xs text-destructive">{errors.price_aed.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" placeholder="White" {...register("color")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Condition</Label>
                  <Select
                    defaultValue="good"
                    onValueChange={(v) => setValue("condition", v as "excellent" | "good" | "fair")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fuel Type</Label>
                  <Select
                    defaultValue="petrol"
                    onValueChange={(v) => setValue("fuel_type", v as "petrol" | "diesel" | "hybrid" | "electric")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Transmission</Label>
                  <Select
                    defaultValue="automatic"
                    onValueChange={(v) => setValue("transmission", v as "automatic" | "manual")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Body Type</Label>
                  <Select onValueChange={(v) => setValue("body_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vin">VIN (optional)</Label>
                <Input id="vin" placeholder="Vehicle Identification Number" {...register("vin")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the vehicle condition, service history, extras..."
                  className="min-h-[100px]"
                  {...register("description")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="export_ready"
                  className="h-4 w-4 rounded border-border"
                  defaultChecked
                  {...register("export_ready")}
                />
                <Label htmlFor="export_ready">
                  This vehicle is export-ready (documents cleared)
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shipping_port">Shipping Port</Label>
                <Input
                  id="shipping_port"
                  placeholder="Jebel Ali, Dubai"
                  defaultValue="Jebel Ali, Dubai"
                  {...register("shipping_port")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" variant="gold" loading={isSubmitting}>
              Submit for Review
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
