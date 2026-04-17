export type TestPOI = {
  _id: string;
  name: string;
  type: "RESTROOM" | "CONCESSION" | "MERCH" | "EXIT" | "FIRST_AID";
  sectionId?: string;
  blockId?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  currentWaitTime: number;
  status: "OPEN" | "CLOSED" | "AT_CAPACITY";
};

export type TestAlert = {
  _id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  audience: "ALL" | "ATTENDEE" | "STAFF";
  active: boolean;
  createdAt: string;
};

export const TEST_POIS: TestPOI[] = [
  {
    _id: "poi-concession-1",
    name: "North Food Plaza",
    type: "CONCESSION",
    sectionId: "NORTH",
    blockId: "N1",
    location: {
      type: "Point",
      coordinates: [72.5979, 23.0912],
    },
    currentWaitTime: 30,
    status: "AT_CAPACITY",
  },
  {
    _id: "poi-restroom-1",
    name: "East Restroom Cluster",
    type: "RESTROOM",
    sectionId: "EAST",
    blockId: "E2",
    location: {
      type: "Point",
      coordinates: [72.5982, 23.0918],
    },
    currentWaitTime: 10,
    status: "OPEN",
  },
  {
    _id: "poi-exit-1",
    name: "South Exit Gate",
    type: "EXIT",
    sectionId: "SOUTH",
    blockId: "S1",
    location: {
      type: "Point",
      coordinates: [72.5974, 23.0907],
    },
    currentWaitTime: 0,
    status: "OPEN",
  },
];

export const TEST_ALERTS: TestAlert[] = [
  {
    _id: "alert-critical-active",
    title: "Severe Weather Advisory",
    message: "Please move to nearest covered concourse area.",
    severity: "CRITICAL",
    audience: "ALL",
    active: true,
    createdAt: "2026-04-17T10:00:00.000Z",
  },
  {
    _id: "alert-info-archived",
    title: "Gate Opening Update",
    message: "Gate 5 now open for attendees.",
    severity: "INFO",
    audience: "ATTENDEE",
    active: false,
    createdAt: "2026-04-17T09:00:00.000Z",
  },
];

export const TEST_VERTEX_RESPONSE = {
  generatedAt: "2026-04-17T12:00:00.000Z",
  provider: "local-fallback" as const,
  warning: "Playwright synthetic response",
  insights: {
    summary: "Concession queues are concentrated in the north-west corridor.",
    hotspots: ["North Food Plaza", "West Restroom Bank"],
    recommendations: [
      "Dispatch staff toward north concessions.",
      "Update signage to redirect fans to east amenities.",
    ],
    confidence: 0.78,
  },
};
