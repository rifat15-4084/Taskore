import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }
    const user = await User.findById(payload.userId).select("+passwordHash");
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 });
    }
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();
    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("CHANGE_PASSWORD_ERROR", error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
