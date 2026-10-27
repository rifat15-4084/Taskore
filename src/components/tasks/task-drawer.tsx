"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2, FolderPlus } from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import type { Task, TaskStatus, TaskPriority, Project } from "@/types";
import { STATUS_COLUMNS, PRIORITY_META } from "@/types";
import { useUserOptions } from "@/hooks/use-users";
import { useProjects, useInvalidateProjects } from "@/hooks/use-projects";
import { useInvalidateTasks } from "@/hooks/use-tasks";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  onSaved?: () => void;
}

const ALL_CATEGORIES = ["Design", "Engineering", "Marketing", "Bug", "Research", "Docs"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  try { return format(parseISO(iso), "yyyy-MM-dd"); } catch { return ""; }
}
function toTimeInput(iso?: string | null) {
  if (!iso) return "";
  try { return format(parseISO(iso), "HH:mm"); } catch { return ""; }
}
function combineDue(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "23:59"}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function TaskDrawer(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <TaskForm {...props} />
      </SheetContent>
    </Sheet>
  );
}

function TaskForm({
  onOpenChange,
  task,
  defaultStatus = "todo",
  defaultProjectId = null,
  onSaved,
}: Omit<Props, "open">) {
  const isEdit = !!task;
  const { user: me } = useCurrentUser();
  const { data: userOpts } = useUserOptions();
  const { data: projData } = useProjects();
  const invalidateTasks = useInvalidateTasks();
  const invalidateProjects = useInvalidateProjects();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [project, setProject] = useState(task?.project?.id ?? defaultProjectId ?? "none");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueAt));
  const [dueTime, setDueTime] = useState(toTimeInput(task?.dueAt));
  const [category, setCategory] = useState(task?.category ?? "");
  const [assignees, setAssignees] = useState<string[]>(
    task ? task.assignees.map((a) => a.id) : me ? [me.id] : []
  );
  const [notifyByEmail, setNotifyByEmail] = useState(task?.notifyByEmail ?? false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const projects: Project[] = useMemo(() => projData?.projects ?? [], [projData]);
  const isAdminUser = me?.role === "admin";
  const canDelete = isEdit && (isAdminUser || task?.createdBy?.id === me?.id);

  const assigneeOptions = useMemo(() => {
    const all = userOpts?.users ?? [];
    if (isAdminUser) return all;
    const allowed = new Set<string>();
    if (me) allowed.add(me.id);
    const chosen = projects.find((p) => p.id === project);
    if (chosen) {
      for (const m of chosen.members) allowed.add(m.id);
      allowed.add(chosen.owner.id);
    }
    return all.filter((u) => allowed.has(u.id));
  }, [userOpts, isAdminUser, me, projects, project]);

  const categories = useMemo(() => {
    const set = new Set(ALL_CATEGORIES);
    if (task) {
      if (task.category) set.add(task.category);
    }
    return Array.from(set);
  }, [task]);

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      project: project === "none" ? null : project,
      status,
      priority,
      category: category.trim() || undefined,
      dueAt: combineDue(dueDate, dueTime),
      assignees,
      notifyByEmail,
    };
    try {
      const res = await fetch(isEdit ? `/api/tasks/${task!.id}` : "/api/tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Something went wrong"); return; }
      toast.success(isEdit ? "Task updated" : "Task created");
      invalidateTasks();
      invalidateProjects();
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Could not delete task"); return; }
      toast.success("Task deleted");
      invalidateTasks();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  function toggleAssignee(id: string) {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const quickChips = [
    { label: "Today", date: format(startOfDay(new Date()), "yyyy-MM-dd") },
    { label: "Tomorrow", date: format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd") },
    { label: "Next week", date: format(addDays(startOfDay(new Date()), 7), "yyyy-MM-dd") },
  ];

  return (
    <>
      <SheetHeader className="border-b border-border/50 px-5 py-4">
        <SheetTitle>{isEdit ? "Edit Task" : "Create Task"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "Update the task details below." : "Add a new task to your workspace."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-2">
          <Label>Project</Label>
          <div className="flex gap-2">
            <Select value={project} onValueChange={(v) => setProject(v ?? "none")}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="No project (standalone task)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project (standalone task)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/app/projects" onClick={() => onOpenChange(false)}>
              <Button type="button" variant="outline" size="icon" title="New project">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-title">Title *</Label>
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design the onboarding flow" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-desc">Description</Label>
          <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more details..." rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((c) => (<SelectItem key={c.status} value={c.status}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Deadline</Label>
            {(dueDate || dueTime) && (
              <button type="button" onClick={() => { setDueDate(""); setDueTime(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                No deadline
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex-1" />
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="w-32" />
          </div>
          <div className="flex gap-2">
            {quickChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setDueDate(chip.date)}
                className={cn(
                  "rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
                  dueDate === chip.date && "border-primary/60 bg-primary/10 text-primary"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Input list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type a new category" />
          <datalist id="category-options">
            {categories.map((c) => (<option key={c} value={c} />))}
          </datalist>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Assignees</Label>
            {assignees.length > 0 && (
              <button type="button" onClick={() => setAssignees([])} className="text-xs text-primary hover:underline">
                Clear ({assignees.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {assigneeOptions.map((u) => {
              const selected = assignees.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                    selected ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-border"
                  )}
                >
                  <UserAvatar user={u} size="sm" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground">{u.email}</span>
                  </span>
                </button>
              );
            })}
            {assigneeOptions.length === 0 && <p className="text-xs text-muted-foreground">No available users</p>}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
          <Checkbox id="notify" checked={notifyByEmail} onCheckedChange={(v) => setNotifyByEmail(v === true)} className="mt-0.5" />
          <div className="space-y-0.5">
            <Label htmlFor="notify" className="cursor-pointer">Notify assignees by email</Label>
            <p className="text-xs text-muted-foreground">An assignment email will be sent to {assignees.length} user(s)</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between gap-2">
        {canDelete ? (
          <Button type="button" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{task?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
