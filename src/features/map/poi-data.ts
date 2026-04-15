export type POIResponseItem = {
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

export type POIRealtimePatchEvent = {
  type: "poi.wait-time.patch";
  poiId: string;
  currentWaitTime?: number;
  status?: POIResponseItem["status"];
  timestamp: string;
};

export const POIS_QUERY_KEY = ["pois"] as const;

export async function fetchPOIs() {
  const response = await fetch("/api/pois", { method: "GET" });

  if (!response.ok) {
    throw new Error("Failed to fetch POIs");
  }

  return (await response.json()) as POIResponseItem[];
}
