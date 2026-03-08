"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Car, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  profile: Profile;
  title?: string;
}

export function DashboardShell({
  children,
  navItems,
  profile,
  title,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card/50 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sand-400 to-sand-600 flex items-center justify-center">
            <Car className="h-3.5 w-3.5 text-navy" />
          </div>
          <span className="font-semibold text-base">
            Yellow<span className="text-gold">Sand</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebarActive"
                    className="absolute inset-0 rounded-lg bg-white/8 border border-border"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <item.icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="relative z-10 ml-auto text-xs font-semibold bg-sand-500/20 text-sand-400 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile footer */}
        <div className="p-3 border-t border-border">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-sand-500/20 text-sand-400">
                {getInitials(profile.full_name ?? profile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {profile.full_name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {title && (
          <header className="flex items-center h-16 px-6 border-b border-border shrink-0">
            <h1 className="text-lg font-semibold">{title}</h1>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
