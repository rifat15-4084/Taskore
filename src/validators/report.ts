import { z } from "zod";

export const dailyReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  summary: z.string().min(1, "Summary is required").max(5000),
  blockers: z.string().max(2000).optional().or(z.literal("")),
  hoursWorked: z.number().min(0).max(24).optional().nullable(),
  tasksWorkedOn: z.array(z.string()).optional(),
});

export const dailyReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().optional(),
});

export type DailyReportInput = z.infer<typeof dailyReportSchema>;
