import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "member"]).default("member"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});

export const setRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const setStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
