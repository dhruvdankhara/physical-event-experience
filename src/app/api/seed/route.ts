import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  findBlockById,
  findNearestGate,
  offsetCoordinateByMeters,
  toGeoJSONPoint,
} from "@/features/map/narendraModiStadiumData";
import POI from "@/models/POI";

export const runtime = "nodejs";

type SeedPOI = {
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

function locationForBlock(blockId: string, northMeters = 0, eastMeters = 0) {
  const block = findBlockById(blockId);

  if (!block) {
    throw new Error(`Unknown stadium block: ${blockId}`);
  }

  const coordinate = offsetCoordinateByMeters(
    block.coordinate,
    northMeters,
    eastMeters,
  );

  return {
    sectionId: block.sectionId,
    blockId: block.id,
    location: toGeoJSONPoint(coordinate),
  };
}

function locationForNearestGate(
  blockId: string,
  northMeters = 0,
  eastMeters = 0,
) {
  const block = findBlockById(blockId);

  if (!block) {
    throw new Error(`Unknown stadium block: ${blockId}`);
  }

  const nearestGate = findNearestGate(block.coordinate, block.preferredGateIds);

  if (!nearestGate) {
    throw new Error(`Unable to find gate for block ${blockId}`);
  }

  const coordinate = offsetCoordinateByMeters(
    nearestGate.coordinate,
    northMeters,
    eastMeters,
  );

  return {
    sectionId: block.sectionId,
    blockId: block.id,
    location: toGeoJSONPoint(coordinate),
  };
}

// Narendra Modi Stadium operational POIs keyed to section/block coordinates.
const mockPOIs: SeedPOI[] = [
  {
    name: "Jio End Restroom Cluster",
    type: "RESTROOM",
    ...locationForBlock("J2", -8, -6),
    currentWaitTime: 9,
    status: "OPEN",
  },
  {
    name: "Jio End Street Food Court",
    type: "CONCESSION",
    ...locationForBlock("J4", -10, 8),
    currentWaitTime: 24,
    status: "AT_CAPACITY",
  },
  {
    name: "Jio End First Aid Hub",
    type: "FIRST_AID",
    ...locationForBlock("J5", -6, 4),
    currentWaitTime: 4,
    status: "OPEN",
  },
  {
    name: "West Stand Titans Merch Kiosk",
    type: "MERCH",
    ...locationForBlock("W2", 6, 8),
    currentWaitTime: 13,
    status: "OPEN",
  },
  {
    name: "West Stand Restroom W7",
    type: "RESTROOM",
    ...locationForBlock("W7", -5, 5),
    currentWaitTime: 18,
    status: "AT_CAPACITY",
  },
  {
    name: "West Stand Emergency Exit",
    type: "EXIT",
    ...locationForNearestGate("W4", 0, -3),
    currentWaitTime: 0,
    status: "OPEN",
  },
  {
    name: "Adani Pavilion Family Restroom",
    type: "RESTROOM",
    ...locationForBlock("A2", 6, -4),
    currentWaitTime: 15,
    status: "OPEN",
  },
  {
    name: "Adani Pavilion Grill Counter",
    type: "CONCESSION",
    ...locationForBlock("A4", 9, 5),
    currentWaitTime: 26,
    status: "AT_CAPACITY",
  },
  {
    name: "Adani Pavilion Medical Desk",
    type: "FIRST_AID",
    ...locationForBlock("A5", 3, 2),
    currentWaitTime: 3,
    status: "OPEN",
  },
  {
    name: "South Concourse Exit Lane",
    type: "EXIT",
    ...locationForNearestGate("A3", -1, 1),
    currentWaitTime: 0,
    status: "OPEN",
  },
  {
    name: "East Stand Restroom E3",
    type: "RESTROOM",
    ...locationForBlock("E3", -3, -4),
    currentWaitTime: 11,
    status: "OPEN",
  },
  {
    name: "East Stand Quick Bites",
    type: "CONCESSION",
    ...locationForBlock("E5", 4, -8),
    currentWaitTime: 28,
    status: "AT_CAPACITY",
  },
  {
    name: "East Stand Fan Shop",
    type: "MERCH",
    ...locationForBlock("E7", -2, -2),
    currentWaitTime: 8,
    status: "OPEN",
  },
  {
    name: "East Stand Exit E",
    type: "EXIT",
    ...locationForNearestGate("E4", 0, 2),
    currentWaitTime: 0,
    status: "OPEN",
  },
  {
    name: "Inner Concourse Visitor Help",
    type: "FIRST_AID",
    ...locationForBlock("J3", -120, 60),
    currentWaitTime: 5,
    status: "OPEN",
  },
  {
    name: "Upper Bowl Water Station",
    type: "CONCESSION",
    ...locationForBlock("W1", -38, 55),
    currentWaitTime: 14,
    status: "OPEN",
  },
  {
    name: "North-West Exit Corridor",
    type: "EXIT",
    ...locationForNearestGate("J1", 2, 4),
    currentWaitTime: 0,
    status: "OPEN",
  },
  {
    name: "South-East Exit Corridor",
    type: "EXIT",
    ...locationForNearestGate("A6", -2, 4),
    currentWaitTime: 0,
    status: "OPEN",
  },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request, { roles: ["STAFF", "ADMIN"] });

    if (auth.error) {
      return auth.error;
    }

    await connectDB();

    // 1. Clear existing POIs to prevent duplicates on multiple clicks
    await POI.deleteMany({});

    // 2. Insert the mock data
    await POI.insertMany(mockPOIs);

    return NextResponse.json(
      {
        message: "Database seeded successfully with POIs!",
        count: mockPOIs.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 },
    );
  }
}
