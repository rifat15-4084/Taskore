import dbConnect from "@/lib/db";
import User from "@/models/User";
import Project from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { ok, unauthorized, serverError } from "@/lib/api-response";

/**
 * User picker options.
 * - Admins see every active user (id, name, avatarColor, email, role).
 * - Members see ONLY themselves plus people they share a project with —
 *   never the full user list. Email is included for self and co-members.
 */
export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return unauthorized();

    await dbConnect();

    if (isAdmin(auth)) {
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
    }

    // Member scope: self + co-members of projects they belong to.
    const projects = await Project.find({
      $or: [{ members: auth.userId }, { owner: auth.userId }],
    })
      .select("members owner")
      .lean();

    const visibleIds = new Set<string>([auth.userId]);
    for (const p of projects) {
      for (const m of (p.members ?? []) as unknown[]) {
        visibleIds.add(String(m));
      }
      if (p.owner) visibleIds.add(String(p.owner));
    }

    const users = await User.find({
      _id: { $in: Array.from(visibleIds) },
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name email avatarColor");

    return ok({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
      })),
    });
  } catch (error) {
    console.error("USERS_OPTIONS_ERROR", error);
    return serverError();
  }
}
