import { FieldValue, type DocumentData } from "@google-cloud/firestore";
import connectDB from "@/lib/db";
import type { POIRecord, POIType, POIStatus, POIQueueState } from "@/types/models";
import { asString, asPOIType, asOptionalString, asCoordinates, asNumber, asPOIStatus, asISODate, toFirestoreOperationError } from "./utils";

const POIS_COLLECTION = "pois";
const MAX_BATCH_OPERATIONS = 450;

type POIDocument = Omit<POIRecord, "_id">;

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

function mapPOIRecord(id: string, data: DocumentData): POIRecord {
  const locationData = typeof data.location === "object" && data.location !== null
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
    if (!data) return null;
    return mapPOIRecord(snapshot.id, data);
  } catch (error) {
    throw toFirestoreOperationError(`reading POI '${id}'`, error);
  }
}

async function deleteAllPOIs(collection: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>, db: FirebaseFirestore.Firestore) {
  while (true) {
    const snapshot = await collection.limit(MAX_BATCH_OPERATIONS).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

async function batchInsertPOIs(pois: CreatePOIInput[], collection: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>, db: FirebaseFirestore.Firestore) {
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
}

export async function replaceAllPOIs(pois: CreatePOIInput[]): Promise<number> {
  try {
    const db = await connectDB();
    const collection = db.collection(POIS_COLLECTION);

    await deleteAllPOIs(collection, db);
    await batchInsertPOIs(pois, collection, db);

    return pois.length;
  } catch (error) {
    throw toFirestoreOperationError("replacing POIs", error);
  }
}

export async function incrementRandomPOIWaitTime(incrementBy = 10): Promise<POIRecord | null> {
  try {
    const db = await connectDB();
    const collection = db.collection(POIS_COLLECTION);
    const snapshot = await collection.get();

    if (snapshot.empty) return null;

    const randomDoc = snapshot.docs[Math.floor(Math.random() * snapshot.docs.length)];
    await randomDoc.ref.update({
      currentWaitTime: FieldValue.increment(incrementBy),
      updatedAt: new Date().toISOString(),
    });

    const updatedSnapshot = await randomDoc.ref.get();
    const updatedData = updatedSnapshot.data();
    if (!updatedData) return null;

    return mapPOIRecord(updatedSnapshot.id, updatedData);
  } catch (error) {
    throw toFirestoreOperationError("incrementing POI wait time", error);
  }
}

export async function listPOIQueueState(): Promise<POIQueueState[]> {
  try {
    const db = await connectDB();
    const snapshot = await db.collection(POIS_COLLECTION).select("currentWaitTime", "status").get();

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
