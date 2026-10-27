import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";
import Project from "@/models/Project";
import DailyReport from "@/models/DailyReport";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, serverError, fail, zodErrors } from "@/lib/api-response";
import { z } from "zod";
import { Types } from "mongoose";
import { subDays, format } from "date-fns";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  format: z.enum(["json", "csv"]).optional(),
});

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      format: searchParams.get("format") ?? undefined,
    });
    if (!parsed.success) return fail("Invalid input", 400, zodErrors(parsed.error));
    const { from, to, userId, projectId, format: outFormat } = parsed.data;

    await dbConnect();

    const fromTs = from ? new Date(`${from}T00:00:00`) : subDays(new Date(), 30);
    const toTs = to ? new Date(`${to}T23:59:59.999`) : new Date();

    const match: Record<string, unknown> = {
      $or: [
        { completedAt: { $gte: fromTs, $lte: toTs } },
        { updatedAt: { $gte: fromTs, $lte: toTs } },
      ],
    };
    if (userId && Types.ObjectId.isValid(userId)) match.assignees = new Types.ObjectId(userId);
    if (projectId && Types.ObjectId.isValid(projectId))
      match.project = new Types.ObjectId(projectId);

    const [perMember, perProject, totals, dailyReports] = await Promise.all([
      Task.aggregate([
        { $match: match },
        { $unwind: "$assignees" },
        {
          $group: {
            _id: "$assignees",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueAt", new Date()] },
                      { $ne: ["$status", "completed"] },
                      { $ne: ["$dueAt", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { completed: -1 } },
        { $limit: 50 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            total: 1,
            completed: 1,
            overdue: 1,
            name: "$user.name",
            email: "$user.email",
            avatarColor: "$user.avatarColor",
          },
        },
      ]),
      Task.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$project",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 50 },
        { $lookup: { from: "projects", localField: "_id", foreignField: "_id", as: "project" } },
        { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            total: 1,
            completed: 1,
            name: "$project.name",
            color: "$project.color",
          },
        },
      ]),
      Task.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      DailyReport.find({
        ...(userId && Types.ObjectId.isValid(userId) ? { user: userId } : {}),
        date: { $gte: from, $lte: to },
      })
        .sort({ date: -1 })
        .limit(200)
        .populate("user", "name email avatarColor")
        .lean(),
    ]);

    const userCount = await User.countDocuments({ isActive: true });
    const projectCount = await Project.countDocuments({ archived: false });

    const payload = {
      range: { from: format(fromTs, "yyyy-MM-dd"), to: format(toTs, "yyyy-MM-dd") },
      totals: {
        members: userCount,
        projects: projectCount,
        byStatus: totals,
        completed: totals.find((t) => t._id === "completed")?.count ?? 0,
        total: totals.reduce((sum, t) => sum + t.count, 0),
      },
      perMember,
      perProject,
      dailyReports: dailyReports.map((r) => ({
        id: String(r._id),
        date: r.date,
        summary: r.summary,
        blockers: r.blockers,
        hoursWorked: r.hoursWorked,
        user: r.user,
      })),
    };

    if (outFormat === "csv") {
      const rows: string[] = [];
      rows.push("Taskora Team Report");
      rows.push(`Range,${payload.range.from},${payload.range.to}`);
      rows.push("");
      rows.push("Member,Email,Total,Completed,Overdue");
      for (const m of perMember) {
        rows.push(
          [m.name, m.email, m.total, m.completed, m.overdue].map(csvEscape).join(",")
        );
      }
      rows.push("");
      rows.push("Project,Total,Completed");
      for (const p of perProject) {
        rows.push([p.name ?? "Standalone", p.total, p.completed].map(csvEscape).join(","));
      }
      rows.push("");
      rows.push("Status,Count");
      for (const s of totals) {
        rows.push([s._id, s.count].map(csvEscape).join(","));
      }
      rows.push("");
      rows.push("Date,Member,Hours,Summary,Blockers");
      for (const r of payload.dailyReports) {
        const u = r.user as { name?: string; email?: string } | null;
        rows.push(
          [
            r.date,
            u?.name ?? "",
            r.hoursWorked ?? "",
            r.summary,
            r.blockers ?? "",
          ].map(csvEscape).join(",")
        );
      }

      const csv = rows.join("\r\n");
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="taskora-report-${payload.range.from}-to-${payload.range.to}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return ok(payload);
  } catch (error) {
    console.error("REPORTS_ERROR", error);
    return serverError();
  }
}
