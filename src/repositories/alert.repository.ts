import type { DocumentData } from "@google-cloud/firestore";
import connectDB from "@/lib/db";
import type { AlertRecord, AlertSeverity, AlertAudience } from "@/types/models";
import { asString, asAlertSeverity, asBoolean, asAlertAudience, asOptionalString, asISODate } from "./utils";

const ALERTS_COLLECTION = "alerts";

type AlertDocument = Omit<AlertRecord, "_id">;

export type CreateAlertInput = {
  title: string;
  message: string;
  severity: AlertSeverity;
  audience: AlertAudience;
  active: boolean;
  createdBy?: string;
};

export type UpdateAlertInput = Partial<
  Pick<AlertRecord, "title" | "message" | "severity" | "audience" | "active">
>;

function mapAlertRecord(id: string, data: DocumentData): AlertRecord {
  return {
    _id: id,
    title: asString(data.title),
    message: asString(data.message),
    severity: asAlertSeverity(data.severity),
    active: asBoolean(data.active, true),
    audience: asAlertAudience(data.audience),
    createdBy: asOptionalString(data.createdBy),
    createdAt: asISODate(data.createdAt),
    updatedAt: asISODate(data.updatedAt),
  };
}

export async function listAlerts(limitCount = 50): Promise<AlertRecord[]> {
  const db = await connectDB();
  const snapshot = await db.collection(ALERTS_COLLECTION).orderBy("createdAt", "desc").limit(limitCount).get();
  return snapshot.docs.map((doc) => mapAlertRecord(doc.id, doc.data()));
}

export async function createAlert(input: CreateAlertInput): Promise<AlertRecord> {
  const db = await connectDB();
  const now = new Date().toISOString();
  const docRef = db.collection(ALERTS_COLLECTION).doc();

  const payload: AlertDocument = {
    title: input.title,
    message: input.message,
    severity: input.severity,
    active: input.active,
    audience: input.audience,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(payload);
  return { _id: docRef.id, ...payload };
}

export async function getAlertById(id: string): Promise<AlertRecord | null> {
  const db = await connectDB();
  const snapshot = await db.collection(ALERTS_COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!data) return null;
  return mapAlertRecord(snapshot.id, data);
}

export async function updateAlertById(id: string, updates: UpdateAlertInput): Promise<AlertRecord | null> {
  const db = await connectDB();
  const docRef = db.collection(ALERTS_COLLECTION).doc(id);
  const currentSnapshot = await docRef.get();

  if (!currentSnapshot.exists) return null;

  await docRef.update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  const updatedSnapshot = await docRef.get();
  const updatedData = updatedSnapshot.data();
  if (!updatedData) return null;
  
  return mapAlertRecord(updatedSnapshot.id, updatedData);
}

export async function deleteAlertById(id: string): Promise<boolean> {
  const db = await connectDB();
  const docRef = db.collection(ALERTS_COLLECTION).doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) return false;

  await docRef.delete();
  return true;
}
