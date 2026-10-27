import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { getProjectById, canManageProject } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { projectMemberSchema } from "@/validators/project";
import { notifyUser } from "@/services/notification-service";
import { Types } from "mongoose";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");
    if (!canManageProject(project, auth)) return forbidden();

    const body = await req.json();
    const parsed = projectMemberSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const userId = parsed.data.userId;
    if (!Types.ObjectId.isValid(userId)) return fail("Invalid user id", 400);

    const user = await User.findById(userId);
    if (!user || !user.isActive) return notFound("User not found or inactive");

    const alreadyMember = project.members.some((m) => m.toString() === userId);
    if (!alreadyMember) {
      project.members.push(new Types.ObjectId(userId));
      await project.save();

      const actor = await User.findById(auth.userId).select("name");
      await notifyUser({
        userId,
        type: "project_added",
        message: `${actor?.name ?? "Someone"} added you to project "${project.name}"`,
        link: `/app/projects/${project._id.toString()}`,
      });
    }

    return ok({ members: project.members });
  } catch (error) {
    console.error("PROJECT_ADD_MEMBER_ERROR", error);
    return serverError();
  }
}
