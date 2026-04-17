import {
  listPOIQueueState,
  type POIStatus,
} from "@/lib/firestore-repositories";
import type { POIRealtimePatchEvent } from "@/features/map/poi-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown stream error";
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      const emitData = (payload: unknown) => {
        enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      };

      request.signal.addEventListener(
        "abort",
        () => {
          cleanup();

          try {
            controller.close();
          } catch {
            // No-op: stream may already be closed.
          }
        },
        { once: true },
      );

      const snapshot = new Map<
        string,
        { currentWaitTime: number; status: POIStatus }
      >();

      try {
        enqueue(": connected\n\n");

        heartbeat = setInterval(() => {
          if (isClosed) {
            return;
          }

          try {
            enqueue(": keep-alive\n\n");
          } catch {
            // If enqueue fails, stream teardown will happen via abort/cancel paths.
          }
        }, 25000);

        while (!isClosed && !request.signal.aborted) {
          try {
            const poiRows = await listPOIQueueState();
            const seenIds = new Set<string>();

            for (const row of poiRows) {
              seenIds.add(row._id);

              const previous = snapshot.get(row._id);

              snapshot.set(row._id, {
                currentWaitTime: row.currentWaitTime,
                status: row.status,
              });

              if (!previous) {
                continue;
              }

              const waitChanged =
                previous.currentWaitTime !== row.currentWaitTime;
              const statusChanged = previous.status !== row.status;

              if (!waitChanged && !statusChanged) {
                continue;
              }

              emitData({
                type: "poi.wait-time.patch",
                poiId: row._id,
                timestamp: new Date().toISOString(),
                ...(waitChanged
                  ? { currentWaitTime: row.currentWaitTime }
                  : {}),
                ...(statusChanged ? { status: row.status } : {}),
              } satisfies POIRealtimePatchEvent);
            }

            for (const existingId of Array.from(snapshot.keys())) {
              if (!seenIds.has(existingId)) {
                snapshot.delete(existingId);
              }
            }
          } catch (error) {
            emitData({
              type: "poi.wait-time.error",
              timestamp: new Date().toISOString(),
              reason: getErrorMessage(error),
            });
          }

          await wait(4000);
        }
      } finally {
        cleanup();

        try {
          controller.close();
        } catch {
          // No-op: stream may already be closed.
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
