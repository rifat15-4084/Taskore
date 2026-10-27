import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  actor: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog: Model<IActivityLog> = mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
export default ActivityLog;
