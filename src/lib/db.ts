import { Firestore } from "@google-cloud/firestore";

type FirestoreRuntimeConfig = {
  projectId?: string;
  databaseId?: string;
};

declare global {
  var firestore: Firestore | undefined;
}

const globalForFirestore = globalThis as typeof globalThis & {
  firestore?: Firestore;
};

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted.length > 0 ? unquoted : undefined;
  }

  return trimmed;
}

export function getFirestoreRuntimeConfig(): FirestoreRuntimeConfig {
  const projectId =
    normalizeEnvValue(process.env.FIRESTORE_PROJECT_ID) ??
    normalizeEnvValue(process.env.GOOGLE_CLOUD_PROJECT_ID) ??
    normalizeEnvValue(process.env.GOOGLE_CLOUD_PROJECT) ??
    normalizeEnvValue(process.env.GCLOUD_PROJECT);

  const databaseId = normalizeEnvValue(process.env.FIRESTORE_DATABASE_ID);

  return {
    ...(projectId ? { projectId } : {}),
    ...(databaseId ? { databaseId } : {}),
  };
}

function createFirestoreClient() {
  return new Firestore(getFirestoreRuntimeConfig());
}

async function connectDB() {
  if (!globalForFirestore.firestore) {
    globalForFirestore.firestore = createFirestoreClient();
  }

  return globalForFirestore.firestore;
}

export default connectDB;
