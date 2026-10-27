import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { STATUS_COLUMNS } from "@/types";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    await dbConnect();
    const thirtyDaysAgo = subDays(new Date(), 30);
    const startToday = startOfDay(new Date());

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalTasks,
      byStatus,
      overdue,
      tasksPerMember,
      completionTrend,
      recentActivity,
      workload,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Project.countDocuments({ archived: false }),
      Task.countDocuments(),
      Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Task.countDocuments({
        dueAt: { $lt: startToday },
        status: { $ne: "completed" },
      }),
      Task.aggregate([
        { $unwind: "$assignees" },
        { $group: { _id: "$assignees", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { count: 1, name: "$user.name", avatarColor: "$user.avatarColor" } },
      ]),
      Task.aggregate([
        {
          $match: {
            completedAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(12)
        .populate("actor", "name email avatarColor")
        .select("action entityType entityId meta createdAt"),
      User.aggregate([
        {
          $lookup: {
            from: "tasks",
            let: { uid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$uid", "$assignees"] },
                      { $ne: ["$status", "completed"] },
                    ],
                  },
                },
              },
            ],
            as: "openTasks",
          },
        },
        { $match: { isActive: true } },
        {
          $project: {
            name: 1,
            avatarColor: 1,
            role: 1,
            open: { $size: "$openTasks" },
          },
        },
        { $sort: { open: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of STATUS_COLUMNS) statusMap[s.status] = 0;
    for (const row of byStatus) statusMap[row._id] = row.count;

    // Fill 30-day trend with zeros
    const trendMap = new Map(completionTrend.map((t) => [t._id, t.count]));
    const trend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      trend.push({ date: key, count: trendMap.get(key) ?? 0 });
    }

    return ok({
      stats: {
        totalUsers,
        activeUsers,
        totalProjects,
        totalTasks,
        todo: statusMap.todo,
        in_progress: statusMap.in_progress,
        in_review: statusMap.in_review,
        hold: statusMap.hold,
        completed: statusMap.completed,
        overdue,
        byStatus,
      },
      charts: {
        tasksPerMember,
        completionTrend: trend,
        workload,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a._id.toString(),
        action: a.action,
        entityType: a.entityType,
        actor: a.actor,
        meta: a.meta,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("ADMIN_DASHBOARD_ERROR", error);
    return serverError();
  }
}
