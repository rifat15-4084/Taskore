"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FolderKanban, Users, CalendarDays } from "lucide-react";
import type { Project } from "@/types";
import { useProjects } from "@/hooks/use-projects";
import { ProjectStatusBadge } from "@/components/shared/badges";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { format, parseISO, isPast } from "date-fns";

export default function AdminProjectsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const { data, isLoading } = useProjects({ archived });

  const projects = (data?.projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase())
  );

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Projects</h1>
          <p className="text-sm text-muted-foreground">Manage every project across the team</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects..."
            className="w-56 pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={archived} onCheckedChange={(v) => setArchived(v === true)} />
          Show archived
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects"
          description="Create a project to get started."
          action={<Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> New project</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const pct = p.progress
              ? Math.round((p.progress.completed / (p.progress.total || 1)) * 100)
              : 0;
            const overdue =
              p.deadline && isPast(parseISO(p.deadline)) && p.status !== "completed";
            return (
              <Link key={p.id} href={`/admin/projects/${p.id}`}>
                <Card
                  className={`group h-full cursor-pointer border-border/60 bg-card/60 backdrop-blur transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${p.archived ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.color || "#3b82f6" }}
                        />
                        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.archived && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Archived
                          </span>
                        )}
                        <ProjectStatusBadge status={p.status} />
                      </div>
                    </div>

                    {p.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {p.members.length}
                      </span>
                      {p.deadline ? (
                        <span className={`flex items-center gap-1 ${overdue ? "text-red-400" : ""}`}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          {format(parseISO(p.deadline), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">No deadline</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectDrawer open={open} onOpenChange={setOpen} project={editing} />
    </div>
  );
}
