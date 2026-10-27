import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";
import type { ITask } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin, canViewProject, getProjectById } from "@/lib/permissions";
import { ok, unauthorized, fail, serverError, zodErrors } from "@/lib/api-response";
import { createTaskSchema } from "@/validators/task";
import { baseTaskQuery } from "@/services/task-service";
import { notifyAssignment, logActivity } from "@/services/notification-service";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const project = searchParams.get("project");
    const assignee = searchParams.get("assignee");
    const q = searchParams.get("q")?.trim();
    const dueFrom = searchParams.get("dueFrom");
    const dueTo = searchParams.get("dueTo");

    const filter: Record<string, unknown> = {};

    if (!isAdmin(auth)) {
      const uid = new Types.ObjectId(auth.userId);
      filter.$or = [{ assignees: uid }, { createdBy: uid }];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project && Types.ObjectId.isValid(project)) filter.project = new Types.ObjectId(project);
    if (assignee && Types.ObjectId.isValid(assignee)) filter.assignees = new Types.ObjectId(assignee);
    if (q) {
      filter.$and = filter.$and ?? [];
      (filter.$and as Record<string, unknown>[]).push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ],
      });
    }
    if (dueFrom || dueTo) {
      const range: Record<string, Date> = {};
      if (dueFrom) range.$gte = new Date(dueFrom);
      if (dueTo) range.$lte = new Date(dueTo);
      filter.dueAt = range;
    }

    const [tasks, total] = await Promise.all([
      baseTaskQuery()
        .find(filter)
        .sort({ position: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    return ok({ tasks, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("TASKS_LIST_ERROR", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }
    const data = parsed.data;

    await dbConnect();

    let projectId: Types.ObjectId | null = null;
    if (data.project) {
      if (!Types.ObjectId.isValid(data.project)) return fail("Invalid project id", 400);
      const project = await getProjectById(data.project);
      if (!project) return fail("Project not found", 404);
      if (!isAdmin(auth) && !canViewProject(project, auth)) {
        return fail("You do not have access to that project", 403);
      }
      projectId = project._id as Types.ObjectId;
    }

    const assigneeIds = new Set<string>();
    for (const a of data.assignees ?? []) {
      if (Types.ObjectId.isValid(a)) assigneeIds.add(a);
    }

    const lastTask = await Task.findOne({ project: projectId, status: data.status })
      .sort({ position: -1 })
      .select("position");
    const position = lastTask ? lastTask.position + 1 : 0;

    const task = await Task.create({
      title: data.title,
      description: data.description || undefined,
      project: projectId,
      status: data.status,
      priority: data.priority,
      category: data.category || undefined,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      assignees: Array.from(assigneeIds).map((a) => new Types.ObjectId(a)),
      createdBy: new Types.ObjectId(auth.userId),
      position,
      completedAt: data.status === "completed" ? new Date() : undefined,
      notifyByEmail: data.notifyByEmail,
    });

    const actor = await User.findById(auth.userId).select("name");
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    await Promise.all([
      notifyAssignment({
        task: task as unknown as ITask,
        actorName: actor?.name ?? "Someone",
        previousAssigneeIds: [],
        appUrl,
      }),
      logActivity({
        actorId: auth.userId,
        action: "task.created",
        entityType: "task",
        entityId: task._id.toString(),
        meta: { title: task.title },
      }),
    ]);

    const populated = await baseTaskQuery().findById(task._id);
    return ok({ task: populated }, 201);
  } catch (error) {
    console.error("TASK_CREATE_ERROR", error);
    return serverError();
  }
}
