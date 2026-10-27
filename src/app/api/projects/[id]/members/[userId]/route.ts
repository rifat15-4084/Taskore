import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProjectById, canManageProject } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError } from "@/lib/api-response";
import { Types } from "mongoose";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id, userId } = await params;
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");
    if (!canManageProject(project, auth)) return forbidden();

    if (!Types.ObjectId.isValid(userId)) return fail("Invalid user id", 400);

    await dbConnect();
    project.members = project.members.filter((m) => m.toString() !== userId);
    await project.save();

    return ok({ members: project.members });
  } catch (error) {
    console.error("PROJECT_REMOVE_MEMBER_ERROR", error);
    return serverError();
  }
}
