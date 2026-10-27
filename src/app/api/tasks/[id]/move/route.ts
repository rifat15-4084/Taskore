import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { getTaskById, canEditTask } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { moveTaskSchema } from "@/validators/task";
import { notifyUser, logActivity } from "@/services/notification-service";

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  hold: "Hold",
  completed: "Completed",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (!canEditTask(task, auth)) return forbidden("You can only move your own or assigned tasks");

    const body = await req.json();
    const parsed = moveTaskSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const { status, position } = parsed.data;
    const statusChanged = task.status !== status;

    task.status = status;
    task.position = position;
    if (status === "completed") {
      if (!task.completedAt) task.completedAt = new Date();
    } else {
      task.completedAt = undefined;
    }
    await task.save();

    if (statusChanged) {
      const actor = await User.findById(auth.userId).select("name");
      const actorName = actor?.name ?? "Someone";
      const recipients = new Set<string>([
        ...task.assignees.map((a) => a.toString()),
        task.createdBy.toString(),
      ]);
      recipients.delete(auth.userId);
      for (const uid of recipients) {
        await notifyUser({
          userId: uid,
          type: status === "completed" ? "completed" : "status_changed",
          message:
            status === "completed"
              ? `${actorName} completed "${task.title}"`
              : `${actorName} moved "${task.title}" to ${STATUS_LABELS[status] ?? status}`,
          link: "/app/board",
        });
      }
      await logActivity({
        actorId: auth.userId,
        action: status === "completed" ? "task.completed" : "task.updated",
        entityType: "task",
        entityId: task._id.toString(),
        meta: { title: task.title, status },
      });
    }

    return ok({ task: { id: task._id.toString(), status: task.status, position: task.position } });
  } catch (error) {
    console.error("TASK_MOVE_ERROR", error);
    return serverError();
  }
}
