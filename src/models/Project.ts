import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  status: "planning" | "active" | "on_hold" | "completed";
  color?: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  deadline?: Date;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ["planning", "active", "on_hold", "completed"], default: "planning" },
    color: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deadline: { type: Date },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
export default Project;
