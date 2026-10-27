"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/types";

export interface ProjectListResponse {
  success: boolean;
  projects: Project[];
}

export function useProjects(opts?: { archived?: boolean; q?: string }) {
  const sp = new URLSearchParams();
  if (opts?.archived) sp.set("archived", "true");
  if (opts?.q) sp.set("q", opts.q);
  const qs = sp.toString();

  return useQuery<ProjectListResponse>({
    queryKey: ["projects", opts ?? {}],
    queryFn: async () => {
      const res = await fetch(`/api/projects${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });
}

export interface ProjectStats {
  total: number;
  completed: number;
  byStatus?: { _id: string; count: number }[];
}

export function useProject(id: string | null) {
  return useQuery<{ success: boolean; project: Project; stats: ProjectStats }>({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["project"] });
    qc.invalidateQueries({ queryKey: ["member-dashboard"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
}
