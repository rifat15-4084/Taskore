"use client";

import type { UserRef } from "@/types";

function colorFor(input: string, provided?: string) {
  if (provided) return provided;
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = input.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ["#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];
  return colors[Math.abs(hash) % colors.length];
}

interface Props {
  user?: UserRef | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: Props) {
  const name = user?.name ?? "?";
  const initials = name
    .split(" ")
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = colorFor(user?.email ?? name, user?.avatarColor);

  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div
      title={user?.name}
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${sizes[size]} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}
