import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "member";
  avatarColor?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    avatarColor: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
