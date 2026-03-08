"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, Eye, EyeOff, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "dealer"]),
    country: z.string().min(1, "Select your country"),
    // Dealer-specific
    business_name: z.string().optional(),
    trade_license_number: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const BUYER_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
];

const DEALER_COUNTRIES = [
  { code: "AE", name: "United Arab Emirates" },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "dealer">(
    (searchParams.get("role") as "buyer" | "dealer") ?? "buyer"
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: selectedRole,
    },
  });

  const role = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: data.role,
          full_name: data.full_name,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // Update profile country
    if (authData.user) {
      await (supabase as any).from("profiles").update({ country: data.country }).eq("id", authData.user.id);

      // Create dealer profile if registering as dealer
      if (data.role === "dealer" && data.business_name) {
        await (supabase as any).from("dealer_profiles").insert({
          user_id: authData.user.id,
          business_name: data.business_name,
          trade_license_number: data.trade_license_number ?? null,
        });
      }
    }

    toast.success("Account created! Check your email to verify, then log in to complete your dealer verification.");
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sand-400 to-sand-600 flex items-center justify-center">
            <Car className="h-5 w-5 text-navy" />
          </div>
          <span className="font-bold text-xl">
            Yellow<span className="text-gold">Sand</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-xl font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Join Yellow Sand to start buying or selling
          </p>

          {/* Role picker */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: "buyer" as const, icon: User, label: "I&apos;m a Buyer", desc: "Nigeria or Ghana" },
              { value: "dealer" as const, icon: Building2, label: "I&apos;m a Dealer", desc: "UAE dealer" },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSelectedRole(value);
                  setValue("role", value);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
                  role === value
                    ? "border-sand-500/50 bg-sand-500/10 text-sand-400"
                    : "border-border hover:border-border/80 hover:bg-white/3"
                )}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <p className="text-xs font-semibold" dangerouslySetInnerHTML={{ __html: label }} />
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="Your full name"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select
                onValueChange={(v) => setValue("country", v)}
                defaultValue=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {(role === "dealer" ? DEALER_COUNTRIES : BUYER_COUNTRIES).map(
                    ({ code, name }) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-xs text-destructive">{errors.country.message}</p>
              )}
            </div>

            {/* Dealer-specific fields */}
            {role === "dealer" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    placeholder="Your dealership name"
                    {...register("business_name")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade_license">Trade License Number</Label>
                  <Input
                    id="trade_license"
                    placeholder="DED-2024-XXXXXX"
                    {...register("trade_license_number")}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              className="w-full"
              loading={isSubmitting}
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-sand-400 hover:text-sand-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
