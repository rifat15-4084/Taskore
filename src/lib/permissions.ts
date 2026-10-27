import dbConnect from "@/lib/db";
import Project, { IProject } from "@/models/Project";
import Task, { ITask } from "@/models/Task";
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
