import { FieldValue, type DocumentData } from "@google-cloud/firestore";

import type { AppRole } from "@/lib/auth";
import connectDB, { getFirestoreRuntimeConfig } from "@/lib/db";

const USERS_COLLECTION = "users";
const ALERTS_COLLECTION = "alerts";
const POIS_COLLECTION = "pois";
const MAX_BATCH_OPERATIONS = 450;

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

type UserDocument = Omit<UserRecord, "_id">;
type AlertDocument = Omit<AlertRecord, "_id">;
type POIDocument = Omit<POIRecord, "_id">;

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role?: AppRole;
};

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

export type CreatePOIInput = {
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
};

export type POIQueueState = {
  _id: string;
  currentWaitTime: number;
  status: POIStatus;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asISODate(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const converted = (value as { toDate: () => Date }).toDate();

    if (converted instanceof Date && !Number.isNaN(converted.valueOf())) {
      return converted.toISOString();
    }
  }

  return new Date().toISOString();
}

function asRole(value: unknown): AppRole {
  if (value === "ATTENDEE" || value === "STAFF" || value === "ADMIN") {
    return value;
  }

  return "ATTENDEE";
}

function asAlertSeverity(value: unknown): AlertSeverity {
  if (value === "INFO" || value === "WARNING" || value === "CRITICAL") {
    return value;
  }

  return "INFO";
}

function asAlertAudience(value: unknown): AlertAudience {
  if (value === "ALL" || value === "ATTENDEE" || value === "STAFF") {
    return value;
  }

  return "ALL";
}

function asPOIType(value: unknown): POIType {
  if (
    value === "RESTROOM" ||
    value === "CONCESSION" ||
    value === "MERCH" ||
    value === "EXIT" ||
    value === "FIRST_AID"
  ) {
    return value;
  }

  return "CONCESSION";
}

function asPOIStatus(value: unknown): POIStatus {
  if (value === "OPEN" || value === "CLOSED" || value === "AT_CAPACITY") {
    return value;
  }

  return "OPEN";
}

