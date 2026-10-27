import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["planning", "active", "on_hold", "completed"]).default("planning"),
  color: z.string().max(32).optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  members: z.array(z.string()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["planning", "active", "on_hold", "completed"]).optional(),
  color: z.string().max(32).optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  archived: z.boolean().optional(),
});

export const projectMemberSchema = z.object({
  userId: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
