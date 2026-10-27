import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { getCurrentUser } from "@/lib/auth";
import {
  getProjectById,
  canViewProject,
  canManageProject,
} from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { updateProjectSchema } from "@/validators/project";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");
    if (!canViewProject(project, auth)) return forbidden();

    const [populated, stats] = await Promise.all([
      Project.findById(project._id)
        .populate("owner", "name email avatarColor")
        .populate("members", "name email avatarColor"),
      Task.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return ok({
      project: populated,
      stats: {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        completed: stats.find((s) => s._id === "completed")?.count ?? 0,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error("PROJECT_DETAIL_ERROR", error);
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");
    if (!canManageProject(project, auth)) return forbidden();

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    const data = parsed.data;
    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description || undefined;
    if (data.status !== undefined) project.status = data.status;
    if (data.color !== undefined) project.color = data.color;
    if (data.deadline !== undefined) {
      project.deadline = data.deadline ? new Date(data.deadline) : undefined;
    }
    if (data.archived !== undefined) project.archived = data.archived;

    await project.save();

    return ok({ project });
  } catch (error) {
    console.error("PROJECT_UPDATE_ERROR", error);
    return serverError();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");
    if (!canManageProject(project, auth)) return forbidden();

    await dbConnect();
    await Task.updateMany({ project: project._id }, { $set: { project: null } });
    await Project.deleteOne({ _id: project._id });

    return ok({ message: "Project deleted" });
  } catch (error) {
    console.error("PROJECT_DELETE_ERROR", error);
    return serverError();
  }
}
