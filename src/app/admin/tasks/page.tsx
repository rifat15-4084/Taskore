"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, ChevronLeft, ChevronRight, ClipboardList, ArrowUpDown } from "lucide-react";
import type { Task, TaskPriority } from "@/types";
import { STATUS_COLUMNS, PRIORITY_META } from "@/types";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useUserOptions } from "@/hooks/use-users";
import { PriorityBadge, DueDate, StatusBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";

const ALL = "__all__";
type SortKey = "title" | "priority" | "dueAt" | "status" | "createdAt";

function SortHead({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className={`inline-flex items-center gap-1 hover:text-foreground ${sort === k ? "text-foreground" : ""}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sort === k ? "opacity-100 text-primary" : "opacity-60"}`} />
    </button>
  );
}

export default function AdminTasksPage() {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: projData } = useProjects();
  const { data: userData } = useUserOptions();
  const projects = projData?.projects ?? [];
  const users = userData?.users ?? [];

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.q = search;
    if (project !== ALL) p.project = project;
    if (assignee !== ALL) p.assignee = assignee;
    if (priority !== ALL) p.priority = priority;
    if (status !== ALL) p.status = status;
    p.page = String(page);
    p.limit = String(limit);
    return p;
  }, [search, project, assignee, priority, status, page, limit]);

  const { data, isLoading } = useTasks(params);

  const tasks = useMemo(() => {
    const list = [...(data?.tasks ?? [])];
    const prioOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    list.sort((a, b) => {
      let cmp = 0;
      if (sort === "title") cmp = a.title.localeCompare(b.title);
      else if (sort === "priority") cmp = prioOrder[a.priority] - prioOrder[b.priority];
      else if (sort === "status")
        cmp =
          STATUS_COLUMNS.findIndex((c) => c.status === a.status) -
          STATUS_COLUMNS.findIndex((c) => c.status === b.status);
      else if (sort === "dueAt")
        cmp =
          (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) -
          (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, sort, dir]);

  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  function toggleSort(key: SortKey) {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "title" || key === "priority" || key === "status" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
          <p className="text-sm text-muted-foreground">Every task across the team</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks..."
            className="w-52 pl-8"
          />
        </div>
        <Select value={project} onValueChange={(v) => { setProject(v ?? ALL); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={(v) => { setAssignee(v ?? ALL); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Member" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All members</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? ALL); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_COLUMNS.map((c) => (
              <SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => { setPriority(v ?? ALL); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks found"
          description="Try adjusting your filters or create a new task."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New task</Button>}
        />
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead><SortHead label="Title" k="title" sort={sort} onSort={toggleSort} /></TableHead>
                <TableHead>Status</TableHead>
                <TableHead><SortHead label="Priority" k="priority" sort={sort} onSort={toggleSort} /></TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden lg:table-cell">Assignees</TableHead>
                <TableHead><SortHead label="Due" k="dueAt" sort={sort} onSort={toggleSort} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => { setDetailId(t.id); setDetailOpen(true); }}
                >
                  <TableCell className="font-medium max-w-[240px] truncate">{t.title}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t.project ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.project.color || "#3b82f6" }} />
                        {t.project.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex -space-x-1.5">
                      {t.assignees.slice(0, 3).map((a) => (
                        <UserAvatar key={a.id} user={a} size="sm" className="ring-2 ring-background" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><DueDate dueAt={t.dueAt} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages} · {total} tasks
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

      <TaskDrawer open={createOpen} onOpenChange={setCreateOpen} />
      <TaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(t) => { setDetailOpen(false); setEditTask(t); setEditOpen(true); }}
      />
      <TaskDrawer open={editOpen} onOpenChange={setEditOpen} task={editTask} />
    </div>
  );
}
