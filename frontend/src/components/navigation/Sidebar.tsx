"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar,
  Settings, 
  BarChart3, 
  BadgeCheck,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Subjects",
    icon: BookOpen,
    href: "/subjects",
    color: "text-violet-500",
  },
  {
    label: "Tests",
    icon: BadgeCheck,
    href: "/tests",
    color: "text-pink-700",
  },
  {
    label: "Quizzes",
    icon: BarChart3,
    href: "/quizzes",
    color: "text-orange-700",
  },
  {
    label: "Calendar",
    icon: Calendar,
    href: "/calendar",
    color: "text-emerald-500",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, isAdmin } = useAuth();

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r">
      <div className="px-3 py-4 border-b">
        <Link href="/dashboard" className="flex items-center pl-3 mb-6">
          <div className="relative mr-2">
            <div className="h-8 w-8 bg-primary rounded-full grid place-items-center text-primary-foreground font-bold">G</div>
          </div>
          <h1 className="text-xl font-bold">
            GATE Prep
          </h1>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                  pathname === route.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                  {route.label}
                </div>
              </Link>
            ))}
            
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={cn(
                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                    pathname === '/admin'
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <ShieldAlert className="h-5 w-5 mr-3 text-red-500" />
                    Admin Dashboard
                  </div>
                </Link>

                <Link
                  href="/admin/settings"
                  className={cn(
                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                    pathname === '/admin/settings'
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 mr-3 text-red-500" />
                    Admin Settings
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </ScrollArea>
      <div className="p-3 mt-auto border-t">
        <Button onClick={logout} variant="outline" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10">
          <LogOut className="h-5 w-5 mr-3" />
          Log out
        </Button>
      </div>
    </div>
  );
}