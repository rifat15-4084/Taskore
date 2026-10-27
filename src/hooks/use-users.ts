"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRef } from "@/types";

export interface UserOptionsResponse {
  success: boolean;
  users: UserRef[];
}

export function useUserOptions() {
  return useQuery<UserOptionsResponse>({
    queryKey: ["user-options"],
    queryFn: async () => {
      const res = await fetch("/api/users/options");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  isActive: boolean;
  approvalStatus?: "approved" | "pending" | "rejected";
  avatarColor?: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AdminUsersResponse {
  success: boolean;
  users: (AdminUser & { _id?: string })[];
}

export function useAdminUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
  approval?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.role) sp.set("role", params.role);
  if (params?.status) sp.set("status", params.status);
  if (params?.approval) sp.set("approval", params.approval);
  const qs = sp.toString();
  return useQuery<AdminUsersResponse>({
    queryKey: ["users", params ?? {}],
    queryFn: async () => {
      const res = await fetch(`/api/users${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });
}

export function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["user-options"] });
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
}
