import { fetchPOIQueueState } from "@/services/poi.service";
import type { POIStatus } from "@/types/models";
import type { POIRealtimePatchEvent } from "@/features/map/poi-data";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown stream error";
}

export function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function sendSSEMessage(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, chunk: string) {
  try {
    controller.enqueue(encoder.encode(chunk));
  } catch {
    // If enqueue fails, stream teardown will happen via abort/cancel paths.
  }
}

export function sendSSEData(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown) {
  sendSSEMessage(controller, encoder, `data: ${JSON.stringify(payload)}\n\n`);
}

export async function pollPOIDifferences(
  snapshot: Map<string, { currentWaitTime: number; status: POIStatus }>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const poiRows = await fetchPOIQueueState();
  const seenIds = new Set<string>();

  for (const row of poiRows) {
    seenIds.add(row._id);
    const previous = snapshot.get(row._id);

    snapshot.set(row._id, {
      currentWaitTime: row.currentWaitTime,
      status: row.status,
    });

    if (!previous) continue;

    const waitChanged = previous.currentWaitTime !== row.currentWaitTime;
    const statusChanged = previous.status !== row.status;

    if (!waitChanged && !statusChanged) continue;

    const event: POIRealtimePatchEvent = {
      type: "poi.wait-time.patch",
      poiId: row._id,
      timestamp: new Date().toISOString(),
      ...(waitChanged ? { currentWaitTime: row.currentWaitTime } : {}),
      ...(statusChanged ? { status: row.status } : {}),
    };

    sendSSEData(controller, encoder, event);
  }

  for (const existingId of Array.from(snapshot.keys())) {
    if (!seenIds.has(existingId)) {
      snapshot.delete(existingId);
    }
  }
}

export function createPOIStream(signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      signal.addEventListener("abort", () => {
        cleanup();
        try { controller.close(); } catch {}
      }, { once: true });

      const snapshot = new Map<string, { currentWaitTime: number; status: POIStatus }>();

      try {
        sendSSEMessage(controller, encoder, ": connected\n\n");

        heartbeat = setInterval(() => {
          if (isClosed) return;
          sendSSEMessage(controller, encoder, ": keep-alive\n\n");
        }, 25000);

        while (!isClosed && !signal.aborted) {
          try {
            await pollPOIDifferences(snapshot, controller, encoder);
          } catch (error) {
            sendSSEData(controller, encoder, {
              type: "poi.wait-time.error",
              timestamp: new Date().toISOString(),
              reason: getErrorMessage(error),
            });
          }
          await wait(4000);
        }
      } finally {
        cleanup();
        try { controller.close(); } catch {}
      }
    },
    cancel() {
      cleanup();
    },
  });
}
