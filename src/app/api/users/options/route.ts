import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();
    const users = await User.find({ isActive: true })
      .sort({ name: 1 })
      .select("name email avatarColor role");

    return ok({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        role: u.role,
      })),
    });
  } catch (error) {
    console.error("USERS_OPTIONS_ERROR", error);
    return serverError();
  }
}
