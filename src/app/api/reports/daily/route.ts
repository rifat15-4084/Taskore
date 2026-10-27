import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, serverError, fail, zodErrors } from "@/lib/api-response";
import { dailyReportSchema } from "@/validators/report";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (!isAdmin(auth)) {
      filter.user = auth.userId;
    } else {
      const userId = searchParams.get("userId");
      if (userId && Types.ObjectId.isValid(userId)) filter.user = userId;
    }
    if (from || to) {
      const range: Record<string, string> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      filter.date = range;
    }

    const reports = await DailyReport.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .populate("user", "name email avatarColor")
      .populate("tasksWorkedOn", "title status");

    return ok({
      reports: reports.map((r) => ({
        id: r._id.toString(),
        date: r.date,
        summary: r.summary,
        blockers: r.blockers,
        hoursWorked: r.hoursWorked,
        user: r.user,
        tasksWorkedOn: r.tasksWorkedOn,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("DAILY_REPORTS_LIST_ERROR", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = dailyReportSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 400, zodErrors(parsed.error));
    const data = parsed.data;

    await dbConnect();

    const taskIds = (data.tasksWorkedOn ?? []).filter((t) => Types.ObjectId.isValid(t));

    const report = await DailyReport.findOneAndUpdate(
      { user: auth.userId, date: data.date },
      {
        summary: data.summary,
        blockers: data.blockers || undefined,
        hoursWorked: data.hoursWorked ?? undefined,
        tasksWorkedOn: taskIds.map((t) => new Types.ObjectId(t)),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return ok(
      {
        report: {
          id: report._id.toString(),
          date: report.date,
          summary: report.summary,
          blockers: report.blockers,
          hoursWorked: report.hoursWorked,
        },
      },
      201
    );
  } catch (error) {
    console.error("DAILY_REPORT_SAVE_ERROR", error);
    return serverError();
  }
}
