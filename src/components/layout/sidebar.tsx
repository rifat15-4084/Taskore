"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  CheckSquare,
  FileText,
  CalendarDays,
  Bell,
  User,
  ShieldCheck,
  Users,
  BarChart3,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  const memberNav = [
    { name: "My Board", href: "/app/board", icon: KanbanSquare },
    { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/app/projects", icon: FolderKanban },
    { name: "Tasks", href: "/app/tasks", icon: CheckSquare },
  ];

  const manageNav = [
    { name: "Daily Report", href: "/app/reports/daily", icon: CalendarDays },
    { name: "Reports", href: "/app/reports", icon: FileText },
  ];

  const accountNav = [
    { name: "Notifications", href: "/app/notifications", icon: Bell },
    { name: "Profile", href: "/app/profile", icon: User },
  ];

  const adminNav = [
    { name: "Admin Dashboard", href: "/admin/dashboard", icon: ShieldCheck },
    { name: "Team Board", href: "/admin/board", icon: KanbanSquare },
    { name: "All Projects", href: "/admin/projects", icon: FolderKanban },
    { name: "All Tasks", href: "/admin/tasks", icon: CheckSquare },
    { name: "Team", href: "/admin/team", icon: Users },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  ];

  const adminAccountNav = [
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Profile", href: "/admin/profile", icon: User },
  ];

  const navSections = isAdmin
    ? [
        { title: "MANAGE", items: adminNav },
        { title: "ACCOUNT", items: adminAccountNav },
      ]
    : [
        { title: "WORKSPACE", items: memberNav },
        { title: "MANAGE", items: manageNav },
        { title: "ACCOUNT", items: accountNav },
      ];

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border/50 bg-sidebar">
      <div className="flex h-16 items-center px-6">
        <Link href={isAdmin ? "/admin/dashboard" : "/app/board"} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center center justify-center">
            <KanbanSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Taskora</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-6 px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <div className="px-3 text-xs font-semibold text-muted-foreground tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
