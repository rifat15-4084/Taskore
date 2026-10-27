"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Pencil, Send, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Task } from "@/types";
import { PriorityBadge, StatusBadge, DueDate } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useTask, useInvalidateTasks } from "@/hooks/use-tasks";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
}

export function TaskDetailDrawer({ taskId, open, onOpenChange, onEdit }: Props) {
  const { data } = useTask(open ? taskId : null);
  const { user: me } = useCurrentUser();
  const invalidate = useInvalidateTasks();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const task = data?.task;

  async function addComment() {
    if (!task || !text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not add comment");
        return;
      }
      setText("");
      invalidate();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const canEdit = task && me && (me.role === "admin" || task.createdBy?.id === me.id || task.assignees?.some((a) => a.id === me.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {!task ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border/50 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="line-clamp-2 pr-2">{task.title}</SheetTitle>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.project && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.project.color || "#3b82f6" }}
                    />
                    {task.project.name}
                  </span>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                  <DueDate dueAt={task.dueAt} />
                  {!task.dueAt && <span className="text-xs text-muted-foreground">No deadline</span>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="text-sm">{task.category || "—"}</p>
                </div>
              </div>

              {task.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap text-sm">{task.description}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Assignees</p>
                <div className="flex flex-wrap gap-2">
                  {task.assignees.length === 0 && (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                  {task.assignees.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-xs"
                    >
                      <UserAvatar user={a} size="sm" />
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Created by</p>
                <div className="inline-flex items-center gap-1.5 text-sm">
                  <UserAvatar user={task.createdBy} size="sm" />
                  {task.createdBy?.name}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <div className="mb-3 flex items-center gap-1.5 text-sm font-medium">
                  <History className="h-4 w-4 text-muted-foreground" /> Comments
                </div>
                <div className="space-y-3">
                  {(task.comments ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  )}
                  {(task.comments ?? []).map((c) => {
                    const author = "name" in c.author ? c.author : null;
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <UserAvatar user={author ?? { id: "", name: "?", email: "" }} size="sm" />
                        <div className="flex-1 rounded-lg bg-accent/50 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {author?.name ?? "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(c.createdAt), "MMM d, HH:mm")}
                            </span>
                          </div>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{c.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={addComment}
                    disabled={sending || !text.trim()}
                    size="sm"
                    className="self-end"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