function asCoordinates(value: unknown): [number, number] {
  if (!Array.isArray(value)) {
    return [0, 0];
  }

  const lng = Number(value[0]);
  const lat = Number(value[1]);

  return [Number.isFinite(lng) ? lng : 0, Number.isFinite(lat) ? lat : 0];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFirestoreOperationError(operation: string, error: unknown) {
  const numericCode =
    isRecord(error) && typeof error.code === "number"
      ? error.code
      : isRecord(error) && typeof error.code === "string"
        ? Number(error.code)
        : undefined;

  if (numericCode === 5) {
    const runtimeConfig = getFirestoreRuntimeConfig();
    const projectId =
      runtimeConfig.projectId ?? "from Application Default Credentials";
    const databaseId = runtimeConfig.databaseId ?? "(default)";
    const details =
      isRecord(error) && typeof error.details === "string" && error.details
        ? ` Details: ${error.details}`
        : "";

    const wrapped = new Error(
      `Firestore returned NOT_FOUND while ${operation}. Ensure Firestore is enabled for project '${projectId}' and that database '${databaseId}' exists. If needed, set FIRESTORE_PROJECT_ID and FIRESTORE_DATABASE_ID.${details}`,
    );

    return Object.assign(wrapped, { cause: error });
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Unexpected Firestore error while ${operation}.`);
}

function mapUserRecord(id: string, data: DocumentData): UserRecord {
  return {
    _id: id,
    name: asString(data.name),
    email: normalizeEmail(asString(data.email)),
    passwordHash: asString(data.passwordHash),
    role: asRole(data.role),
    createdAt: asISODate(data.createdAt),
    updatedAt: asISODate(data.updatedAt),
  };
}

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

function mapPOIRecord(id: string, data: DocumentData): POIRecord {
  const locationData =
    typeof data.location === "object" && data.location !== null
      ? (data.location as Record<string, unknown>)
      : {};

  return {
    _id: id,
    name: asString(data.name),
    type: asPOIType(data.type),
    sectionId: asOptionalString(data.sectionId),
    blockId: asOptionalString(data.blockId),
    location: {
      type: "Point",
      coordinates: asCoordinates(locationData.coordinates),
    },
    currentWaitTime: asNumber(data.currentWaitTime),
    status: asPOIStatus(data.status),
    createdAt: asISODate(data.createdAt),
    updatedAt: asISODate(data.updatedAt),
  };
}

export async function getUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const db = await connectDB();
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await db
    .collection(USERS_COLLECTION)
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const user = snapshot.docs[0];
  return mapUserRecord(user.id, user.data());
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const db = await connectDB();
  const now = new Date().toISOString();
  const docRef = db.collection(USERS_COLLECTION).doc();

  const payload: UserDocument = {
    name: input.name,
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    role: input.role ?? "ATTENDEE",
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(payload);

  return {
    _id: docRef.id,
    ...payload,
  };
}

export async function listAlerts(limitCount = 50): Promise<AlertRecord[]> {
  const db = await connectDB();
  const snapshot = await db
    .collection(ALERTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => mapAlertRecord(doc.id, doc.data()));
}

export async function createAlert(
  input: CreateAlertInput,
): Promise<AlertRecord> {
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

  return {
    _id: docRef.id,
    ...payload,
  };
}

export async function getAlertById(id: string): Promise<AlertRecord | null> {
  const db = await connectDB();
  const snapshot = await db.collection(ALERTS_COLLECTION).doc(id).get();
  const data = snapshot.data();

  if (!data) {
    return null;
  }

  return mapAlertRecord(snapshot.id, data);
}

export async function updateAlertById(
  id: string,
  updates: UpdateAlertInput,
): Promise<AlertRecord | null> {
  const db = await connectDB();
  const docRef = db.collection(ALERTS_COLLECTION).doc(id);
  const currentSnapshot = await docRef.get();

  if (!currentSnapshot.exists) {
    return null;
  }

  await docRef.update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  const updatedSnapshot = await docRef.get();
  const updatedData = updatedSnapshot.data();

  if (!updatedData) {
    return null;
  }

  return mapAlertRecord(updatedSnapshot.id, updatedData);
}

export async function deleteAlertById(id: string): Promise<boolean> {
  const db = await connectDB();
  const docRef = db.collection(ALERTS_COLLECTION).doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

export async function listPOIs(): Promise<POIRecord[]> {
  try {
    const db = await connectDB();
    const snapshot = await db.collection(POIS_COLLECTION).get();

    return snapshot.docs.map((doc) => mapPOIRecord(doc.id, doc.data()));
  } catch (error) {
    throw toFirestoreOperationError("listing POIs", error);
  }
}

export async function getPOIById(id: string): Promise<POIRecord | null> {
  try {
    const db = await connectDB();
    const snapshot = await db.collection(POIS_COLLECTION).doc(id).get();
    const data = snapshot.data();

    if (!data) {
      return null;
    }

    return mapPOIRecord(snapshot.id, data);
  } catch (error) {
    throw toFirestoreOperationError(`reading POI '${id}'`, error);
  }
}

export async function replaceAllPOIs(pois: CreatePOIInput[]): Promise<number> {
  try {
    const db = await connectDB();
    const collection = db.collection(POIS_COLLECTION);

    while (true) {
      const snapshot = await collection.limit(MAX_BATCH_OPERATIONS).get();

      if (snapshot.empty) {
        break;
      }

      const batch = db.batch();

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
      }

      await batch.commit();
    }

    let batch = db.batch();
    let operations = 0;
    const now = new Date().toISOString();

    for (const poi of pois) {
      const ref = collection.doc();

      const payload: POIDocument = {
        name: poi.name,
        type: poi.type,
        ...(poi.sectionId ? { sectionId: poi.sectionId } : {}),
        ...(poi.blockId ? { blockId: poi.blockId } : {}),
        location: {
          type: "Point",
          coordinates: asCoordinates(poi.location.coordinates),
        },
        currentWaitTime: poi.currentWaitTime,
        status: poi.status,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(ref, payload);
      operations += 1;

      if (operations === MAX_BATCH_OPERATIONS) {
        await batch.commit();
        batch = db.batch();
        operations = 0;
      }
    }

    if (operations > 0) {
      await batch.commit();
    }

    return pois.length;
  } catch (error) {
    throw toFirestoreOperationError("replacing POIs", error);
  }
}

export async function incrementRandomPOIWaitTime(
  incrementBy = 10,
): Promise<POIRecord | null> {
  try {
    const db = await connectDB();
    const collection = db.collection(POIS_COLLECTION);
    const snapshot = await collection.get();

    if (snapshot.empty) {
      return null;
    }

    const randomDoc =
      snapshot.docs[Math.floor(Math.random() * snapshot.docs.length)];

    await randomDoc.ref.update({
      currentWaitTime: FieldValue.increment(incrementBy),
      updatedAt: new Date().toISOString(),
    });

    const updatedSnapshot = await randomDoc.ref.get();
    const updatedData = updatedSnapshot.data();

    if (!updatedData) {
      return null;
    }

    return mapPOIRecord(updatedSnapshot.id, updatedData);
  } catch (error) {
    throw toFirestoreOperationError("incrementing POI wait time", error);
  }
}

export async function listPOIQueueState(): Promise<POIQueueState[]> {
  try {
    const db = await connectDB();
    const snapshot = await db
      .collection(POIS_COLLECTION)
      .select("currentWaitTime", "status")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        _id: doc.id,
        currentWaitTime: asNumber(data.currentWaitTime),
        status: asPOIStatus(data.status),
      };
    });
  } catch (error) {
    throw toFirestoreOperationError("listing POI queue state", error);
  }
}
