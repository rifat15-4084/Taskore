"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  CheckCheck,
  ListTodo,
  FolderKanban,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDistanceToNow, parseISO } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  unreadCount: number;
}

function iconFor(type: string) {
  switch (type) {
    case "assigned":
      return ListTodo;
    case "comment":
      return MessageSquare;
    case "project_added":
      return FolderKanban;
    case "role_changed":
      return ShieldCheck;
    case "user_added":
      return UserPlus;
    default:
      return Bell;
  }
}

export function NotificationsView() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", { page, unreadOnly }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (unreadOnly) sp.set("unread", "true");
      const res = await fetch(`/api/notifications?${sp.toString()}`);
      return res.json();
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.message || "Action failed");
        return;
      }
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Something went wrong"),
  });

  const toggleRead = useMutation({
    mutationFn: async (n: NotificationItem) => {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: !n.read }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("Something went wrong"),
  });

  const items = data?.notifications ?? [];
  const pages = data?.pages ?? 1;
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
          >
            <BellOff className="mr-1.5 h-3.5 w-3.5" /> Unread only
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="You'll be notified when someone assigns you a task, comments, or adds you to a project."
        />
      ) : (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="divide-y divide-border/50 p-0">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              const content = (
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      n.read ? "bg-accent" : "bg-primary/15 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", n.read ? "text-muted-foreground" : "font-medium")}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              );

              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-center transition-colors",
                    n.read ? "" : "bg-primary/5"
                  )}
                >
                  {n.link ? (
                    <Link href={n.link} className="min-w-0 flex-1 hover:bg-accent/40">
                      {content}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{content}</div>
                  )}
                  <button
                    onClick={() => toggleRead.mutate(n)}
                    className="mr-3 shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    {n.read ? "Mark unread" : "Mark read"}
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
