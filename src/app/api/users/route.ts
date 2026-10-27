import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, forbidden, fail, serverError, zodErrors } from "@/lib/api-response";
import { createUserSchema } from "@/validators/user";
import { logActivity } from "@/services/notification-service";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    if (role === "admin" || role === "member") filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("-passwordHash");

    return ok({ users });
  } catch (error) {
    console.error("USERS_LIST_ERROR", error);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();
    if (!isAdmin(auth)) return forbidden();

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, zodErrors(parsed.error));
    }

    await dbConnect();
    const email = parsed.data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      return fail("A user with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
    });

    await logActivity({
      actorId: auth.userId,
      action: "user.created",
      entityType: "user",
      entityId: user._id.toString(),
      meta: { name: user.name },
    });

    return ok(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          avatarColor: user.avatarColor,
          createdAt: user.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error("USERS_CREATE_ERROR", error);
    return serverError();
  }
}
