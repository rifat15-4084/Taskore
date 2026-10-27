import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError, fail, zodErrors } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 400, zodErrors(parsed.error));

    await dbConnect();
    const user = await User.findById(auth.userId);
    if (!user) return unauthorized();

    user.name = parsed.data.name;
    await user.save();

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Profile updated",
    });
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR", error);
    return serverError();
  }
}
