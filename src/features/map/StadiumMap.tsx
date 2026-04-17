"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  LoaderCircle,
  MapPinned,
  Route,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchPOIs,
  POIS_QUERY_KEY,
  type POIResponseItem,
} from "@/features/map/poi-data";
import {
  distanceMeters,
  findBlockById,
  findNearestGate,
  fromGeoJSONPoint,
  isStadiumSectionId,
  NARENDRA_MODI_STADIUM_BLOCKS,
  NARENDRA_MODI_STADIUM_BOUNDARY,
  NARENDRA_MODI_STADIUM_CENTER,
  NARENDRA_MODI_STADIUM_GATES,
  NARENDRA_MODI_STADIUM_NAME,
  NARENDRA_MODI_STADIUM_SECTIONS,
  resolveSeatQuery,
  type StadiumCoordinate,
  type StadiumSectionId,
} from "@/features/map/narendraModiStadiumData";
import { cn } from "@/lib/utils";
import { setSelectedPoiId } from "@/store/slices/uiSlice";
import type { AppDispatch, RootState } from "@/store/store";

type CrowdLevel = "LOW" | "MEDIUM" | "HIGH";

type SectionCrowdStats = {
  sectionId: StadiumSectionId;
  score: number;
  poiCount: number;
  avgWaitTime: number;
  level: CrowdLevel;
};

type RouteSnapshot = {
  summary: string;
  distanceText: string;
};

const STADIUM_OPERATIONAL_RADIUS_METERS = 2_000;

function poiTypeLabel(type: POIResponseItem["type"]) {
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

function poiMarkerFillColor(status: POIResponseItem["status"]) {
  if (status === "OPEN") {
    return "#10b981";
  }

  if (status === "AT_CAPACITY") {
    return "#f59e0b";
  }

  return "#f43f5e";
}

function crowdLevelFromScore(score: number): CrowdLevel {
  if (score >= 28) {
    return "HIGH";
  }

  if (score >= 16) {
    return "MEDIUM";
  }

  return "LOW";
}

function crowdStyles(level: CrowdLevel) {
  if (level === "HIGH") {
    return {
      fillColor: "#ef4444",
      fillOpacity: 0.44,
      badgeClass: "border-rose-500/40 bg-rose-500/12 text-rose-200",
    };
  }

  if (level === "MEDIUM") {
    return {
      fillColor: "#f59e0b",
      fillOpacity: 0.34,
      badgeClass: "border-amber-500/40 bg-amber-500/12 text-amber-200",
    };
  }

  return {
    fillColor: "#22c55e",
    fillOpacity: 0.24,
    badgeClass: "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
  };
}

function toLatLngLiteral(point: StadiumCoordinate): google.maps.LatLngLiteral {
  return { lat: point.lat, lng: point.lng };
}

function poiCoordinate(poi: POIResponseItem) {
  return fromGeoJSONPoint(poi.location.coordinates);
}

function isWithinOperationalArea(coordinate: StadiumCoordinate) {
  return (
    distanceMeters(coordinate, NARENDRA_MODI_STADIUM_CENTER) <=
    STADIUM_OPERATIONAL_RADIUS_METERS
  );
}

function isStadiumPOI(poi: POIResponseItem) {
  const coordinate = poiCoordinate(poi);
  return isWithinOperationalArea(coordinate);
}

function inferSectionFromPOI(poi: POIResponseItem): StadiumSectionId {
  if (poi.sectionId && isStadiumSectionId(poi.sectionId)) {
    return poi.sectionId;
  }

  if (poi.blockId) {
    const block = findBlockById(poi.blockId);

    if (block) {
      return block.sectionId;
    }
  }

  const coordinate = poiCoordinate(poi);
  let nearest = NARENDRA_MODI_STADIUM_SECTIONS[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const section of NARENDRA_MODI_STADIUM_SECTIONS) {
    if (section.id === "INNER_CONCOURSE") {
      continue;
    }

    const currentDistance = distanceMeters(coordinate, section.center);

    if (currentDistance < nearestDistance) {
      nearestDistance = currentDistance;
      nearest = section;
    }
  }

  return nearest.id;
}

function clearMarkers(markers: google.maps.Marker[]) {
  for (const marker of markers) {
    marker.setMap(null);
  }

  markers.length = 0;
}

function routePath(
  start: StadiumCoordinate,
  end: StadiumCoordinate,
): google.maps.LatLngLiteral[] {
  const midpoint = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };

  const bendPoint = {
    lat:
      midpoint.lat + (NARENDRA_MODI_STADIUM_CENTER.lat - midpoint.lat) * 0.18,
    lng:
      midpoint.lng + (NARENDRA_MODI_STADIUM_CENTER.lng - midpoint.lng) * 0.18,
  };

  return [toLatLngLiteral(start), bendPoint, toLatLngLiteral(end)];
}

