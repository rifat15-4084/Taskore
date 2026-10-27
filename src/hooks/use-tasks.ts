"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types";

export interface TaskListResponse {
  success: boolean;
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  project?: string;
  assignee?: string;
  q?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number | string;
  limit?: number | string;
}

function buildQuery(params: TaskQueryParams) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const qs = sp.toString();
  return `/api/tasks${qs ? `?${qs}` : ""}`;
}

export function useTasks(params: TaskQueryParams, enabled = true) {
  return useQuery<TaskListResponse>({
    queryKey: ["tasks", params],
    queryFn: async () => {
      const res = await fetch(buildQuery(params));
      return res.json();
    },
    enabled,
  });
}

export function useTask(id: string | null) {
  return useQuery<{ success: boolean; task: Task }>({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task"] });
    qc.invalidateQueries({ queryKey: ["member-dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
}
