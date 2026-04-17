import {
  listAlerts,
  createAlert,
  getAlertById,
  updateAlertById,
  deleteAlertById,
  type CreateAlertInput,
  type UpdateAlertInput,
} from "@/repositories/alert.repository";

export async function getAllAlerts(limitCount = 50) {
  return await listAlerts(limitCount);
}

export async function createNewAlert(input: CreateAlertInput) {
  return await createAlert(input);
}

export async function fetchAlertById(id: string) {
  return await getAlertById(id);
}

export async function modifyAlertById(id: string, updates: UpdateAlertInput) {
  return await updateAlertById(id, updates);
}

export async function removeAlertById(id: string) {
  return await deleteAlertById(id);
}
