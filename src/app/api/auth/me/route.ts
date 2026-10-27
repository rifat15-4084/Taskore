import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
      },
    });
  } catch (error) {
    console.error("ME_ERROR", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
