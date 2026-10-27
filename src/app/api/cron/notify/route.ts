import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import { sendEmail } from "@/services/email-service";
import { Types } from "mongoose";
import { addDays, startOfDay } from "date-fns";

/**
 * Vercel Cron endpoint. Protected by CRON_SECRET (Authorization: Bearer <secret>).
 * - Finds incomplete tasks due within 24h or already overdue
 * - Creates an in-app notification per assignee (deduped per task+user+day)
 * - Sends an email if the task has notifyByEmail on
 * Never throws: all failures are logged only.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await dbConnect();

    const now = new Date();

    const tasks = await Task.find({
      status: { $ne: "completed" },
      dueAt: { $ne: null, $lte: addDays(now, 1) },
      assignees: { $ne: [] },
    })
      .populate("assignees", "name email")
      .populate("project", "name color")
      .limit(500);

    let notified = 0;
    let emails = 0;

    for (const task of tasks) {
      const dueAt = task.dueAt ? new Date(task.dueAt) : null;
      if (!dueAt) continue;
      const overdue = dueAt < now;
      const message = overdue
        ? `Overdue: "${task.title}" was due ${dueAt.toLocaleDateString()}`
        : `Due soon: "${task.title}" is due ${dueAt.toLocaleDateString()}`;

      const type = overdue ? "overdue" : "due_soon";

      for (const assignee of task.assignees) {
        const uid = (assignee as unknown as { _id: Types.ObjectId })._id.toString();

        // Dedupe: skip if we already notified this user about this task today
        const existing = await Notification.findOne({
          user: uid,
          type,
          createdAt: { $gte: startOfDay(now) },
          message: { $regex: `"${task.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"` },
        }).select("_id");
        if (existing) continue;

        await Notification.create({ user: uid, type, message, link: "/app/board" });
        notified++;

        if (task.notifyByEmail) {
          const emailUser = assignee as unknown as { email?: string; name?: string };
          if (emailUser.email) {
            await sendEmail({
              to: emailUser.email,
              subject: overdue ? `Overdue task: ${task.title}` : `Due soon: ${task.title}`,
              html: `
                <div style="font-family:Arial,sans-serif;color:#e5e9f0;background:#0b1220;padding:24px;">
                  <h2 style="color:#f59e0b;">Taskora</h2>
                  <p>Hi ${emailUser.name ?? "there"},</p>
                  <p><strong>${message}</strong></p>
                  <p>Open your board to update the status.</p>
                </div>`,
            });
            emails++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasksChecked: tasks.length,
        notificationsCreated: notified,
        emailsSent: emails,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CRON_NOTIFY_ERROR", error);
    return new Response(JSON.stringify({ success: false, message: "Cron failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
