import connectDB from "@/lib/db";
import POI from "@/models/POI";
import type { POIRealtimePatchEvent } from "@/features/map/poi-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type POIStatus = "OPEN" | "CLOSED" | "AT_CAPACITY";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStatus(value: unknown): POIStatus | undefined {
  if (value === "OPEN" || value === "CLOSED" || value === "AT_CAPACITY") {
    return value;
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toStringId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.toString === "function") {
    return value.toString();
  }

  return undefined;
}

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

function buildPatchFromChange(change: unknown): POIRealtimePatchEvent | null {
  if (!isRecord(change)) {
    return null;
  }

  const fullDocument = isRecord(change["fullDocument"])
    ? change["fullDocument"]
    : null;

  const updateDescription = isRecord(change["updateDescription"])
    ? change["updateDescription"]
    : null;

  const documentKey = isRecord(change["documentKey"])
    ? change["documentKey"]
    : null;

  const updatedFields =
    updateDescription && isRecord(updateDescription.updatedFields)
      ? updateDescription.updatedFields
      : null;

  const poiId = toStringId(fullDocument?._id) ?? toStringId(documentKey?._id);

  if (!poiId) {
    return null;
  }

  const waitFromDoc = toNumber(fullDocument?.currentWaitTime);
  const waitFromPatch = toNumber(updatedFields?.currentWaitTime);
  const statusFromDoc = toStatus(fullDocument?.status);
  const statusFromPatch = toStatus(updatedFields?.status);

  const currentWaitTime = waitFromPatch ?? waitFromDoc;
  const status = statusFromPatch ?? statusFromDoc;

  if (currentWaitTime === undefined && status === undefined) {
    return null;
  }

  return {
    type: "poi.wait-time.patch",
    poiId,
    timestamp: new Date().toISOString(),
    ...(currentWaitTime !== undefined ? { currentWaitTime } : {}),
    ...(status !== undefined ? { status } : {}),
  };
}

export async function GET(request: Request) {
  await connectDB();

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let changeStream: ReturnType<typeof POI.watch> | null = null;
  let isClosed = false;

  const cleanup = async () => {
    if (isClosed) {
      return;
    }

    isClosed = true;

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    if (changeStream) {
      await changeStream.close().catch(() => undefined);
      changeStream = null;
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
          void cleanup().finally(() => {
            try {
              controller.close();
            } catch {
              // No-op: stream may already be closed.
            }
          });
        },
        { once: true },
      );

      const runPollingFallback = async (reason: string) => {
        emitData({
          type: "poi.wait-time.error",
          timestamp: new Date().toISOString(),
          reason,
        });

        const snapshot = new Map<
          string,
          { currentWaitTime?: number; status?: POIStatus }
        >();

        while (!isClosed && !request.signal.aborted) {
          try {
            const poiDocs = await POI.find({})
              .select("_id currentWaitTime status")
              .lean();

            const seenIds = new Set<string>();

            for (const poiDoc of poiDocs) {
              const poiRecord = isRecord(poiDoc) ? poiDoc : null;

              if (!poiRecord) {
                continue;
              }

              const poiId = toStringId(poiRecord._id);

              if (!poiId) {
                continue;
              }

              seenIds.add(poiId);

              const currentWaitTime = toNumber(poiRecord.currentWaitTime);
              const status = toStatus(poiRecord.status);

              const previous = snapshot.get(poiId);

              snapshot.set(poiId, { currentWaitTime, status });

              if (!previous) {
                continue;
              }

              const waitChanged = previous.currentWaitTime !== currentWaitTime;
              const statusChanged = previous.status !== status;

              if (!waitChanged && !statusChanged) {
                continue;
              }

              emitData({
                type: "poi.wait-time.patch",
                poiId,
                timestamp: new Date().toISOString(),
                ...(waitChanged && currentWaitTime !== undefined
                  ? { currentWaitTime }
                  : {}),
                ...(statusChanged && status !== undefined ? { status } : {}),
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
      };

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

        changeStream = POI.watch(
          [
            {
              $match: {
                operationType: {
                  $in: ["insert", "update", "replace"],
                },
              },
            },
          ],
          { fullDocument: "updateLookup" },
        );

        const handleChange = (change: unknown) => {
          const payload = buildPatchFromChange(change);

          if (!payload) {
            return;
          }

          emitData(payload);
        };

        changeStream.on("change", handleChange);

        await new Promise<void>((resolve, reject) => {
          const handleAbort = () => {
            changeStream?.off("change", handleChange);
            resolve();
          };

          request.signal.addEventListener("abort", handleAbort, { once: true });

          changeStream?.once("error", (error: unknown) => {
            request.signal.removeEventListener("abort", handleAbort);
            changeStream?.off("change", handleChange);
            reject(error);
          });
        });
      } catch (error) {
        await runPollingFallback(getErrorMessage(error));
      } finally {
        await cleanup();

        try {
          controller.close();
        } catch {
          // No-op: stream may already be closed.
        }
      }
    },
    async cancel() {
      await cleanup();
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
