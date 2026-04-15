"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { AlertTriangle, LoaderCircle, MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type POIResponseItem = {
  _id: string;
  name: string;
  type: "RESTROOM" | "CONCESSION" | "MERCH" | "EXIT" | "FIRST_AID";
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  currentWaitTime: number;
  status: "OPEN" | "CLOSED" | "AT_CAPACITY";
};

const STADIUM_CENTER: [number, number] = [-73.981, 40.765];

async function fetchPOIs() {
  const response = await fetch("/api/pois", { method: "GET" });

  if (!response.ok) {
    throw new Error("Failed to fetch POIs");
  }

  return (await response.json()) as POIResponseItem[];
}

function buildPopupContent(poi: POIResponseItem) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-1";

  const title = document.createElement("p");
  title.className = "text-sm font-semibold text-zinc-900";
  title.textContent = poi.name;

  const waitTime = document.createElement("p");
  waitTime.className = "text-xs text-zinc-600";
  waitTime.textContent = `Wait time: ${poi.currentWaitTime} min`;

  wrapper.append(title, waitTime);

  return wrapper;
}

export function VenueMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker[]>([]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasMapboxToken = Boolean(
    mapboxToken &&
    !mapboxToken.includes("your_mapbox_public_token_here") &&
    mapboxToken.startsWith("pk."),
  );

  const {
    data: pois = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["pois"],
    queryFn: fetchPOIs,
  });

  useEffect(() => {
    if (
      !hasMapboxToken ||
      !mapboxToken ||
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: STADIUM_CENTER,
      zoom: 16,
      pitch: 45,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, [hasMapboxToken, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markerRef.current.forEach((marker) => marker.remove());
    markerRef.current = [];

    if (pois.length === 0) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    for (const poi of pois) {
      const [lng, lat] = poi.location.coordinates;

      if (typeof lng !== "number" || typeof lat !== "number") {
        continue;
      }

      const markerElement = document.createElement("div");
      markerElement.className =
        "h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-lg shadow-cyan-500/40";

      const popup = new mapboxgl.Popup({ offset: 16 }).setDOMContent(
        buildPopupContent(poi),
      );

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markerRef.current.push(marker);
      bounds.extend([lng, lat]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 17,
        duration: 900,
      });
    }
  }, [pois]);

  return (
    <div className="relative h-full min-h-dvh w-full overflow-hidden bg-zinc-950">
      <div ref={mapContainerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-white backdrop-blur-sm">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-300">
          <MapPin className="h-3.5 w-3.5" />
          Stadium Sync
        </p>
        <p className="text-sm font-medium">Live venue map</p>
      </div>

      {!hasMapboxToken && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6">
          <div className="rounded-xl border border-red-300/40 bg-red-950/50 px-5 py-4 text-center text-red-100">
            <p className="font-semibold">Mapbox token is missing or invalid.</p>
            <p className="mt-1 text-sm text-red-100/90">
              Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.local and restart the dev
              server.
            </p>
          </div>
        </div>
      )}

      {hasMapboxToken && isLoading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm text-white">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading venue points...
          </div>
        </div>
      )}

      {hasMapboxToken && isError && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/50 px-6">
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-950/50 px-5 py-4 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Failed to load POIs from /api/pois.
          </div>
        </div>
      )}
    </div>
  );
}
