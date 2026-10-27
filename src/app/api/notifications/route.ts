import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, serverError, fail, zodErrors } from "@/lib/api-response";
import { z } from "zod";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  unread: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      unread: searchParams.get("unread") ?? undefined,
    });
    if (!parsed.success) return fail("Invalid input", 400, zodErrors(parsed.error));
    const { page, limit, unread } = parsed.data;

    await dbConnect();
    const filter: Record<string, unknown> = { user: auth.userId };
    if (unread === "true") filter.read = false;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: auth.userId, read: false }),
    ]);

    return ok({
      notifications: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      unreadCount,
    });
  } catch (error) {
    console.error("NOTIFICATIONS_LIST_ERROR", error);
    return serverError();
  }
}
