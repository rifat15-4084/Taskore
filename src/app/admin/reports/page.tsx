"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Users, BarChart3, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { useUserOptions } from "@/hooks/use-users";
import { useProjects } from "@/hooks/use-projects";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { STATUS_COLUMNS } from "@/types";

const ALL = "__all__";

interface TeamReport {
  success: boolean;
  range: { from: string; to: string };
  totals: {
    members: number;
    projects: number;
    byStatus: { _id: string; count: number }[];
    completed: number;
    total: number;
  };
  perMember: {
    _id: string;
    total: number;
    completed: number;
    overdue: number;
    name?: string;
    email?: string;
    avatarColor?: string;
  }[];
  perProject: { _id: string | null; total: number; completed: number; name?: string; color?: string }[];
  dailyReports: {
    id: string;
    date: string;
    summary: string;
    blockers?: string;
    hoursWorked?: number;
    user: { name?: string; email?: string; avatarColor?: string } | null;
  }[];
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [member, setMember] = useState(ALL);
  const [project, setProject] = useState(ALL);
  const [exporting, setExporting] = useState(false);

  const { data: userData } = useUserOptions();
  const { data: projData } = useProjects();
  const users = userData?.users ?? [];
  const projects = projData?.projects ?? [];

  const params = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (member !== ALL) p.set("userId", member);
    if (project !== ALL) p.set("projectId", project);
    return p.toString();
  }, [from, to, member, project]);

  const { data, isLoading } = useQuery<TeamReport>({
    queryKey: ["team-report", params],
    queryFn: async () => (await fetch(`/api/reports/team?${params}`)).json(),
  });

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/reports/team?${params}&format=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taskora-report-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // toast imported lazily to keep bundle lean
      const { toast } = await import("sonner");
      toast.error("Could not export CSV");
    } finally {
      setExporting(false);
    }
  }

  const statusMap = new Map((data?.totals.byStatus ?? []).map((s) => [s._id, s.count]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Reports</h1>
          <p className="text-sm text-muted-foreground">Performance across members and projects</p>
        </div>
        <Button onClick={exportCsv} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-from">From</Label>
            <Input id="rp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-to">To</Label>
            <Input id="rp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Select value={member} onValueChange={(v) => setMember(v ?? ALL)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All members" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All members</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={project} onValueChange={(v) => setProject(v ?? ALL)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Tasks in range</p>
                  <p className="text-3xl font-bold">{data?.totals.total ?? 0}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                  <BarChart3 className="h-5 w-5 text-violet-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{data?.totals.completed ?? 0}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Hours logged</p>
                  <p className="text-3xl font-bold">
                    {(data?.dailyReports ?? [])
                      .reduce((s, r) => s + (r.hoursWorked ?? 0), 0)
                      .toFixed(1)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per member */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Per member</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(data?.perMember ?? []).length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={Users}
                    title="No activity in this range"
                    description="Try widening the date range or clearing filters."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Member</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead className="hidden md:table-cell">Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.perMember ?? []).map((m) => {
                      const pct = m.total ? Math.round((m.completed / m.total) * 100) : 0;
                      return (
                        <TableRow key={m._id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                user={{ id: m._id, name: m.name ?? "?", email: m.email ?? "", avatarColor: m.avatarColor }}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium">{m.name ?? "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{m.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{m.total}</TableCell>
                          <TableCell className="text-emerald-400">{m.completed}</TableCell>
                          <TableCell className={m.overdue > 0 ? "text-red-400" : "text-muted-foreground"}>
                            {m.overdue}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-accent">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per project */}
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Per project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.perProject ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No project activity</p>
                ) : (
                  (data?.perProject ?? []).map((p) => {
                    const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
                    return (
                      <div key={p._id ?? "none"} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: p.color || "#64748b" }}
                            />
                            {p.name ?? "Standalone tasks"}
                          </span>
                          <span className="text-muted-foreground">
                            {p.completed}/{p.total} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status breakdown</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {STATUS_COLUMNS.map((col) => (
                  <div key={col.status} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${col.color}`} />
                      {col.label}
                    </div>
                    <p className="text-xl font-bold">{statusMap.get(col.status) ?? 0}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Daily reports */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Team daily reports</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.dailyReports ?? []).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No daily reports in this range
                </p>
              ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {(data?.dailyReports ?? []).map((r) => (
                    <div key={r.id} className="rounded-lg border border-border/60 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-semibold">
                          <UserAvatar
                            user={{ id: "", name: r.user?.name ?? "?", email: r.user?.email ?? "", avatarColor: r.user?.avatarColor }}
                            size="sm"
                          />
                          {r.user?.name ?? "Unknown"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.date}
                          {typeof r.hoursWorked === "number" ? ` · ${r.hoursWorked}h` : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>
                      {r.blockers && (
                        <p className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                          ⚠ {r.blockers}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
