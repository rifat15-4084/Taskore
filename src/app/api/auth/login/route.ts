import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken, getAuthCookieOptions, getAuthCookieName } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = rateLimit(`login:${ip}`);
    if (!limited.success) {
      return NextResponse.json(
        { success: false, message: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash"
    );

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    res.cookies.set(getAuthCookieName(), token, getAuthCookieOptions());
    return res;
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
