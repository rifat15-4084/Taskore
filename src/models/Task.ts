import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskComment {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  project?: mongoose.Types.ObjectId | null;
  status: "todo" | "in_progress" | "in_review" | "hold" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category?: string;
  dueAt?: Date;
  assignees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  position: number;
  completedAt?: Date;
  notifyByEmail: boolean;
  comments: ITaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<ITaskComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    status: { type: String, enum: ["todo", "in_progress", "in_review", "hold", "completed"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    category: { type: String },
    dueAt: { type: Date },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    position: { type: Number, default: 0 },
    completedAt: { type: Date },
    notifyByEmail: { type: Boolean, default: false },
    comments: [CommentSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TaskSchema.index({ project: 1, status: 1, position: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ createdBy: 1 });

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
export default Task;
