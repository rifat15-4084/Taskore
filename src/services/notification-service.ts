import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";
import User from "@/models/User";
import { sendEmail, assignmentEmail } from "./email-service";
import { Types } from "mongoose";
import type { ITask } from "@/models/Task";

export async function notifyUser(input: {
  userId: string;
  type: string;
  message: string;
  link?: string;
}) {
  try {
    await dbConnect();
    await Notification.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      message: input.message,
      link: input.link,
    });
  } catch (err) {
    console.error("NOTIFY_FAILED", err);
  }
}

export async function logActivity(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await dbConnect();
    await ActivityLog.create({
      actor: new Types.ObjectId(input.actorId),
      action: input.action,
      entityType: input.entityType,
      entityId: new Types.ObjectId(input.entityId),
      meta: input.meta,
    });
  } catch (err) {
    console.error("ACTIVITY_LOG_FAILED", err);
  }
}

/**
 * Notify assignees about a task. Sends in-app notifications to newly added
 * assignees and an email when notifyByEmail is on. Emails never throw.
 */
export async function notifyAssignment(opts: {
  task: ITask;
  actorName: string;
  previousAssigneeIds?: string[];
  appUrl: string;
}) {
  const { task, actorName, previousAssigneeIds = [], appUrl } = opts;
  const currentIds = task.assignees.map((a) => a.toString());
  const newIds = currentIds.filter((id) => !previousAssigneeIds.includes(id));
  if (newIds.length === 0) return;

  const users = await User.find({ _id: { $in: newIds } }).select("name email");
  const taskUrl = `${appUrl}/app/board`;
  const projectName = task.project ? String(task.project) : null;

  for (const u of users) {
    const uid = u._id.toString();
    await notifyUser({
      userId: uid,
      type: "assigned",
      message: `${actorName} assigned you "${task.title}"`,
      link: `/app/board`,
    });

    if (task.notifyByEmail && u.email) {
      const email = assignmentEmail({
        assigneeName: u.name,
        taskTitle: task.title,
        priority: task.priority,
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
        project: projectName,
        taskUrl,
      });
      await sendEmail({ to: u.email, subject: email.subject, html: email.html });
    }
  }
}
