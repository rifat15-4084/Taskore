import { PRIORITY_META, STATUS_COLUMNS, PROJECT_STATUS_META } from "@/types";
import type { TaskPriority, TaskStatus, ProjectStatus } from "@/types";
import { isPast, parseISO } from "date-fns";
import { CalendarClock, AlertTriangle } from "lucide-react";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const col = STATUS_COLUMNS.find((c) => c.status === status);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${col?.color}`} />
      {col?.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function DueDate({ dueAt, className = "" }: { dueAt?: string | null; className?: string }) {
  if (!dueAt) return null;
  const date = typeof dueAt === "string" ? parseISO(dueAt) : dueAt;
  const overdue = isPast(date) && !isNaN(date.getTime());
  const formatted = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] ${overdue ? "text-red-400 font-medium" : "text-muted-foreground"} ${className}`}
    >
      {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
      {formatted}
      {overdue && " · overdue"}
    </span>
  );
}
