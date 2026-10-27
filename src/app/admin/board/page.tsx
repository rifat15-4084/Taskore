"use client";

import { useMemo, useState } from "react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { useTasks } from "@/hooks/use-tasks";
import { useUserOptions } from "@/hooks/use-users";

const ALL = "__all__";

export default function AdminBoardPage() {
  const [assignee, setAssignee] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: userData } = useUserOptions();
  const users = userData?.users ?? [];

  const params = useMemo(() => {
    const p: Record<string, string> = { limit: "400" };
    if (assignee !== ALL) p.assignee = assignee;
    return p;
  }, [assignee]);

  const { data, isLoading } = useTasks(params);
  const tasks = useMemo(() => data?.tasks ?? [], [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Board</h1>
          <p className="text-sm text-muted-foreground">Whole-team Kanban — filter by member</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <Select value={assignee} onValueChange={(v) => setAssignee(v ?? ALL)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All members</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setCreateStatus("todo"); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[300px] shrink-0 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onAdd={(s) => { setCreateStatus(s); setCreateOpen(true); }}
          onOpen={(t) => { setDetailId(t.id); setDetailOpen(true); }}
        />
      )}

      <TaskDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
      />
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
