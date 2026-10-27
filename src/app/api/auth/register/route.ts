import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken, getAuthCookieOptions, getAuthCookieName } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/validators/user";
import { sanitizeName, normalizeEmail } from "@/lib/sanitize";
import { ok, fail, serverError, zodErrors } from "@/lib/api-response";
import { notifyUser, logActivity } from "@/services/notification-service";
import { AVATAR_COLORS } from "@/types";

const DUPLICATE_MESSAGE = "Could not create account. Try signing in or use a different email.";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = rateLimit(`register:${ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
    if (!limited.success) {
      return fail("Too many sign-up attempts. Please try again later.", 429);
    }

    const body = await req.json();

    // Honeypot: real users never see this field. Silently pretend success so
    // bots cannot tell that they were rejected.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      return ok({ message: "Account created. You can sign in now." });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please fix the highlighted fields", 400, zodErrors(parsed.error));
    }

    const name = sanitizeName(parsed.data.name);
    if (name.length < 2) {
      return fail("Please enter your full name", 400, { name: ["Name must be at least 2 characters"] });
    }
    const email = normalizeEmail(parsed.data.email);

    await dbConnect();

    // Generic message — never reveals which emails are already registered.
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      return fail(DUPLICATE_MESSAGE, 409);
    }

    const requireApproval = process.env.REQUIRE_ADMIN_APPROVAL === "true";
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    let user;
    try {
      user = await User.create({
        name,
        email,
        passwordHash,
        // Mass-assignment protection: role/status are set on the server only.
        // The request body is never read for role, isActive or approvalStatus.
        role: "member",
        isActive: !requireApproval,
        approvalStatus: requireApproval ? "pending" : "approved",
        avatarColor,
      });
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) return fail(DUPLICATE_MESSAGE, 409);
      throw err;
    }

    const userId = String(user._id);

    // In-app notification for every active admin (no email is sent here).
    try {
      const admins = await User.find({ role: "admin", isActive: true }).select("_id");
      await Promise.all(
        admins.map((a) =>
          notifyUser({
            userId: a._id.toString(),
            type: "system",
            message: `New user registered: ${name} (${email})`,
            link: "/admin/team",
          })
        )
      );
    } catch (err) {
      console.error("REGISTER_ADMIN_NOTIFY_ERROR", err);
    }

    await logActivity({
      actorId: userId,
      action: "user_registered",
      entityType: "user",
      entityId: userId,
      meta: { email },
    });

    if (requireApproval) {
      return ok({
        message: "Your account was created and is waiting for admin approval.",
        requiresApproval: true,
      });
    }

    const token = await signToken({ userId, email, role: "member" });
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    const res = NextResponse.json({
      success: true,
      message: "Account created",
      user: { id: userId, name, email, role: "member", avatarColor },
    });
    res.cookies.set(getAuthCookieName(), token, getAuthCookieOptions());
    return res;
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return serverError();
  }
}
