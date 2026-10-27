"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type CurrentUser } from "@/lib/api-client";

interface MeResponse {
  success: boolean;
  user?: CurrentUser;
}

export function useCurrentUser() {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      return (await res.json()) as MeResponse;
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  return { user: data?.user ?? null, isLoading };
}

export { api };
