import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function POST() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();
    await Notification.updateMany({ user: auth.userId, read: false }, { read: true });

    return ok({ message: "All notifications marked as read", unreadCount: 0 });
  } catch (error) {
    console.error("NOTIFICATIONS_READ_ALL_ERROR", error);
    return serverError();
  }
}
