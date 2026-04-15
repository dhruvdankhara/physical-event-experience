import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import POI from "@/models/POI";

type SeedPOI = {
  name: string;
  type: "RESTROOM" | "CONCESSION" | "MERCH" | "EXIT" | "FIRST_AID";
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  currentWaitTime: number;
  status: "OPEN" | "CLOSED" | "AT_CAPACITY";
};

// Mock data using generic stadium coordinates
// Note: coordinates are [longitude, latitude]
const mockPOIs: SeedPOI[] = [
  {
    name: "Main Concourse Restroom (North)",
    type: "RESTROOM",
    location: { type: "Point", coordinates: [-73.9808, 40.7648] },
    currentWaitTime: 12,
    status: "OPEN",
  },
  {
    name: "Burger & Brews Stand",
    type: "CONCESSION",
    location: { type: "Point", coordinates: [-73.981, 40.765] },
    currentWaitTime: 25,
    status: "OPEN",
  },
  {
    name: "Gate A Exit",
    type: "EXIT",
    location: { type: "Point", coordinates: [-73.9815, 40.7645] },
    currentWaitTime: 0,
    status: "OPEN",
  },
  {
    name: "Level 2 VIP Restroom",
    type: "RESTROOM",
    location: { type: "Point", coordinates: [-73.9805, 40.7652] },
    currentWaitTime: 2,
    status: "OPEN",
  },
];

export async function GET() {
  try {
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
