import type { DocumentData } from "@google-cloud/firestore";
import { getFirestoreRuntimeConfig } from "@/lib/db";
import type { AppRole } from "@/lib/auth";
import type { AlertSeverity, AlertAudience, POIType, POIStatus } from "@/types/models";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asISODate(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as any).toDate === "function") {
    const converted = (value as { toDate: () => Date }).toDate();
    if (converted instanceof Date && !Number.isNaN(converted.valueOf())) {
      return converted.toISOString();
    }
  }
  return new Date().toISOString();
}

export function asRole(value: unknown): AppRole {
  if (value === "ATTENDEE" || value === "STAFF" || value === "ADMIN") return value;
  return "ATTENDEE";
}

export function asAlertSeverity(value: unknown): AlertSeverity {
  if (value === "INFO" || value === "WARNING" || value === "CRITICAL") return value;
  return "INFO";
}

export function asAlertAudience(value: unknown): AlertAudience {
  if (value === "ALL" || value === "ATTENDEE" || value === "STAFF") return value;
  return "ALL";
}

export function asPOIType(value: unknown): POIType {
  if (value === "RESTROOM" || value === "CONCESSION" || value === "MERCH" || value === "EXIT" || value === "FIRST_AID") return value;
  return "CONCESSION";
}

export function asPOIStatus(value: unknown): POIStatus {
  if (value === "OPEN" || value === "CLOSED" || value === "AT_CAPACITY") return value;
  return "OPEN";
}

export function asCoordinates(value: unknown): [number, number] {
  if (!Array.isArray(value)) return [0, 0];
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  return [Number.isFinite(lng) ? lng : 0, Number.isFinite(lat) ? lat : 0];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toFirestoreOperationError(operation: string, error: unknown) {
  const numericCode = isRecord(error) && typeof error.code === "number"
    ? error.code
    : isRecord(error) && typeof error.code === "string" ? Number(error.code) : undefined;

  if (numericCode === 5) {
    const runtimeConfig = getFirestoreRuntimeConfig();
    const projectId = runtimeConfig.projectId ?? "from Application Default Credentials";
    const databaseId = runtimeConfig.databaseId ?? "(default)";
    const details = isRecord(error) && typeof error.details === "string" && error.details ? ` Details: ${error.details}` : "";

    const wrapped = new Error(
      `Firestore returned NOT_FOUND while ${operation}. Ensure Firestore is enabled for project '${projectId}' and that database '${databaseId}' exists. If needed, set FIRESTORE_PROJECT_ID and FIRESTORE_DATABASE_ID.${details}`
    );
    return Object.assign(wrapped, { cause: error });
  }

  if (error instanceof Error) return error;
  return new Error(`Unexpected Firestore error while ${operation}.`);
}
