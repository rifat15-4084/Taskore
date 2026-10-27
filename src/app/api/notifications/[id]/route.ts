import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError, fail, notFound, zodErrors } from "@/lib/api-response";
import { z } from "zod";
import { Types } from "mongoose";

const updateSchema = z.object({ read: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid notification id", 400);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 400, zodErrors(parsed.error));

    await dbConnect();
    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: auth.userId },
      { read: parsed.data.read },
      { new: true }
    );
    if (!updated) return notFound("Notification not found");

    const unreadCount = await Notification.countDocuments({
      user: auth.userId,
      read: false,
    });

    return ok({ notification: { id: updated._id.toString(), read: updated.read }, unreadCount });
  } catch (error) {
    console.error("NOTIFICATION_UPDATE_ERROR", error);
    return serverError();
  }
}
