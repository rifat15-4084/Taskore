import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, notFound, serverError, zodErrors } from "@/lib/api-response";
import { resetPasswordSchema } from "@/validators/user";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid user id", 400);

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) return notFound("User not found");

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();

    return ok({ message: "Password reset successfully" });
  } catch (error) {
    console.error("USERS_RESET_PASSWORD_ERROR", error);
    return serverError();
  }
}
