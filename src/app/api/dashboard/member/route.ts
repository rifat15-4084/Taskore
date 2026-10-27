import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import { STATUS_COLUMNS } from "@/types";
import { addDays } from "date-fns";
import { Types } from "mongoose";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();
    const uid = new Types.ObjectId(auth.userId);

    const taskMatch = { $or: [{ assignees: uid }, { createdBy: uid }] };

    const [totalTasks, byStatus, projectsCount, upcoming, recentProjects] = await Promise.all([
      Task.countDocuments(taskMatch),
      Task.aggregate([
        { $match: taskMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Project.countDocuments({
        $or: [{ owner: uid }, { members: uid }],
        archived: false,
      }),
      Task.find({
        ...taskMatch,
        dueAt: { $gte: new Date(), $lte: addDays(new Date(), 7) },
        status: { $ne: "completed" },
      })
        .sort({ dueAt: 1 })
        .limit(5)
        .select("title dueAt status priority project")
        .populate("project", "name color"),
      Project.find({ $or: [{ owner: uid }, { members: uid }], archived: false })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("name status color progress deadline")
        .lean(),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of STATUS_COLUMNS) statusMap[s.status] = 0;
    for (const row of byStatus) statusMap[row._id] = row.count;

    return ok({
      stats: {
        totalTasks,
        projects: projectsCount,
        todo: statusMap.todo,
        in_progress: statusMap.in_progress,
        completed: statusMap.completed,
        byStatus,
      },
      upcoming: upcoming.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        dueAt: t.dueAt,
        status: t.status,
        priority: t.priority,
        project: t.project,
      })),
      recentProjects,
    });
  } catch (error) {
    console.error("MEMBER_DASHBOARD_ERROR", error);
    return serverError();
  }
}
