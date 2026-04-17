import {
  listPOIs,
  getPOIById,
  replaceAllPOIs,
  incrementRandomPOIWaitTime,
  listPOIQueueState,
} from "@/repositories/poi.repository";
import { mockPOIs } from "@/features/map/mock-pois";

export async function getAllPOIs() {
  return await listPOIs();
}

export async function fetchPOIById(id: string) {
  return await getPOIById(id);
}

export async function seedPOIsDatabase() {
  return await replaceAllPOIs(mockPOIs);
}

export async function triggerWaitTimeIncrease(incrementBy = 10) {
  return await incrementRandomPOIWaitTime(incrementBy);
}

export async function fetchPOIQueueState() {
  return await listPOIQueueState();
}
