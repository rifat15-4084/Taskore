"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Activity,
  ListTodo,
} from "lucide-react";
import { STATUS_COLUMNS } from "@/types";
import {
  TasksByStatusPie,
  TasksPerMemberBar,
  CompletionTrendLine,
} from "@/components/charts/dashboard-charts";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDistanceToNow, parseISO } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";

interface AdminDash {
  success: boolean;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalTasks: number;
    todo: number;
    in_progress: number;
    in_review: number;
    hold: number;
    completed: number;
    overdue: number;
    byStatus: { _id: string; count: number }[];
  };
  charts: {
    tasksPerMember: { _id: string; count: number; name: string; avatarColor?: string }[];
    completionTrend: { date: string; count: number }[];
    workload: { _id: string; name: string; open: number; avatarColor?: string; role: string }[];
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    actor: { name: string; avatarColor?: string } | null;
    meta?: Record<string, unknown>;
    createdAt: string;
  }[];
}

const ACTION_LABELS: Record<string, string> = {
  "task.created": "created a task",
  "task.updated": "updated a task",
  "task.completed": "completed a task",
  "project.created": "created a project",
  "user.created": "added a team member",
  "comment.added": "commented",
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminDash>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await fetch("/api/dashboard/admin")).json(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full lg:col-span-2" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const s = data?.stats;
  const cards = [
    { label: "Projects", value: s?.totalProjects ?? 0, icon: FolderKanban, color: "text-amber-400" },
    { label: "Users", value: s?.activeUsers ?? 0, sub: `of ${s?.totalUsers ?? 0}`, icon: Users, color: "text-cyan-400" },
    { label: "Total Tasks", value: s?.totalTasks ?? 0, icon: CheckSquare, color: "text-violet-400" },
    { label: "Overdue", value: s?.overdue ?? 0, icon: AlertTriangle, color: "text-red-400" },
  ];

  const workload = data?.charts.workload ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Team-wide overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold">
                  {c.value}
                  {"sub" in c && c.sub && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">{c.sub}</span>
                  )}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task status mini bars */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-muted-foreground" /> Tasks by status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.status} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                {col.label}
              </div>
              <p className="text-xl font-bold">
                {s?.byStatus?.find((b) => b._id === col.status)?.count ?? 0}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completion trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionTrendLine data={data?.charts.completionTrend ?? []} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by status</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksByStatusPie data={data?.stats.byStatus ?? []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks per member</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksPerMemberBar data={data?.charts.tasksPerMember ?? []} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workload (open tasks)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workload.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              workload.map((w) => (
                <div key={w._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar user={{ id: w._id, name: w.name, email: "", avatarColor: w.avatarColor }} size="sm" />
                    <span className="truncate text-sm">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-accent">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (w.open / (workload[0].open || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm font-medium">{w.open}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentActivity ?? []).length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" description="Actions will appear here." />
            ) : (
              data?.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <UserAvatar
                    user={{ id: "", name: a.actor?.name ?? "?", email: "", avatarColor: a.actor?.avatarColor }}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.actor?.name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[a.action] ?? a.action}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
