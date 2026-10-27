"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Users, Plus, FolderKanban } from "lucide-react";
import type { Project, Task, TaskStatus } from "@/types";
import { useProject } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { ProjectStatusBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { EmptyState } from "@/components/shared/empty-state";

interface Props {
  id: string;
  basePath: string; // "/app/projects" or "/admin/projects"
}

export function ProjectDetailView({ id, basePath }: Props) {
  const { data, isLoading } = useProject(id);
  const { data: taskData, isLoading: tasksLoading } = useTasks({ project: id, limit: 200 });

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const project: Project | undefined = data?.project;
  const tasks = useMemo(() => taskData?.tasks ?? [], [taskData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Project not found"
        description="This project may have been deleted."
        action={
          <Link href={basePath}>
            <Button variant="outline">Back to projects</Button>
          </Link>
        }
      />
    );
  }

  const pct = data?.stats ? Math.round((data.stats.completed / (data.stats.total || 1)) * 100) : 0;

  return (
    <div className="space-y-5">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: project.color || "#3b82f6" }}
            />
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditProjectOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button onClick={() => { setCreateStatus("todo"); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {data?.stats?.completed ?? 0}/{data?.stats?.total ?? 0} done · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <UserAvatar user={project.owner} size="sm" />
              <span className="font-medium">{project.owner?.name}</span>
              <span className="text-xs text-muted-foreground">Owner</span>
            </div>
            {project.members
              .filter((m) => m.id !== project.owner?.id)
              .map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <UserAvatar user={m} size="sm" />
                  <span>{m.name}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Board</h2>
        {tasksLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <KanbanBoard
            tasks={tasks}
            onAdd={(s) => { setCreateStatus(s); setCreateOpen(true); }}
            onOpen={(t) => { setDetailId(t.id); setDetailOpen(true); }}
          />
        )}
      </div>

      <TaskDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        defaultProjectId={id}
      />
      <TaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(t) => { setDetailOpen(false); setEditTask(t); setEditOpen(true); }}
      />
      <TaskDrawer open={editOpen} onOpenChange={setEditOpen} task={editTask} />
      <ProjectDrawer open={editProjectOpen} onOpenChange={setEditProjectOpen} project={project} />
    </div>
  );
}
