"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotebookPen, ArrowRight, CheckCircle2, ListTodo, Clock } from "lucide-react";
import { STATUS_COLUMNS } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { CompletionTrendLine } from "@/components/charts/dashboard-charts";
import { format, parseISO, subDays } from "date-fns";

interface MyReports {
  success: boolean;
  reports: {
    id: string;
    date: string;
    summary: string;
    blockers?: string;
    hoursWorked?: number;
  }[];
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery<MyReports>({
    queryKey: ["daily-reports"],
    queryFn: async () => (await fetch("/api/reports/daily")).json(),
  });

  const { data: dash } = useQuery<{
    stats: { completed: number; totalTasks: number; byStatus: { _id: string; count: number }[] };
  }>({
    queryKey: ["member-dashboard"],
    queryFn: async () => (await fetch("/api/dashboard/member")).json(),
  });

  const reports = useMemo(() => data?.reports ?? [], [data]);
  const totalHours = useMemo(
    () => reports.reduce((sum, r) => sum + (r.hoursWorked ?? 0), 0),
    [reports]
  );

  const byStatus = dash?.stats.byStatus ?? [];
  const statusMap = new Map(byStatus.map((s) => [s._id, s.count]));

  // Simple 30-day stub trend from report dates (days with a report = 1)
  const trend = useMemo(() => {
    const daysWithReport = new Set(reports.map((r) => r.date));
    const rows: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      rows.push({ date: key, count: daysWithReport.has(key) ? 1 : 0 });
    }
    return rows;
  }, [reports]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Your personal work summary</p>
        </div>
        <Link href="/app/reports/daily">
          <Button>
            <NotebookPen className="mr-1.5 h-4 w-4" /> Write daily report
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Tasks completed</p>
              <p className="text-3xl font-bold">{dash?.stats.completed ?? 0}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Reports submitted</p>
              <p className="text-3xl font-bold">{reports.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
              <ListTodo className="h-5 w-5 text-violet-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Hours logged</p>
              <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  {col.label}
                </span>
                <span className="font-medium">{statusMap.get(col.status) ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Days with a report (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionTrendLine data={trend} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report history</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No reports yet"
              description="Start tracking your work by submitting a daily report."
              action={
                <Link href="/app/reports/daily">
                  <Button>
                    <NotebookPen className="mr-1.5 h-4 w-4" /> Write daily report
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-border/50">
              {reports.slice(0, 10).map((r) => (
                <div key={r.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      {format(parseISO(r.date), "EEEE, MMM d, yyyy")}
                    </span>
                    {typeof r.hoursWorked === "number" && (
                      <span className="text-[11px] text-muted-foreground">{r.hoursWorked}h</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
