import Task from "@/models/Task";
import type { ITaskComment } from "@/models/Task";

export const TASK_POPULATE = [
  { path: "project", select: "name color status" },
  { path: "assignees", select: "name email avatarColor role" },
  { path: "createdBy", select: "name email avatarColor role" },
];

export const TASK_LIST_FIELDS =
  "title description status priority category dueAt position project assignees createdBy notifyByEmail completedAt createdAt updatedAt";

export function baseTaskQuery() {
  return Task.find().select(TASK_LIST_FIELDS).populate(TASK_POPULATE);
}

export function serializeComment(c: ITaskComment, author?: unknown) {
  return {
    id: String(c._id),
    author: author ?? c.author,
    text: c.text,
    createdAt: c.createdAt,
  };
}
