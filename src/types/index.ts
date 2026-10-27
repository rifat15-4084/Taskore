export type TaskStatus = "todo" | "in_progress" | "in_review" | "hold" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type Role = "admin" | "member";

export interface UserRef {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  role?: Role;
}

export interface ProjectRef {
  id: string;
  name: string;
  color?: string;
  status?: ProjectStatus;
}

export interface TaskComment {
  id: string;
  author: UserRef | { id: string };
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  project?: ProjectRef | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  dueAt?: string | null;
  assignees: UserRef[];
  createdBy: UserRef;
  position: number;
  completedAt?: string | null;
  notifyByEmail: boolean;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  owner: UserRef;
  members: UserRef[];
  deadline?: string | null;
  archived: boolean;
  progress?: { total: number; completed: number };
  createdAt: string;
}

export const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string; ring: string }[] = [
  { status: "todo", label: "To Do", color: "bg-slate-500", ring: "ring-slate-500/40" },
  { status: "in_progress", label: "In Progress", color: "bg-cyan-500", ring: "ring-cyan-500/40" },
  { status: "in_review", label: "In Review", color: "bg-violet-500", ring: "ring-violet-500/40" },
  { status: "hold", label: "Hold", color: "bg-amber-500", ring: "ring-amber-500/40" },
  { status: "completed", label: "Completed", color: "bg-emerald-500", ring: "ring-emerald-500/40" },
];

export const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  medium: { label: "Medium", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  high: { label: "High", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  urgent: { label: "Urgent", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  active: { label: "Active", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  on_hold: { label: "On Hold", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

export const AVATAR_COLORS = [
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];