export function StadiumMap() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeFilter, selectedPoiId, searchTerm } = useSelector(
    (state: RootState) => state.ui,
  );

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundaryRef = useRef<google.maps.Polygon | null>(null);
  const sectionPolygonRefs = useRef<Map<StadiumSectionId, google.maps.Polygon>>(
    new Map(),
  );
  const blockMarkersRef = useRef<google.maps.Marker[]>([]);
  const gateMarkersRef = useRef<google.maps.Marker[]>([]);
  const poiMarkersRef = useRef<google.maps.Marker[]>([]);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
  const [staffMode, setStaffMode] = useState(false);
  const [seatQuery, setSeatQuery] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    NARENDRA_MODI_STADIUM_BLOCKS[0]?.id ?? "",
  );
  const [routeSnapshot, setRouteSnapshot] = useState<RouteSnapshot | null>(
    null,
  );

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const hasGoogleMapsApiKey = Boolean(
    googleMapsApiKey &&
    googleMapsApiKey.length > 10 &&
    !googleMapsApiKey.includes("your_google_maps_api_key_here"),
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
      if (!isStadiumPOI(poi)) {
        return false;
      }

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

  const selectedPoi = useMemo(() => {
    if (!selectedPoiId) {
      return null;
    }

    return pois.find((poi) => poi._id === selectedPoiId) ?? null;
  }, [pois, selectedPoiId]);

  const crowdBySection = useMemo(() => {
    const base = new Map<StadiumSectionId, SectionCrowdStats>(
      NARENDRA_MODI_STADIUM_SECTIONS.map((section) => [
        section.id,
        {
          sectionId: section.id,
          score: 0,
          poiCount: 0,
          avgWaitTime: 0,
          level: "LOW",
        },
      ]),
    );

    for (const poi of pois) {
      const sectionId = inferSectionFromPOI(poi);
      const entry = base.get(sectionId);

      if (!entry) {
        continue;
      }

      const statusWeight =
        poi.status === "AT_CAPACITY" ? 16 : poi.status === "CLOSED" ? 8 : 0;

      if (!isStadiumPOI(poi)) {
        continue;
      }

      entry.poiCount += 1;
      entry.avgWaitTime += poi.currentWaitTime;
      entry.score += poi.currentWaitTime + statusWeight;
    }

    for (const entry of base.values()) {
      if (entry.poiCount === 0) {
        entry.level = "LOW";
        entry.avgWaitTime = 0;
        entry.score = 0;
        continue;
      }

      entry.avgWaitTime = Math.round(entry.avgWaitTime / entry.poiCount);
      entry.score = Number((entry.score / entry.poiCount).toFixed(1));
      entry.level = crowdLevelFromScore(entry.score);
    }

    return base;
  }, [pois]);

  const sortedSectionCrowd = useMemo(() => {
    return Array.from(crowdBySection.values()).sort((left, right) => {
      return right.score - left.score;
    });
  }, [crowdBySection]);

  const clearRouteGraphics = () => {
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    clearMarkers(routeMarkersRef.current);
  };

  const drawRoute = (
    start: StadiumCoordinate,
    end: StadiumCoordinate,
    summary: string,
  ) => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    clearRouteGraphics();

    routePolylineRef.current = new google.maps.Polyline({
      map,
      path: routePath(start, end),
      strokeColor: "#22d3ee",
      strokeOpacity: 0.95,
      strokeWeight: 4,
    });

    const startMarker = new google.maps.Marker({
      map,
      position: toLatLngLiteral(start),
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#38bdf8",
        fillOpacity: 1,
        strokeColor: "#e2e8f0",
        strokeWeight: 2,
        scale: 6,
      },
      title: "Route start",
    });

    const endMarker = new google.maps.Marker({
      map,
      position: toLatLngLiteral(end),
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#22c55e",
        fillOpacity: 1,
        strokeColor: "#e2e8f0",
        strokeWeight: 2,
        scale: 6,
      },
      title: "Route destination",
    });

    routeMarkersRef.current.push(startMarker, endMarker);

    const routeDistance = Math.round(distanceMeters(start, end));
    const routeMinutes = Math.max(1, Math.round(routeDistance / 72));

    setRouteSnapshot({
      summary,
      distanceText: `${routeDistance} m, approx ${routeMinutes} min walk`,
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(toLatLngLiteral(start));
    bounds.extend(toLatLngLiteral(end));
    map.fitBounds(bounds, 120);
  };

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !googleMapsApiKey || !mapContainerRef.current) {
      return;
    }

    let isDisposed = false;

    const initializeMap = async () => {
      try {
        setOptions({
          key: googleMapsApiKey,
          v: "weekly",
          language: "en",
          region: "IN",
        });

        await importLibrary("maps");

        if (isDisposed || !mapContainerRef.current) {
          return;
        }

        const map = new google.maps.Map(mapContainerRef.current, {
          center: toLatLngLiteral(NARENDRA_MODI_STADIUM_CENTER),
          zoom: 17.2,
          mapTypeId: "hybrid",
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: true,
          gestureHandling: "greedy",
        });

        mapRef.current = map;

        boundaryRef.current = new google.maps.Polygon({
          map,
          paths: NARENDRA_MODI_STADIUM_BOUNDARY.map(toLatLngLiteral),
          strokeColor: "#0ea5e9",
          strokeWeight: 2,
          strokeOpacity: 0.9,
          fillColor: "#0f172a",
          fillOpacity: 0.12,
        });

        for (const section of NARENDRA_MODI_STADIUM_SECTIONS) {
          const polygon = new google.maps.Polygon({
            map,
            paths: section.polygon.map(toLatLngLiteral),
            strokeColor: "#38bdf8",
            strokeOpacity: 0.75,
            strokeWeight: 1.5,
            fillColor: "#22c55e",
            fillOpacity: 0.2,
          });

          polygon.addListener("click", () => {
            map.panTo(toLatLngLiteral(section.center));
            map.setZoom(18);
          });

          sectionPolygonRefs.current.set(section.id, polygon);
        }

        for (const gate of NARENDRA_MODI_STADIUM_GATES) {
          gateMarkersRef.current.push(
            new google.maps.Marker({
              map,
              position: toLatLngLiteral(gate.coordinate),
              title: gate.name,
              icon: {
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                fillColor: "#f8fafc",
                fillOpacity: 0.95,
                strokeColor: "#0f172a",
                strokeWeight: 1.6,
                scale: 4,
                rotation: 0,
              },
              label: {
                text: gate.name.replace("Gate ", ""),
                color: "#e2e8f0",
                fontSize: "10px",
                fontWeight: "700",
              },
              zIndex: 4,
            }),
          );
        }

        for (const block of NARENDRA_MODI_STADIUM_BLOCKS) {
          const marker = new google.maps.Marker({
            map,
            position: toLatLngLiteral(block.coordinate),
            title: `${block.label} (${block.sectionId.replaceAll("_", " ")})`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#1d4ed8",
              fillOpacity: 0.82,
              strokeColor: "#dbeafe",
              strokeWeight: 1.5,
              scale: 7.5,
            },
            label: {
              text: block.id,
              color: "#f8fafc",
              fontSize: "9px",
              fontWeight: "700",
            },
            zIndex: 5,
          });

          marker.addListener("click", () => {
            setSelectedBlockId(block.id);
            setSeatQuery(block.id);
            setRouteSnapshot({
              summary: `${block.label} selected`,
              distanceText: "Tap Find Seat Route to generate a walking path.",
            });
            map.panTo(toLatLngLiteral(block.coordinate));
            map.setZoom(18.4);
          });

          blockMarkersRef.current.push(marker);
        }

        setMapErrorMessage(null);
        setIsMapReady(true);
      } catch (error) {
        setMapErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to initialize Google Maps.",
        );
      }
    };

    void initializeMap();

    const blockMarkers = blockMarkersRef.current;
    const gateMarkers = gateMarkersRef.current;
    const poiMarkers = poiMarkersRef.current;
    const routeMarkers = routeMarkersRef.current;
    const sectionPolygons = sectionPolygonRefs.current;

    return () => {
      isDisposed = true;
      clearMarkers(blockMarkers);
      clearMarkers(gateMarkers);
      clearMarkers(poiMarkers);
      clearMarkers(routeMarkers);
      clearRouteGraphics();

      boundaryRef.current?.setMap(null);
      boundaryRef.current = null;

      for (const polygon of sectionPolygons.values()) {
        polygon.setMap(null);
      }

      sectionPolygons.clear();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [googleMapsApiKey, hasGoogleMapsApiKey]);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    for (const section of NARENDRA_MODI_STADIUM_SECTIONS) {
      const polygon = sectionPolygonRefs.current.get(section.id);

      if (!polygon) {
        continue;
      }

      const stats = crowdBySection.get(section.id);
      const style = stats ? crowdStyles(stats.level) : crowdStyles("LOW");
      const selectedBlock = selectedBlockId
        ? findBlockById(selectedBlockId)
        : null;
      const isSelectedSection = selectedBlock?.sectionId === section.id;

      polygon.setOptions({
        fillColor: style.fillColor,
        fillOpacity:
          section.id === "INNER_CONCOURSE" ? 0.12 : style.fillOpacity,
        strokeColor: isSelectedSection ? "#f8fafc" : "#22d3ee",
        strokeWeight: isSelectedSection ? 2.6 : 1.5,
      });
    }
  }, [crowdBySection, isMapReady, selectedBlockId]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    clearMarkers(poiMarkersRef.current);

    for (const poi of filteredPois) {
      const marker = new google.maps.Marker({
        map,
        position: toLatLngLiteral(poiCoordinate(poi)),
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: poiMarkerFillColor(poi.status),
          fillOpacity: 0.95,
          strokeColor: "#f8fafc",
          strokeWeight: 2,
          scale: poi._id === selectedPoiId ? 10 : 8,
        },
        label: {
          text: poiTypeLabel(poi.type),
          color: "#0f172a",
          fontSize: "10px",
          fontWeight: "700",
        },
        title: `${poi.name}${poi.blockId ? ` (${poi.blockId})` : ""}`,
        zIndex: poi._id === selectedPoiId ? 12 : 9,
      });

      marker.addListener("click", () => {
        dispatch(setSelectedPoiId(poi._id));
      });

      poiMarkersRef.current.push(marker);
    }
  }, [dispatch, filteredPois, isMapReady, selectedPoiId]);

  const handleFindSeatRoute = () => {
    const resolvedSeat = resolveSeatQuery(seatQuery || selectedBlockId);

    if (!resolvedSeat) {
      setRouteSnapshot({
        summary: "Seat not found",
        distanceText: "Use formats like J3, A4-R12, or E2-R8-S14.",
      });
      return;
    }

    const nearestGate = findNearestGate(
      resolvedSeat.coordinate,
      resolvedSeat.block.preferredGateIds,
    );

    if (!nearestGate) {
      setRouteSnapshot({
        summary: "No gate available",
        distanceText: "Please try selecting another block.",
      });
      return;
    }

    setSelectedBlockId(resolvedSeat.block.id);
    dispatch(setSelectedPoiId(null));

    drawRoute(
      nearestGate.coordinate,
      resolvedSeat.coordinate,
      `Navigate to ${resolvedSeat.displayLabel} via ${nearestGate.name}`,
    );
  };

  const handleNearestExit = () => {
    const selectedSeat = resolveSeatQuery(seatQuery || selectedBlockId);
    const selectedPoiCoordinate =
      selectedPoi && isStadiumPOI(selectedPoi)
        ? poiCoordinate(selectedPoi)
        : null;

    const start = selectedPoiCoordinate
      ? selectedPoiCoordinate
      : selectedSeat
        ? selectedSeat.coordinate
        : selectedBlockId
          ? findBlockById(selectedBlockId)?.coordinate
          : NARENDRA_MODI_STADIUM_CENTER;

    if (!start) {
      setRouteSnapshot({
        summary: "Select a seat or POI first",
        distanceText: "Pick a block, enter a seat, or tap a marker.",
      });
      return;
    }

    const exits = pois.filter(
      (poi) =>
        poi.type === "EXIT" && poi.status !== "CLOSED" && isStadiumPOI(poi),
    );

    if (exits.length === 0) {
      const nearestGate = findNearestGate(start);

      if (!nearestGate) {
        setRouteSnapshot({
          summary: "Exit unavailable",
          distanceText: "No open exits or gates were found.",
        });
        return;
      }

      drawRoute(
        start,
        nearestGate.coordinate,
        `Proceed to ${nearestGate.name} (gate fallback)`,
      );
      return;
    }

    const closestExit = exits.reduce(
      (closest, candidate) => {
        const candidateDistance = distanceMeters(
          start,
          poiCoordinate(candidate),
        );

        if (!closest) {
          return { poi: candidate, distance: candidateDistance };
        }

        return candidateDistance < closest.distance
          ? { poi: candidate, distance: candidateDistance }
          : closest;
      },
      null as { poi: POIResponseItem; distance: number } | null,
    );

    if (!closestExit) {
      return;
    }

    drawRoute(
      start,
      poiCoordinate(closestExit.poi),
      `Nearest exit: ${closestExit.poi.name}`,
    );
    dispatch(setSelectedPoiId(closestExit.poi._id));
  };

  return (
    <div className="relative h-full min-h-dvh w-full overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-24 z-20 px-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-xl border border-white/20 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 backdrop-blur-sm sm:text-sm">
          <MapPinned className="h-4 w-4 text-cyan-300" />
          <span className="font-semibold">{NARENDRA_MODI_STADIUM_NAME}</span>
          <span className="text-slate-300">Motera, Ahmedabad</span>
          <span className="ml-auto text-slate-300">
            {filteredPois.length} live POIs
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 top-26 z-30 flex w-full max-w-md items-start justify-end p-3 sm:p-4">
        <Card className="pointer-events-auto w-full border-white/15 bg-slate-950/85 text-slate-100 ring-white/10 backdrop-blur-sm">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <UsersRound className="h-4 w-4 text-cyan-300" />
              Stadium Navigation Console
            </CardTitle>
            <CardDescription className="text-slate-300">
              Find seats, locate exits, and monitor section crowd pressure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={staffMode ? "secondary" : "default"}
                onClick={() => setStaffMode(false)}
              >
                Fan View
              </Button>
              <Button
                type="button"
                size="sm"
                variant={staffMode ? "default" : "secondary"}
                onClick={() => setStaffMode(true)}
              >
                Staff View
              </Button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="seat-query"
                className="text-xs font-semibold uppercase tracking-wide text-slate-300"
              >
                Seat / Block
              </label>
              <Input
                id="seat-query"
                value={seatQuery}
                onChange={(event) => setSeatQuery(event.target.value)}
                placeholder="Example: J3-R12-S18"
                className="h-9 border-white/20 bg-slate-900/70 text-slate-100 placeholder:text-slate-400"
              />

              <select
                id="block-select"
                aria-label="Select Block"
                value={selectedBlockId}
                onChange={(event) => {
                  setSelectedBlockId(event.target.value);
                  if (event.target.value.length > 0) {
                    setSeatQuery(event.target.value);
                  }
                }}
                className="h-9 w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 text-sm text-slate-100"
              >
                {NARENDRA_MODI_STADIUM_BLOCKS.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.id} - {block.sectionId.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleFindSeatRoute}
                className="gap-1.5"
              >
                <Route className="h-3.5 w-3.5" />
                Find Seat Route
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleNearestExit}
                className="gap-1.5 border-white/30 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                Nearest Exit
              </Button>
            </div>

            {routeSnapshot && (
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-50">
                <p className="font-semibold">{routeSnapshot.summary}</p>
                <p className="mt-1 text-cyan-100/90">
                  {routeSnapshot.distanceText}
                </p>
              </div>
            )}

            {staffMode && (
              <div className="space-y-2 rounded-lg border border-white/15 bg-slate-900/60 p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                  Crowd Detection
                </p>

                {sortedSectionCrowd.map((sectionStats) => {
                  const section = NARENDRA_MODI_STADIUM_SECTIONS.find(
                    (candidate) => candidate.id === sectionStats.sectionId,
                  );
                  const style = crowdStyles(sectionStats.level);

                  return (
                    <div
                      key={sectionStats.sectionId}
                      className="flex items-center justify-between rounded-md border border-white/10 px-2 py-1.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {section?.name ?? sectionStats.sectionId}
                        </p>
                        <p className="text-xs text-slate-400">
                          Avg wait {sectionStats.avgWaitTime} min • Score{" "}
                          {sectionStats.score}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("h-7", style.badgeClass)}
                      >
                        {sectionStats.level}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm text-white">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading Narendra Modi Stadium POIs...
          </div>
        </div>
      )}

      {!hasGoogleMapsApiKey && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
          <div className="max-w-lg rounded-xl border border-red-300/40 bg-red-950/55 px-5 py-4 text-red-100">
            <p className="font-semibold">Google Maps API key is missing.</p>
            <p className="mt-1 text-sm text-red-100/90">
              Add GOOGLE_MAPS_API_KEY in .env.local and restart the dev server.
            </p>
          </div>
        </div>
      )}

      {hasGoogleMapsApiKey && mapErrorMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-6">
          <div className="flex max-w-lg items-start gap-2 rounded-xl border border-red-300/40 bg-red-950/60 px-5 py-4 text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-semibold">Google Map failed to render.</p>
              <p className="text-sm text-red-100/90">{mapErrorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {hasGoogleMapsApiKey && isError && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-6">
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-950/50 px-5 py-4 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Failed to load POIs from /api/pois.
          </div>
        </div>
      )}
    </div>
  );
}
