"use client";

import { useMemo, useState } from "react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Search, X } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { PRIORITY_META } from "@/types";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { PriorityBadge, DueDate, StatusBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";

const ALL = "__all__";

export default function BoardPage() {
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState(ALL);
  const [priority, setPriority] = useState(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [createProject, setCreateProject] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: projData } = useProjects();
  const projects = projData?.projects ?? [];

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.q = search;
    if (project !== ALL) p.project = project;
    if (priority !== ALL) p.priority = priority;
    p.limit = "200";
    return p;
  }, [search, project, priority]);

  const { data, isLoading } = useTasks(params);
  const tasks = useMemo(() => data?.tasks ?? [], [data]);

  function openCreate(status: TaskStatus) {
    setCreateStatus(status);
    setCreateProject(project !== ALL ? project : null);
    setCreateOpen(true);
  }

  function openDetail(task: Task) {
    setDetailId(task.id);
    setDetailOpen(true);
  }

  function openEdit(task: Task) {
    setDetailOpen(false);
    setEditTask(task);
    setEditOpen(true);
  }

  const hasFilters = search || project !== ALL || priority !== ALL;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Board</h1>
          <p className="text-sm text-muted-foreground">Drag tasks between columns to update status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/60 p-0.5">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${view === "board" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <Button onClick={() => openCreate("todo")}>
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-56 pl-8"
          />
        </div>
        <Select value={project} onValueChange={(v) => setProject(v ?? ALL)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            <SelectItem value="none">No project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v ?? ALL)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setProject(ALL);
              setPriority(ALL);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[300px] shrink-0 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : view === "board" ? (
        <KanbanBoard tasks={tasks} onAdd={openCreate} onOpen={openDetail} />
      ) : (
        <ListView tasks={tasks} onOpen={openDetail} />
      )}

      <TaskDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        defaultProjectId={createProject}
      />
      <TaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
      />
      <TaskDrawer open={editOpen} onOpenChange={setEditOpen} task={editTask} />
    </div>
  );
}

function ListView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  if (tasks.length === 0) {
    return (
      <EmptyState icon={ClipboardList} title="No tasks" description="No tasks match your filters." />
    );
  }
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="divide-y divide-border/50">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <div className="mt-1 flex items-center gap-3">
                <StatusBadge status={t.status} />
                <DueDate dueAt={t.dueAt} />
              </div>
            </div>
            <PriorityBadge priority={t.priority} />
            <div className="flex -space-x-1.5">
              {t.assignees.slice(0, 3).map((a) => (
                <UserAvatar key={a.id} user={a} size="sm" className="ring-2 ring-background" />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
