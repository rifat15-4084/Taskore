"use client";

import { Menu, Moon, Sun, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const { user } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/admin");

  const { data: notif } = useQuery<{ unreadCount: number }>({
    queryKey: ["notifications", "unread-badge"],
    queryFn: async () => (await fetch("/api/notifications?limit=1")).json(),
    refetchInterval: 60 * 1000,
  });
  const unread = notif?.unreadCount ?? 0;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  };

  const displayName = user?.name ?? "";
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(mounted && theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        onClick={() => router.push(isAdminArea ? "/admin/notifications" : "/app/notifications")}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium">{displayName}</span>
          {user?.role && (
            <Badge variant="outline" className="text-xs capitalize">
              {user.role}
            </Badge>
          )}
        </div>
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log Out
        </Button>
      </div>
    </header>
  );
}
