"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import {
  POIS_QUERY_KEY,
  type POIRealtimePatchEvent,
  type POIResponseItem,
} from "@/features/map/poi-data";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPOIRealtimePatchEvent(
  value: unknown,
): value is POIRealtimePatchEvent {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type !== "poi.wait-time.patch") {
    return false;
  }

  if (typeof value.poiId !== "string") {
    return false;
  }

  if (typeof value.timestamp !== "string") {
    return false;
  }

  const hasValidWaitTime =
    value.currentWaitTime === undefined ||
    typeof value.currentWaitTime === "number";

  const hasValidStatus =
    value.status === undefined ||
    value.status === "OPEN" ||
    value.status === "CLOSED" ||
    value.status === "AT_CAPACITY";

  return hasValidWaitTime && hasValidStatus;
}

export function useRealTimeWaitTimes() {
  const queryClient = useQueryClient();
  const hadDisconnectRef = useRef(false);

  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.onopen = () => {
      if (hadDisconnectRef.current) {
        hadDisconnectRef.current = false;
        void queryClient.invalidateQueries({ queryKey: POIS_QUERY_KEY });
      }
    };

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);

        if (!isPOIRealtimePatchEvent(payload)) {
          return;
        }

        queryClient.setQueryData<POIResponseItem[]>(
          POIS_QUERY_KEY,
          (currentPois = []) => {
            return currentPois.map((poi) => {
              if (poi._id !== payload.poiId) {
                return poi;
              }

              return {
                ...poi,
                ...(payload.currentWaitTime !== undefined
                  ? { currentWaitTime: payload.currentWaitTime }
                  : {}),
                ...(payload.status !== undefined
                  ? { status: payload.status }
                  : {}),
              };
            });
          },
        );
      } catch (error) {
        console.error("Failed to parse SSE payload:", error);
      }
    };

    source.onerror = () => {
      hadDisconnectRef.current = true;
      // EventSource automatically attempts reconnection for transient failures.
    };

    return () => {
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      source.close();
    };
  }, [queryClient]);
}
