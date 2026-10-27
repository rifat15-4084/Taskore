"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2, NotebookPen, Clock, AlertTriangle } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface ReportItem {
  id: string;
  date: string;
  summary: string;
  blockers?: string;
  hoursWorked?: number;
  createdAt: string;
}

interface ReportsResponse {
  success: boolean;
  reports: ReportItem[];
}

export default function DailyReportsPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hours, setHours] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const { data: taskData } = useTasks({ limit: "100" });
  const tasks = useMemo(() => taskData?.tasks ?? [], [taskData]);

  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ["daily-reports"],
    queryFn: async () => (await fetch("/api/reports/daily")).json(),
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.message || "Could not save report");
        return;
      }
      toast.success("Daily report saved");
      qc.invalidateQueries({ queryKey: ["daily-reports"] });
    },
    onError: () => toast.error("Something went wrong"),
  });

  function handleSubmit() {
    if (!summary.trim()) {
      toast.error("Please write a short summary");
      return;
    }
    save.mutate({
      date,
      summary: summary.trim(),
      blockers: blockers.trim(),
      hoursWorked: hours ? Number(hours) : undefined,
      tasksWorkedOn: selectedTasks,
    });
  }

  function toggleTask(id: string) {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const reports = data?.reports ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Report</h1>
        <p className="text-sm text-muted-foreground">
          Log what you worked on today — one report per day
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="h-4 w-4 text-muted-foreground" /> Today&apos;s report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dr-date">Date</Label>
                <Input
                  id="dr-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dr-hours">Hours worked</Label>
                <Input
                  id="dr-hours"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 6.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dr-summary">What did you work on? *</Label>
              <Textarea
                id="dr-summary"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Finished the onboarding flow, fixed 3 bugs in checkout..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dr-blockers">Blockers</Label>
              <Textarea
                id="dr-blockers"
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Anything blocking your progress?"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tasks worked on</Label>
                {selectedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTasks([])}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear ({selectedTasks.length})
                  </button>
                )}
              </div>
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 p-2">
                {tasks.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">No tasks available</p>
                )}
                {tasks.map((t) => {
                  const selected = selectedTasks.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        selected ? "bg-primary/10 text-foreground" : "hover:bg-accent/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                          selected ? "border-primary bg-primary" : "border-border"
                        )}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-sm bg-background" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save report
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title="No reports yet"
                description="Save your first daily report using the form."
              />
            ) : (
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        {format(parseISO(r.date), "EEEE, MMM d, yyyy")}
                      </span>
                      {typeof r.hoursWorked === "number" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {r.hoursWorked}h
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.summary}</p>
                    {r.blockers && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{r.blockers}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
