import type { AppRole } from "@/lib/auth";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertAudience = "ALL" | "ATTENDEE" | "STAFF";

export type POIType =
  | "RESTROOM"
  | "CONCESSION"
  | "MERCH"
  | "EXIT"
  | "FIRST_AID";
export type POIStatus = "OPEN" | "CLOSED" | "AT_CAPACITY";

export type UserRecord = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  createdAt: string;
  updatedAt: string;
};

export type AlertRecord = {
  _id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  active: boolean;
  audience: AlertAudience;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type POIRecord = {
  _id: string;
  name: string;
  type: POIType;
  sectionId?: string;
  blockId?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  currentWaitTime: number;
  status: POIStatus;
  createdAt: string;
  updatedAt: string;
};

export type POIQueueState = {
  _id: string;
  currentWaitTime: number;
  status: POIStatus;
};
