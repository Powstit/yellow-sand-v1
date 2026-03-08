import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROUTE_ACCESS: Array<{
  pattern: RegExp;
  requireAuth: boolean;
  requireRole?: string[];
}> = [
  { pattern: /^\/dashboard/, requireAuth: true, requireRole: ["buyer"] },
  { pattern: /^\/saved/, requireAuth: true, requireRole: ["buyer"] },
  { pattern: /^\/transactions/, requireAuth: true, requireRole: ["buyer"] },
  { pattern: /^\/dealer/, requireAuth: true, requireRole: ["dealer"] },
  { pattern: /^\/admin/, requireAuth: true, requireRole: ["admin"] },
  { pattern: /^\/auth/, requireAuth: false },
];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const routeConfig = ROUTE_ACCESS.find(({ pattern }) => pattern.test(pathname));

  if (!routeConfig) return supabaseResponse;

  if (routeConfig.requireAuth && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (routeConfig.requireRole && user) {
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const profile = rawProfile as { role: string; is_active: boolean } | null;

    if (!profile) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (!profile.is_active) {
      return NextResponse.redirect(new URL("/auth/suspended", request.url));
    }

    if (!routeConfig.requireRole.includes(profile.role)) {
      const dashboardMap: Record<string, string> = {
        buyer: "/dashboard",
        dealer: "/dealer/dashboard",
        admin: "/admin/dashboard",
      };
      return NextResponse.redirect(new URL(dashboardMap[profile.role] ?? "/", request.url));
    }
  }

  if (!routeConfig.requireAuth && pathname.startsWith("/auth") && user) {
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const profile = rawProfile as { role: string } | null;
    if (profile) {
      const dashboardMap: Record<string, string> = {
        buyer: "/dashboard",
        dealer: "/dealer/dashboard",
        admin: "/admin/dashboard",
      };
      return NextResponse.redirect(new URL(dashboardMap[profile.role] ?? "/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
