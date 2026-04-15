import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPOI extends Document {
  name: string;
  type: "RESTROOM" | "CONCESSION" | "MERCH" | "EXIT" | "FIRST_AID";
  location: {
    type: string;
    coordinates: number[];
  };
  currentWaitTime: number;
  status: "OPEN" | "CLOSED" | "AT_CAPACITY";
}

const POISchema: Schema<IPOI> = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["RESTROOM", "CONCESSION", "MERCH", "EXIT", "FIRST_AID"],
      required: true,
    },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    currentWaitTime: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "AT_CAPACITY"],
      default: "OPEN",
    },
  },
  { timestamps: true },
);

// Keeps geospatial queries efficient for venue location operations.
POISchema.index({ location: "2dsphere" });

const POI =
  (mongoose.models.POI as Model<IPOI>) ||
  mongoose.model<IPOI>("POI", POISchema);

export default POI;
