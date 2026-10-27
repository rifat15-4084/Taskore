import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { setRoleSchema } from "@/validators/user";
import { notifyUser, logActivity } from "@/services/notification-service";
import { Types } from "mongoose";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid user id", 400);

    const body = await req.json();
    const parsed = setRoleSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) return notFound("User not found");

    if (user.role === parsed.data.role) {
      return ok({ user: { id: user._id.toString(), role: user.role } });
    }

    if (parsed.data.role === "member") {
      if (user._id.toString() === auth.userId) {
        return fail("You cannot demote yourself", 400);
      }
      if (user.role === "admin" && user.isActive) {
        const remainingAdmins = await User.countDocuments({
          role: "admin",
          isActive: true,
          _id: { $ne: user._id },
        });
        if (remainingAdmins === 0) {
          return fail("There must always be at least one active admin", 400);
        }
      }
    }

    user.role = parsed.data.role;
    await user.save();

    await notifyUser({
      userId: user._id.toString(),
      type: "role_changed",
      message:
        parsed.data.role === "admin"
          ? "You have been promoted to Admin"
          : "Your role has been changed to Member",
      link: parsed.data.role === "admin" ? "/admin/dashboard" : "/app/dashboard",
    });
    await logActivity({
      actorId: auth.userId,
      action: "user.updated",
      entityType: "user",
      entityId: user._id.toString(),
      meta: { role: parsed.data.role },
    });

    return ok({ user: { id: user._id.toString(), role: user.role } });
  } catch (error) {
    console.error("USERS_ROLE_ERROR", error);
    return serverError();
  }
}
