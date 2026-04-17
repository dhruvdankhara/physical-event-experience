"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  LogIn,
  LogOut,
  MoonStar,
  Shield,
  Sun,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  staffOnly?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/queues", label: "Queues" },
  { href: "/alerts", label: "Alerts" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin", staffOnly: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session, isLoading } = useAuthSession();

  const user = session?.authenticated ? session.user : null;
  const canSeeStaffRoutes = user?.role === "STAFF" || user?.role === "ADMIN";

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (!link.staffOnly) {
      return true;
    }

    return canSeeStaffRoutes;
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    router.push("/");
    router.refresh();
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-3 py-3 sm:px-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm font-semibold tracking-wide text-primary"
        >
          Stadium Sync
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleLinks.map((link) => {
            const active = isActivePath(safePathname, link.href);

            return (
              <Button
                key={link.href}
                asChild
                size="sm"
                variant={active ? "default" : "ghost"}
                className={cn("shrink-0")}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <Sun className="hidden dark:block" />
            <MoonStar className="block dark:hidden" />
          </Button>

          {user ? (
            <>
              <Badge variant="outline" className="hidden sm:inline-flex">
                <UserCircle2 className="size-3.5" />
                {user.name}
              </Badge>
              {(user.role === "STAFF" || user.role === "ADMIN") && (
                <Badge variant="secondary" className="hidden md:inline-flex">
                  <Shield className="size-3.5" />
                  {user.role}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleLogout}>
                <LogOut />
                Logout
              </Button>
            </>
          ) : (
            <>
              {!isLoading && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/login">
                    <LogIn />
                    Login
                  </Link>
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
