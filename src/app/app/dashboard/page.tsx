"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  ListTodo,
  Loader2,
  CheckCircle2,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { STATUS_COLUMNS } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ProjectStatusBadge, PriorityBadge, DueDate } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";

interface MemberDash {
  success: boolean;
  stats: {
    totalTasks: number;
    projects: number;
    todo: number;
    in_progress: number;
    completed: number;
    byStatus: { _id: string; count: number }[];
  };
  upcoming: { id: string; title: string; dueAt: string; status: string; priority: string }[];
  recentProjects: { _id: string; name: string; status: string; color?: string }[];
}

export default function MemberDashboardPage() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useQuery<MemberDash>({
    queryKey: ["member-dashboard"],
    queryFn: async () => (await fetch("/api/dashboard/member")).json(),
  });

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUS_COLUMNS) map[s.status] = 0;
    for (const row of data?.stats.byStatus ?? []) map[row._id] = row.count;
    return map;
  }, [data]);

  const total = data?.stats.totalTasks || 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const cards = [
    { label: "Projects", value: data?.stats.projects ?? 0, icon: FolderKanban, color: "text-amber-400" },
    { label: "To Do", value: data?.stats.todo ?? 0, icon: ListTodo, color: "text-slate-400" },
    { label: "In Progress", value: data?.stats.in_progress ?? 0, icon: Loader2, color: "text-cyan-400" },
    { label: "Completed", value: data?.stats.completed ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name ?? "there"}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s an overview of your work</p>
        </div>
        <Link href="/app/tasks">
          <Button>
            View my tasks <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold">{c.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks by status */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {STATUS_COLUMNS.map((col) => {
              const count = statusCounts[col.status] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={col.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      {col.label}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full ${col.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.upcoming ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nothing due soon"
                description="You have no tasks due in the next 7 days."
              />
            ) : (
              <div className="space-y-3">
                {data?.upcoming.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <DueDate dueAt={t.dueAt} />
                    </div>
                    <PriorityBadge priority={t.priority as never} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent projects */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent projects</CardTitle>
          <Link href="/app/projects" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {(data?.recentProjects ?? []).length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to start organizing your tasks."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.recentProjects.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color || "#3b82f6" }}
                    />
                    {p.name}
                  </span>
                  <ProjectStatusBadge status={p.status as never} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
