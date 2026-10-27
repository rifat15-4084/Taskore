import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyReport extends Document {
  user: mongoose.Types.ObjectId;
  date: string;
  summary: string;
  tasksWorkedOn: mongoose.Types.ObjectId[];
  blockers?: string;
  hoursWorked?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReportSchema = new Schema<IDailyReport>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    summary: { type: String, required: true },
    tasksWorkedOn: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    blockers: { type: String },
    hoursWorked: { type: Number },
  },
  { timestamps: true }
);

DailyReportSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyReport: Model<IDailyReport> = mongoose.models.DailyReport || mongoose.model<IDailyReport>("DailyReport", DailyReportSchema);
export default DailyReport;
