import { z } from "zod";

export const taskStatusEnum = z.enum([
  "todo",
  "in_progress",
  "in_review",
  "hold",
  "completed",
]);

export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  project: z.string().nullable().optional(),
  status: taskStatusEnum.default("todo"),
  priority: taskPriorityEnum.default("medium"),
  category: z.string().max(80).optional().or(z.literal("")),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  assignees: z.array(z.string()).optional(),
  notifyByEmail: z.boolean().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().or(z.literal("")),
  project: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  category: z.string().max(80).optional().or(z.literal("")),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  assignees: z.array(z.string()).optional(),
  notifyByEmail: z.boolean().optional(),
});

export const moveTaskSchema = z.object({
  status: taskStatusEnum,
  position: z.number(),
});

export const addCommentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty").max(2000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
