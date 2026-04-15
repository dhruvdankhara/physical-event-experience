"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import {
  fetchPOIs,
  POIS_QUERY_KEY,
  type POIResponseItem,
} from "@/features/map/poi-data";
import { cn } from "@/lib/utils";
import { setSelectedPoiId } from "@/store/slices/uiSlice";
import type { AppDispatch, RootState } from "@/store/store";

const STADIUM_BOUNDS: [[number, number], [number, number]] = [
  [-73.9885, 40.7605],
  [-73.9735, 40.7695],
];

type StadiumSection =
  | "NORTH_STAND"
  | "SOUTH_STAND"
  | "EAST_STAND"
  | "WEST_STAND"
  | "FIELD_CONCOURSE";

type ProjectedPOI = POIResponseItem & {
  x: number;
  y: number;
  section: StadiumSection;
};

const SECTION_LABELS: Record<StadiumSection, string> = {
  NORTH_STAND: "North Stand",
  SOUTH_STAND: "South Stand",
  EAST_STAND: "East Stand",
  WEST_STAND: "West Stand",
  FIELD_CONCOURSE: "Field Concourse",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function projectToCanvasPosition(coordinates: [number, number]) {
  const [[minLng, minLat], [maxLng, maxLat]] = STADIUM_BOUNDS;
  const [lng, lat] = coordinates;

  const normalizedX = clamp((lng - minLng) / (maxLng - minLng), 0, 1);
  const normalizedY = clamp(1 - (lat - minLat) / (maxLat - minLat), 0, 1);

  return {
    x: 10 + normalizedX * 80,
    y: 10 + normalizedY * 80,
  };
}

function toSection(x: number, y: number): StadiumSection {
  if (y <= 28) {
    return "NORTH_STAND";
  }

  if (y >= 72) {
    return "SOUTH_STAND";
  }

  if (x <= 28) {
    return "WEST_STAND";
  }

  if (x >= 72) {
    return "EAST_STAND";
  }

  return "FIELD_CONCOURSE";
}

function markerTypeLabel(type: POIResponseItem["type"]) {
  if (type === "CONCESSION") {
    return "FD";
  }

  if (type === "RESTROOM") {
    return "WC";
  }

  if (type === "FIRST_AID") {
    return "FA";
  }

  if (type === "MERCH") {
    return "SH";
  }

  return "EX";
}

function markerStatusClass(status: POIResponseItem["status"]) {
  if (status === "OPEN") {
    return "border-emerald-200/90 bg-emerald-500/90 text-emerald-950";
  }

  if (status === "AT_CAPACITY") {
    return "border-amber-200/90 bg-amber-500/90 text-amber-950";
  }

  return "border-rose-200/90 bg-rose-500/90 text-rose-950";
}

function sectionTintClass(section: StadiumSection) {
  if (section === "NORTH_STAND" || section === "SOUTH_STAND") {
    return "ring-cyan-300/60";
  }

  if (section === "EAST_STAND" || section === "WEST_STAND") {
    return "ring-indigo-300/60";
  }

  return "ring-emerald-300/60";
}

export function StadiumMap() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeFilter, selectedPoiId, searchTerm } = useSelector(
    (state: RootState) => state.ui,
  );

  const {
    data: pois = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: POIS_QUERY_KEY,
    queryFn: fetchPOIs,
  });

  const filteredPois = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return pois.filter((poi) => {
      if (activeFilter !== "ALL" && poi.type !== activeFilter) {
        return false;
      }

      if (
        normalizedSearchTerm.length > 0 &&
        !poi.name.toLowerCase().includes(normalizedSearchTerm)
      ) {
        return false;
      }

      const [lng, lat] = poi.location.coordinates;
      return typeof lng === "number" && typeof lat === "number";
    });
  }, [activeFilter, pois, searchTerm]);

  const projectedPois = useMemo<ProjectedPOI[]>(() => {
    return filteredPois.map((poi) => {
      const projected = projectToCanvasPosition(poi.location.coordinates);
      const hash = hashString(poi._id);
      const offsetX = ((hash % 5) - 2) * 1.1;
      const offsetY = ((Math.floor(hash / 5) % 5) - 2) * 1.1;
      const x = clamp(projected.x + offsetX, 8, 92);
      const y = clamp(projected.y + offsetY, 8, 92);

      return {
        ...poi,
        x,
        y,
        section: toSection(x, y),
      };
    });
  }, [filteredPois]);

  const selectedSection = useMemo(() => {
    return (
      projectedPois.find((poi) => poi._id === selectedPoiId)?.section ?? null
    );
  }, [projectedPois, selectedPoiId]);

  const sectionCount = useMemo(() => {
    return projectedPois.reduce<Record<StadiumSection, number>>(
      (accumulator, poi) => {
        accumulator[poi.section] += 1;
        return accumulator;
      },
      {
        NORTH_STAND: 0,
        SOUTH_STAND: 0,
        EAST_STAND: 0,
        WEST_STAND: 0,
        FIELD_CONCOURSE: 0,
      },
    );
  }, [projectedPois]);

  return (
    <div className="relative h-full min-h-dvh w-full overflow-hidden bg-linear-to-b from-slate-900 via-slate-950 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.12),transparent_38%)] opacity-50" />

      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(148,163,184,0.08)_0_1px,transparent_1px_56px)]" />

      <div className="relative flex h-full items-center justify-center px-3 py-24 sm:px-6 lg:px-10">
        <div className="relative aspect-4/3 h-full w-full max-w-6xl overflow-hidden rounded-[2.4rem] border border-white/12 bg-slate-900/65 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-[4.5%] rounded-[44%] border border-cyan-100/25 bg-linear-to-b from-slate-800/30 to-slate-900/80 shadow-[inset_0_0_0_2px_rgba(125,211,252,0.08)]" />

          <div className="pointer-events-none absolute inset-x-[18%] top-[8%] h-[16%] rounded-[999px] border border-cyan-100/20 bg-cyan-300/8" />
          <div className="pointer-events-none absolute inset-x-[18%] bottom-[8%] h-[16%] rounded-[999px] border border-cyan-100/20 bg-cyan-300/8" />
          <div className="pointer-events-none absolute inset-y-[25%] left-[6.5%] w-[13%] rounded-[999px] border border-indigo-100/20 bg-indigo-300/10" />
          <div className="pointer-events-none absolute inset-y-[25%] right-[6.5%] w-[13%] rounded-[999px] border border-indigo-100/20 bg-indigo-300/10" />

          <div className="pointer-events-none absolute inset-x-[29%] inset-y-[24%] rounded-3xl border border-emerald-100/30 bg-linear-to-b from-emerald-400/40 via-emerald-500/35 to-emerald-700/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            <div className="absolute inset-3 rounded-2xl border border-white/20" />
            <div className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-white/25" />
            <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
            <div className="absolute left-6 top-1/2 h-[40%] w-[12%] -translate-y-1/2 rounded-xl border border-white/20" />
            <div className="absolute right-6 top-1/2 h-[40%] w-[12%] -translate-y-1/2 rounded-xl border border-white/20" />
          </div>

          {projectedPois.map((poi) => {
            const isSelected = poi._id === selectedPoiId;

            return (
              <button
                key={poi._id}
                type="button"
                onClick={() => dispatch(setSelectedPoiId(poi._id))}
                style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                className={cn(
                  "group absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold tracking-wide transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  markerStatusClass(poi.status),
                  sectionTintClass(poi.section),
                  isSelected
                    ? "scale-110 ring-2 shadow-[0_0_0_5px_rgba(255,255,255,0.2)]"
                    : "ring-1 shadow-[0_6px_16px_rgba(15,23,42,0.4)]",
                )}
                aria-label={`${poi.name} in ${SECTION_LABELS[poi.section]}`}
              >
                {markerTypeLabel(poi.type)}

                <span className="pointer-events-none absolute left-1/2 top-[115%] z-10 hidden min-w-max -translate-x-1/2 rounded-md border border-white/20 bg-slate-900/95 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg group-hover:block">
                  {poi.name}
                </span>
              </button>
            );
          })}

          {projectedPois.length === 0 && !isLoading && !isError && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6">
              <div className="max-w-sm rounded-xl border border-white/20 bg-black/60 px-5 py-4 text-center text-sm text-slate-200">
                No stadium points match the current filters.
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-slate-100 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300/90">
                Live Stadium Layout
              </p>
              <p className="mt-1 text-sm font-semibold">
                {projectedPois.length} visible points of interest
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(SECTION_LABELS).map(([section, label]) => (
                <Badge
                  key={section}
                  variant="outline"
                  className={cn(
                    "h-8 rounded-full border-white/20 bg-slate-950/75 px-3 text-xs font-medium text-slate-100 backdrop-blur",
                    selectedSection === section &&
                      "border-cyan-200/80 bg-cyan-500/20",
                  )}
                >
                  {label}: {sectionCount[section as StadiumSection]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/35">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm text-white">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading venue points...
          </div>
        </div>
      )}

      {isError && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-6">
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-950/50 px-5 py-4 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Failed to load POIs from /api/pois.
          </div>
        </div>
      )}
    </div>
  );
}
