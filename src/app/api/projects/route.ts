import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, fail, serverError, zodErrors } from "@/lib/api-response";
import { createProjectSchema } from "@/validators/project";
import { notifyUser, logActivity } from "@/services/notification-service";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "true";
    const q = searchParams.get("q")?.trim();

    const filter: Record<string, unknown> = {};
    if (!includeArchived) filter.archived = false;
    if (q) filter.name = { $regex: q, $options: "i" };

    if (!isAdmin(auth)) {
      const uid = new Types.ObjectId(auth.userId);
      filter.$or = [{ owner: uid }, { members: uid }];
    }

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .populate("owner", "name email avatarColor")
      .populate("members", "name email avatarColor");

    const projectIds = projects.map((p) => p._id);
    const progress = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: "$project",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ]);
    const progressMap = new Map(
      progress.map((p) => [p._id.toString(), { total: p.total, completed: p.completed }])
    );

    return ok({
      projects: projects.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        status: p.status,
        color: p.color,
        owner: p.owner,
        members: p.members,
        deadline: p.deadline,
        archived: p.archived,
        progress: progressMap.get(p._id.toString()) ?? { total: 0, completed: 0 },
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("PROJECTS_LIST_ERROR", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const ownerId = new Types.ObjectId(auth.userId);
    const memberIds = new Set<string>([auth.userId]);
    for (const m of parsed.data.members ?? []) {
      if (Types.ObjectId.isValid(m)) memberIds.add(m);
    }

    const project = await Project.create({
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      status: parsed.data.status,
      color: parsed.data.color,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      owner: ownerId,
      members: Array.from(memberIds).map((m) => new Types.ObjectId(m)),
      archived: false,
    });

    const actor = await User.findById(auth.userId).select("name");
    const actorName = actor?.name ?? "Someone";
    for (const m of project.members) {
      if (m.toString() === auth.userId) continue;
      await notifyUser({
        userId: m.toString(),
        type: "project_added",
        message: `${actorName} added you to project "${project.name}"`,
        link: `/app/projects/${project._id.toString()}`,
      });
    }
    await logActivity({
      actorId: auth.userId,
      action: "project.created",
      entityType: "project",
      entityId: project._id.toString(),
      meta: { name: project.name },
    });

    return ok(
      {
        project: {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          deadline: project.deadline,
          archived: project.archived,
          owner: project.owner,
          members: project.members,
          createdAt: project.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error("PROJECTS_CREATE_ERROR", error);
    return serverError();
  }
}
