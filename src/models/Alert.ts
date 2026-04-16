import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface IAlert extends Document {
  title: string;
  message: string;
  severity: AlertSeverity;
  active: boolean;
  audience: "ALL" | "ATTENDEE" | "STAFF";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema: Schema<IAlert> = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },
    active: { type: Boolean, default: true },
    audience: {
      type: String,
      enum: ["ALL", "ATTENDEE", "STAFF"],
      default: "ALL",
    },
    createdBy: { type: String, required: false },
  },
  { timestamps: true },
);

const AlertModel =
  (mongoose.models.Alert as Model<IAlert>) ||
  mongoose.model<IAlert>("Alert", AlertSchema);

export default AlertModel;
