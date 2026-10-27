"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare } from "lucide-react";
import type { Task } from "@/types";
import { PriorityBadge, DueDate } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  onOpen: (task: Task) => void;
  overlay?: boolean;
}

export function TaskCard({ task, onOpen, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  if (overlay) {
    return (
      <div className="rounded-xl border border-primary/40 bg-card p-3 shadow-xl shadow-primary/10 rotate-1 w-[280px]">
        <CardInner task={task} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card/90 p-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card",
        isDragging && "opacity-40"
      )}
      onClick={() => onOpen(task)}
    >
      <div className="absolute left-0 top-0 h-full w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-5">
        <CardInner task={task} />
      </div>
    </div>
  );
}

function CardInner({ task }: { task: Task }) {
  const commentCount = task.comments?.length ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.project && (
        <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: task.project.color || "#3b82f6" }}
          />
          {task.project.name}
        </span>
      )}
      <div className="flex items-center justify-between">
        <DueDate dueAt={task.dueAt} />
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <UserAvatar key={a.id} user={a} size="sm" className="ring-2 ring-card" />
            ))}
            {task.assignees.length > 3 && (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] text-muted-foreground ring-2 ring-card">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
