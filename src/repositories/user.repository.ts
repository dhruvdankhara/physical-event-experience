import type { DocumentData } from "@google-cloud/firestore";
import connectDB from "@/lib/db";
import type { AppRole } from "@/lib/auth";
import type { UserRecord } from "@/types/models";
import { normalizeEmail, asString, asRole, asISODate } from "./utils";

const USERS_COLLECTION = "users";

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role?: AppRole;
};

type UserDocument = Omit<UserRecord, "_id">;

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

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await connectDB();
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await db.collection(USERS_COLLECTION).where("email", "==", normalizedEmail).limit(1).get();

  if (snapshot.empty) return null;
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
  return { _id: docRef.id, ...payload };
}
