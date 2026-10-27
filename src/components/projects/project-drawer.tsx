"use client";

import { useState } from "react";
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
import { Loader2, Trash2, Archive } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";
import { useInvalidateProjects } from "@/hooks/use-projects";
import { useCurrentUser } from "@/hooks/use-current-user";

const STATUS_OPTIONS: ProjectStatus[] = ["planning", "active", "on_hold", "completed"];
const COLORS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: Project | null;
  onSaved?: () => void;
}

export function ProjectDrawer({ open, onOpenChange, project, onSaved }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <ProjectForm project={project} onOpenChange={onOpenChange} onSaved={onSaved} />
      </SheetContent>
    </Sheet>
  );
}

function ProjectForm({
  project,
  onOpenChange,
  onSaved,
}: {
  project?: Project | null;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  const isEdit = !!project;
  const { user: me } = useCurrentUser();
  const invalidate = useInvalidateProjects();

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
  const [color, setColor] = useState(project?.color || COLORS[0]);
  const [deadline, setDeadline] = useState(project?.deadline ? project.deadline.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = isEdit && (me?.role === "admin" || project?.owner?.id === me?.id);

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      status,
      color,
      deadline: deadline ? new Date(`${deadline}T23:59:00`).toISOString() : null,
    };
    try {
      const res = await fetch(isEdit ? `/api/projects/${project!.id}` : "/api/projects", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Something went wrong"); return; }
      toast.success(isEdit ? "Project updated" : "Project created");
      invalidate();
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Could not delete project"); return; }
      toast.success("Project deleted");
      invalidate();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  async function handleArchive() {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !project.archived }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast.error(data.message || "Could not archive project"); return; }
      toast.success(project.archived ? "Project unarchived" : "Project archived");
      invalidate();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SheetHeader className="border-b border-border/50 px-5 py-4">
        <SheetTitle>{isEdit ? "Edit Project" : "New Project"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "Update project details." : "Create a project to organize tasks."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="proj-name">Name *</Label>
          <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proj-desc">Description</Label>
          <Textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between gap-2">
        {canDelete ? (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleArchive}>
              <Archive className="mr-1.5 h-4 w-4" />
              {project?.archived ? "Unarchive" : "Archive"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks in &quot;{project?.name}&quot; will become standalone tasks. This cannot be undone.
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
