import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { setStatusSchema } from "@/validators/user";
import { Types } from "mongoose";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid user id", 400);

    const body = await req.json();
    const parsed = setStatusSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) return notFound("User not found");

    if (parsed.data.isActive === false) {
      if (user._id.toString() === auth.userId) {
        return fail("You cannot deactivate yourself", 400);
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

    user.isActive = parsed.data.isActive;
    await user.save();

    return ok({ user: { id: user._id.toString(), isActive: user.isActive } });
  } catch (error) {
    console.error("USERS_STATUS_ERROR", error);
    return serverError();
  }
}
