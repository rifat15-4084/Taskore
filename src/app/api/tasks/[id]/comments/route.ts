import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { getTaskById, canViewTask } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { addCommentSchema } from "@/validators/task";
import { serializeComment } from "@/services/task-service";
import { notifyUser, logActivity } from "@/services/notification-service";
import { Types } from "mongoose";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (!canViewTask(task, auth)) return forbidden();

    const body = await req.json();
    const parsed = addCommentSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const comment = {
      _id: new Types.ObjectId(),
      author: new Types.ObjectId(auth.userId),
      text: parsed.data.text,
      createdAt: new Date(),
    } as never;

    task.comments.push(comment);
    await task.save();

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
        type: "comment",
        message: `${actorName} commented on "${task.title}"`,
        link: "/app/board",
      });
    }
    await logActivity({
      actorId: auth.userId,
      action: "comment.added",
      entityType: "task",
      entityId: task._id.toString(),
      meta: { title: task.title },
    });

    const created = task.comments[task.comments.length - 1];
    return ok(
      {
        comment: serializeComment(created, { id: auth.userId }),
      },
      201
    );
  } catch (error) {
    console.error("TASK_COMMENT_ERROR", error);
    return serverError();
  }
}
