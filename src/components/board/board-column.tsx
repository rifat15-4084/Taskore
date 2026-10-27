"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_COLUMNS } from "@/types";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
  onOpen: (task: Task) => void;
}

export function BoardColumn({ status, tasks, onAdd, onOpen }: Props) {
  const meta = STATUS_COLUMNS.find((c) => c.status === status)!;
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column", status } });

  return (
    <div className="flex w-[300px] shrink-0 snap-start flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", meta.color)} />
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(status)}
          aria-label={`Add task to ${meta.label}`}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2.5 rounded-xl border border-dashed p-2 min-h-[200px] transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "border-border/40 bg-muted/20"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No tasks</p>
        )}
      </div>
    </div>
  );
}
