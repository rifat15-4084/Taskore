import dbConnect from "@/lib/db";
import Project, { IProject } from "@/models/Project";
import Task, { ITask } from "@/models/Task";
import User from "@/models/User";
import { Types } from "mongoose";

export type AuthUser = {
  userId: string;
  email: string;
  role: "admin" | "member";
};

export function isAdmin(user: AuthUser) {
  return user.role === "admin";
}

export function toObjectId(id: string) {
  return new Types.ObjectId(id);
}

export async function getProjectById(id: string): Promise<IProject | null> {
  await dbConnect();
  if (!Types.ObjectId.isValid(id)) return null;
  return Project.findById(id);
}

export async function getTaskById(id: string): Promise<ITask | null> {
  await dbConnect();
  if (!Types.ObjectId.isValid(id)) return null;
  return Task.findById(id);
}

export function isProjectOwner(project: IProject, userId: string) {
  return project.owner.toString() === userId;
}

export function isProjectMember(project: IProject, userId: string) {
  return project.members.some((m) => m.toString() === userId);
}

export function canViewProject(project: IProject, user: AuthUser) {
  if (isAdmin(user)) return true;
  return isProjectOwner(project, user.userId) || isProjectMember(project, user.userId);
}

export function canManageProject(project: IProject, user: AuthUser) {
  if (isAdmin(user)) return true;
  return isProjectOwner(project, user.userId);
}

export function canViewTask(task: ITask, user: AuthUser) {
  if (isAdmin(user)) return true;
  if (task.createdBy.toString() === user.userId) return true;
  if (task.assignees.some((a) => a.toString() === user.userId)) return true;
  return false;
}

export function canEditTask(task: ITask, user: AuthUser) {
  if (isAdmin(user)) return true;
  if (task.createdBy.toString() === user.userId) return true;
  if (task.assignees.some((a) => a.toString() === user.userId)) return true;
  return false;
}

export function canDeleteTask(task: ITask, user: AuthUser) {
  if (isAdmin(user)) return true;
  return task.createdBy.toString() === user.userId;
}

/**
 * Validates task assignees server-side.
 * Members may only assign to themselves or members of the project the task
 * belongs to; admins may assign anyone. Returns an error message or null.
 */
export async function validateAssignees(
  user: AuthUser,
  project: IProject | null,
  assigneeIds: string[]
): Promise<string | null> {
  if (assigneeIds.length === 0) return null;

  const uniqueIds = Array.from(new Set(assigneeIds));
  const existing = await User.find({ _id: { $in: uniqueIds }, isActive: true })
    .select("_id")
    .lean();
  if (existing.length !== uniqueIds.length) {
    return "One or more assignees do not exist or are inactive";
  }

  if (isAdmin(user)) return null;

  const allowed = new Set<string>([user.userId]);
  if (project) {
    allowed.add(project.owner.toString());
    for (const m of project.members) allowed.add(m.toString());
  }
  for (const id of uniqueIds) {
    if (!allowed.has(id)) {
      return "You can only assign tasks to yourself or members of this project";
    }
  }
  return null;
}
