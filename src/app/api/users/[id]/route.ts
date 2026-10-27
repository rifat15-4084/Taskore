import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { updateUserSchema } from "@/validators/user";
import { Types } from "mongoose";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid user id", 400);

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) return notFound("User not found");

    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.email !== undefined) {
      const email = parsed.data.email.toLowerCase();
      if (email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) return fail("A user with this email already exists", 409);
      }
      user.email = email;
    }
    await user.save();

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatarColor: user.avatarColor,
      },
    });
  } catch (error) {
    console.error("USERS_UPDATE_ERROR", error);
    return serverError();
  }
}
