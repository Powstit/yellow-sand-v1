"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  ChevronDown,
  User,
  LayoutDashboard,
  LogOut,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_LINKS = [
  { href: "/vehicles", label: "Browse Vehicles" },
  { href: "/how-it-works", label: "How It Works" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    });
  }, []);

  const dashboardHref =
    profile?.role === "dealer"
      ? "/dealer/dashboard"
      : profile?.role === "admin"
      ? "/admin/dashboard"
      : "/dashboard";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy/90 backdrop-blur-xl border-b border-border shadow-xl shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sand-400 to-sand-600 flex items-center justify-center">
              <Car className="h-4 w-4 text-navy" />
            </div>
            <span className="font-semibold text-lg text-foreground">
              Yellow<span className="text-gold">Sand</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {pathname === href && (
                  <motion.span
                    layoutId="navActive"
                    className="absolute inset-0 rounded-lg bg-white/8 border border-border"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-24 rounded-lg bg-muted/30 animate-pulse" />
            ) : profile ? (
              <UserMenu
                profile={profile}
                dashboardHref={dashboardHref}
                onSignOut={handleSignOut}
              />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button variant="gold" size="sm" asChild>
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-navy/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="container px-4 py-4 flex flex-col gap-2">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border flex flex-col gap-2">
                {profile ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-white/5"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                      className="px-3 py-2 text-sm text-left font-medium rounded-lg hover:bg-white/5 text-destructive"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                      <Button variant="gold" className="w-full" size="sm">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function UserMenu({
  profile,
  dashboardHref,
  onSignOut,
}: {
  profile: Profile;
  dashboardHref: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-sand-500/20 text-sand-400">
            {getInitials(profile.full_name ?? profile.email)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium max-w-[120px] truncate">
          {profile.full_name ?? profile.email}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl border border-border bg-card shadow-xl shadow-black/30 p-1"
            >
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium truncate">{profile.email}</p>
                <p className="text-xs text-sand-400 capitalize mt-0.5">{profile.role}</p>
              </div>
              <MenuItem
                href={dashboardHref}
                icon={<LayoutDashboard className="h-3.5 w-3.5" />}
                label="Dashboard"
                onClick={() => setOpen(false)}
              />
              <MenuItem
                href="/profile"
                icon={<User className="h-3.5 w-3.5" />}
                label="Profile Settings"
                onClick={() => setOpen(false)}
              />
              <div className="mt-1 pt-1 border-t border-border">
                <button
                  onClick={() => {
                    setOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </Link>
  );
}
