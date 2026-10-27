import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { approvalSchema } from "@/validators/user";
import { notifyUser, logActivity } from "@/services/notification-service";
import { Types } from "mongoose";

/**
 * Admin-only approval of self-registered accounts.
 * approve → isActive=true, approvalStatus="approved"
 * reject  → approvalStatus="rejected", isActive=false
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid user id", 400);
    if (id === auth.userId) return fail("You cannot approve or reject your own account", 400);

    const body = await req.json();
    const parsed = approvalSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) return notFound("User not found");

    const approve = parsed.data.action === "approve";
    user.isActive = approve;
    user.approvalStatus = approve ? "approved" : "rejected";
    await user.save();

    await notifyUser({
      userId: id,
      type: "system",
      message: approve
        ? "Your account has been approved. You can now sign in."
        : "Your account has been rejected. Please contact an administrator.",
      link: "/login",
    });

    await logActivity({
      actorId: auth.userId,
      action: approve ? "user_approved" : "user_rejected",
      entityType: "user",
      entityId: id,
      meta: { email: user.email },
    });

    return ok({
      user: {
        id: user._id.toString(),
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("USER_APPROVAL_ERROR", error);
    return serverError();
  }
}
