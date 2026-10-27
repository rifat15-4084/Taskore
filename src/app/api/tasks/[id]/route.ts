import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";
import type { ITask } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth";
import {
  getTaskById,
  canViewTask,
  canEditTask,
  canDeleteTask,
  getProjectById,
  canViewProject,
} from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { updateTaskSchema } from "@/validators/task";
import { baseTaskQuery, serializeComment } from "@/services/task-service";
import {
  notifyAssignment,
  notifyUser,
  logActivity,
} from "@/services/notification-service";
import { Types } from "mongoose";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (!canViewTask(task, auth)) return forbidden();

    const populated = await baseTaskQuery().findById(task._id).populate({
      path: "comments.author",
      select: "name email avatarColor role",
    });

    return ok({
      task: {
        ...populated?.toObject(),
        comments: populated?.comments.map(serializeComment) ?? [],
      },
    });
  } catch (error) {
    console.error("TASK_DETAIL_ERROR", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (!canEditTask(task, auth)) return forbidden("You can only edit your own or assigned tasks");

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }
    const data = parsed.data;

    await dbConnect();

    const previousAssigneeIds = task.assignees.map((a) => a.toString());
    const previousStatus = task.status;

    if (data.project !== undefined) {
      if (data.project === null || data.project === "") {
        task.project = null as never;
      } else {
        if (!Types.ObjectId.isValid(data.project)) return fail("Invalid project id", 400);
        const project = await getProjectById(data.project);
        if (!project) return fail("Project not found", 404);
        if (!canViewProject(project, auth)) return fail("You do not have access to that project", 403);
        task.project = project._id as never;
      }
    }

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description || undefined;
    if (data.status !== undefined) {
      task.status = data.status;
      if (data.status === "completed") {
        if (!task.completedAt) task.completedAt = new Date();
      } else {
        task.completedAt = undefined;
      }
    }
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.category !== undefined) task.category = data.category || undefined;
    if (data.dueAt !== undefined) {
      task.dueAt = data.dueAt ? new Date(data.dueAt) : undefined;
    }
    if (data.assignees !== undefined) {
      const ids = new Set<string>();
      for (const a of data.assignees) if (Types.ObjectId.isValid(a)) ids.add(a);
      task.assignees = Array.from(ids).map((a) => new Types.ObjectId(a));
    }
    if (data.notifyByEmail !== undefined) task.notifyByEmail = data.notifyByEmail;

    await task.save();

    // Fire-and-forget side effects (never fail the request)
    const actor = await User.findById(auth.userId).select("name");
    const actorName = actor?.name ?? "Someone";
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    await notifyAssignment({
      task: task as unknown as ITask,
      actorName,
      previousAssigneeIds,
      appUrl,
    });

    const newStatus = data.status;
    if (newStatus !== undefined && newStatus !== previousStatus) {
      const STATUS_LABELS: Record<string, string> = {
        todo: "To Do",
        in_progress: "In Progress",
        in_review: "In Review",
        hold: "Hold",
        completed: "Completed",
      };
      const recipientIds = new Set<string>([
        ...task.assignees.map((a) => a.toString()),
        task.createdBy.toString(),
      ]);
      recipientIds.delete(auth.userId);
      for (const uid of recipientIds) {
        await notifyUser({
          userId: uid,
          type: "status_changed",
          message: `${actorName} moved "${task.title}" to ${STATUS_LABELS[newStatus] ?? newStatus}`,
          link: `/app/board`,
        });
      }
    }

    await logActivity({
      actorId: auth.userId,
      action: data.status === "completed" ? "task.completed" : "task.updated",
      entityType: "task",
      entityId: task._id.toString(),
      meta: { title: task.title },
    });

    const populated = await baseTaskQuery().findById(task._id);
    return ok({ task: populated });
  } catch (error) {
    console.error("TASK_UPDATE_ERROR", error);
    return serverError();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (!canDeleteTask(task, auth)) return forbidden("You can only delete tasks you created");

    await dbConnect();
    await Task.deleteOne({ _id: task._id });

    return ok({ message: "Task deleted" });
  } catch (error) {
    console.error("TASK_DELETE_ERROR", error);
    return serverError();
  }
}
