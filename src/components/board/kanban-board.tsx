"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types";
import { STATUS_COLUMNS } from "@/types";
import { BoardColumn } from "./board-column";
import { TaskCard } from "./task-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useInvalidateTasks } from "@/hooks/use-tasks";
import { ClipboardList } from "lucide-react";

interface Props {
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
  onOpen: (task: Task) => void;
}

const COLUMNS = STATUS_COLUMNS.map((c) => c.status);

function emptyGrouped(): Record<TaskStatus, Task[]> {
  return {
    todo: [],
    in_progress: [],
    in_review: [],
    hold: [],
    completed: [],
  };
}

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const g = emptyGrouped();
  for (const t of tasks) {
    if (g[t.status]) g[t.status].push(t);
  }
  for (const key of COLUMNS) {
    g[key].sort((a, b) => a.position - b.position);
  }
  return g;
}

function findColumn(grouped: Record<TaskStatus, Task[]>, taskId: string): TaskStatus | null {
  for (const key of COLUMNS) {
    if (grouped[key].some((t) => t.id === taskId)) return key;
  }
  return null;
}

export function KanbanBoard({ tasks, onAdd, onOpen }: Props) {
  const [sourceTasks, setSourceTasks] = useState<Task[]>(tasks);
  const [grouped, setGrouped] = useState<Record<TaskStatus, Task[]>>(() => groupByStatus(tasks));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const invalidate = useInvalidateTasks();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Re-derive grouped state when the source tasks change (during render, not in an effect)
  if (sourceTasks !== tasks) {
    setSourceTasks(tasks);
    setGrouped(groupByStatus(tasks));
  }

  const total = useMemo(() => tasks.length, [tasks]);

  async function persist(id: string, status: TaskStatus, position: number, snapshot: Record<TaskStatus, Task[]>) {
    try {
      const res = await fetch(`/api/tasks/${id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, position }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Move failed");
      }
      invalidate();
    } catch (err) {
      setGrouped(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not move task");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const col = findColumn(grouped, id);
    if (col) setActiveTask(grouped[col].find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceCol = findColumn(grouped, activeId);
    if (!sourceCol) return;

    const isColumn = COLUMNS.includes(overId as TaskStatus);
    let targetCol: TaskStatus;
    let targetIndex: number;

    if (isColumn) {
      targetCol = overId as TaskStatus;
      targetIndex = grouped[targetCol].length;
    } else {
      const overCol = findColumn(grouped, overId);
      if (!overCol) return;
      targetCol = overCol;
      targetIndex = grouped[targetCol].findIndex((t) => t.id === overId);
    }

    const snapshot = JSON.parse(JSON.stringify(grouped)) as Record<TaskStatus, Task[]>;

    const activeIndex = grouped[sourceCol].findIndex((t) => t.id === activeId);
    const moving = grouped[sourceCol][activeIndex];

    const next: Record<TaskStatus, Task[]> = { ...grouped };
    next[sourceCol] = grouped[sourceCol].filter((t) => t.id !== activeId);

    const targetList = [...next[targetCol]];
    let insertIndex = targetIndex;
    if (sourceCol === targetCol && activeIndex < targetIndex) {
      insertIndex = targetIndex;
    }
    if (insertIndex < 0 || insertIndex > targetList.length) insertIndex = targetList.length;

    targetList.splice(insertIndex, 0, { ...moving, status: targetCol });
    next[targetCol] = targetList;

    for (const key of COLUMNS) {
      next[key] = next[key].map((t, i) => ({ ...t, position: i }));
    }

    setGrouped(next);
    persist(activeId, targetCol, insertIndex, snapshot);
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks here yet"
        description="Create your first task to get started, or adjust your filters."
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-smooth">
        {COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            onAdd={onAdd}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-2">
            <TaskCard task={activeTask} onOpen={() => {}} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
