import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      // Check if this is a new dealer who needs to complete KYC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "dealer") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dealer } = await (supabase as any)
          .from("dealer_profiles")
          .select("verification_status")
          .eq("user_id", user.id)
          .single();

        if (dealer?.verification_status === "unverified") {
          return NextResponse.redirect(`${origin}/dealer/verify`);
        }
        return NextResponse.redirect(`${origin}/dealer/dashboard`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
