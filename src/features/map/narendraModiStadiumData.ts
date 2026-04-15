export type StadiumCoordinate = {
  lat: number;
  lng: number;
};

export type StadiumSectionId =
  | "JIO_END"
  | "ADANI_PAVILION_END"
  | "EAST_STAND"
  | "WEST_STAND"
  | "INNER_CONCOURSE";

export type StadiumSection = {
  id: StadiumSectionId;
  name: string;
  shortLabel: string;
  center: StadiumCoordinate;
  polygon: StadiumCoordinate[];
};

export type StadiumGate = {
  id: string;
  name: string;
  coordinate: StadiumCoordinate;
  sections: StadiumSectionId[];
};

export type StadiumBlock = {
  id: string;
  label: string;
  sectionId: StadiumSectionId;
  coordinate: StadiumCoordinate;
  seatRows: number;
  seatsPerRow: number;
  preferredGateIds: string[];
  aliases: string[];
};

export type SeatLookupResult = {
  block: StadiumBlock;
  row?: number;
  seat?: number;
  coordinate: StadiumCoordinate;
  displayLabel: string;
};

export const NARENDRA_MODI_STADIUM_NAME = "Narendra Modi Stadium";

// Center derived from OSM way 776718456 boundary envelope.
export const NARENDRA_MODI_STADIUM_CENTER: StadiumCoordinate = {
  lat: 23.09179,
  lng: 72.59733,
};

export const NARENDRA_MODI_STADIUM_BOUNDARY: StadiumCoordinate[] = [
  { lat: 23.0929606, lng: 72.5966023 },
  { lat: 23.0928991, lng: 72.596493 },
  { lat: 23.0927192, lng: 72.5962426 },
  { lat: 23.0925426, lng: 72.5960702 },
  { lat: 23.0923228, lng: 72.5959331 },
  { lat: 23.0920739, lng: 72.5958476 },
  { lat: 23.0917991, lng: 72.5958115 },
  { lat: 23.0915617, lng: 72.5958475 },
  { lat: 23.0913378, lng: 72.5959177 },
  { lat: 23.0910199, lng: 72.5961198 },
  { lat: 23.0908394, lng: 72.5963345 },
  { lat: 23.0906566, lng: 72.5966236 },
  { lat: 23.090511, lng: 72.5970128 },
  { lat: 23.0904963, lng: 72.5972912 },
  { lat: 23.0904964, lng: 72.5976179 },
  { lat: 23.0905798, lng: 72.5979065 },
  { lat: 23.0906988, lng: 72.598165 },
  { lat: 23.090872, lng: 72.5984074 },
  { lat: 23.0911218, lng: 72.598661 },
  { lat: 23.0914136, lng: 72.5988112 },
  { lat: 23.0917443, lng: 72.5988545 },
  { lat: 23.0920527, lng: 72.5988409 },
  { lat: 23.0924044, lng: 72.5987161 },
  { lat: 23.0926516, lng: 72.5985176 },
  { lat: 23.0928693, lng: 72.5982762 },
  { lat: 23.0930226, lng: 72.5979067 },
  { lat: 23.0930908, lng: 72.59748 },
  { lat: 23.0930762, lng: 72.5970763 },
  { lat: 23.093024, lng: 72.5968224 },
];

const METERS_TO_LATITUDE = 1 / 111_320;

function metersToLongitude(metersEast: number, latitude: number) {
  const metersPerDegreeLongitude =
    111_320 * Math.cos((latitude * Math.PI) / 180);

  if (Math.abs(metersPerDegreeLongitude) < 1e-8) {
    return 0;
  }

  return metersEast / metersPerDegreeLongitude;
}

export function offsetCoordinateByMeters(
  origin: StadiumCoordinate,
  northMeters: number,
  eastMeters: number,
): StadiumCoordinate {
  return {
    lat: origin.lat + northMeters * METERS_TO_LATITUDE,
    lng: origin.lng + metersToLongitude(eastMeters, origin.lat),
  };
}

const makeSectionPolygon = (
  points: Array<{ north: number; east: number }>,
): StadiumCoordinate[] =>
  points.map((point) =>
    offsetCoordinateByMeters(
      NARENDRA_MODI_STADIUM_CENTER,
      point.north,
      point.east,
    ),
  );

export const NARENDRA_MODI_STADIUM_SECTIONS: StadiumSection[] = [
  {
    id: "JIO_END",
    name: "Jio End",
    shortLabel: "Jio",
    center: offsetCoordinateByMeters(NARENDRA_MODI_STADIUM_CENTER, 165, 0),
    polygon: makeSectionPolygon([
      { north: 255, east: -185 },
      { north: 265, east: 0 },
      { north: 250, east: 185 },
      { north: 165, east: 150 },
      { north: 155, east: -150 },
    ]),
  },
  {
    id: "ADANI_PAVILION_END",
    name: "Adani Pavilion End",
    shortLabel: "Adani",
    center: offsetCoordinateByMeters(NARENDRA_MODI_STADIUM_CENTER, -165, 0),
    polygon: makeSectionPolygon([
      { north: -255, east: -190 },
      { north: -265, east: 0 },
      { north: -250, east: 190 },
      { north: -160, east: 150 },
      { north: -150, east: -150 },
    ]),
  },
  {
    id: "EAST_STAND",
    name: "East Stand",
    shortLabel: "East",
    center: offsetCoordinateByMeters(NARENDRA_MODI_STADIUM_CENTER, 0, 180),
    polygon: makeSectionPolygon([
      { north: 210, east: 250 },
      { north: 100, east: 320 },
      { north: -110, east: 320 },
      { north: -215, east: 250 },
      { north: -145, east: 145 },
      { north: 145, east: 145 },
    ]),
  },
  {
    id: "WEST_STAND",
    name: "West Stand",
    shortLabel: "West",
    center: offsetCoordinateByMeters(NARENDRA_MODI_STADIUM_CENTER, 0, -180),
    polygon: makeSectionPolygon([
      { north: 210, east: -250 },
      { north: 100, east: -320 },
      { north: -110, east: -320 },
      { north: -215, east: -250 },
      { north: -145, east: -145 },
      { north: 145, east: -145 },
    ]),
  },
  {
    id: "INNER_CONCOURSE",
    name: "Inner Concourse",
    shortLabel: "Inner",
    center: NARENDRA_MODI_STADIUM_CENTER,
    polygon: makeSectionPolygon([
      { north: 120, east: -140 },
      { north: 130, east: 0 },
      { north: 120, east: 140 },
      { north: 0, east: 170 },
      { north: -120, east: 140 },
      { north: -130, east: 0 },
      { north: -120, east: -140 },
      { north: 0, east: -170 },
    ]),
  },
];

export const NARENDRA_MODI_STADIUM_GATES: StadiumGate[] = [
  {
    id: "GATE_NW",
    name: "Gate NW",
    coordinate: { lat: 23.0929606, lng: 72.5966023 },
    sections: ["JIO_END", "WEST_STAND"],
  },
  {
    id: "GATE_N",
    name: "Gate N",
    coordinate: { lat: 23.0930908, lng: 72.59748 },
    sections: ["JIO_END"],
  },
  {
    id: "GATE_NE",
    name: "Gate NE",
    coordinate: { lat: 23.0928693, lng: 72.5982762 },
    sections: ["JIO_END", "EAST_STAND"],
  },
  {
    id: "GATE_E",
    name: "Gate E",
    coordinate: { lat: 23.0917443, lng: 72.5988545 },
    sections: ["EAST_STAND"],
  },
  {
    id: "GATE_SE",
    name: "Gate SE",
    coordinate: { lat: 23.0906988, lng: 72.598165 },
    sections: ["ADANI_PAVILION_END", "EAST_STAND"],
  },
  {
    id: "GATE_S",
    name: "Gate S",
    coordinate: { lat: 23.0904964, lng: 72.5976179 },
    sections: ["ADANI_PAVILION_END"],
  },
  {
    id: "GATE_SW",
    name: "Gate SW",
    coordinate: { lat: 23.0906566, lng: 72.5966236 },
    sections: ["ADANI_PAVILION_END", "WEST_STAND"],
  },
  {
    id: "GATE_W",
    name: "Gate W",
    coordinate: { lat: 23.0913378, lng: 72.5959177 },
    sections: ["WEST_STAND"],
  },
];

const buildBlock = (
  id: string,
  sectionId: StadiumSectionId,
  northMeters: number,
  eastMeters: number,
  preferredGateIds: string[],
): StadiumBlock => ({
  id,
  label: `Block ${id}`,
  sectionId,
  coordinate: offsetCoordinateByMeters(
    NARENDRA_MODI_STADIUM_CENTER,
    northMeters,
    eastMeters,
  ),
  seatRows: 42,
  seatsPerRow: 34,
  preferredGateIds,
  aliases: [id, `BLOCK${id}`, `BLOCK-${id}`, `BLOCK ${id}`],
});

export const NARENDRA_MODI_STADIUM_BLOCKS: StadiumBlock[] = [
  buildBlock("J1", "JIO_END", 175, -200, ["GATE_NW", "GATE_N"]),
  buildBlock("J2", "JIO_END", 185, -130, ["GATE_NW", "GATE_N"]),
  buildBlock("J3", "JIO_END", 195, -60, ["GATE_N", "GATE_NE"]),
  buildBlock("J4", "JIO_END", 195, 20, ["GATE_N", "GATE_NE"]),
  buildBlock("J5", "JIO_END", 185, 95, ["GATE_N", "GATE_NE"]),
  buildBlock("J6", "JIO_END", 172, 165, ["GATE_NE", "GATE_E"]),

  buildBlock("A1", "ADANI_PAVILION_END", -175, -190, ["GATE_SW", "GATE_S"]),
  buildBlock("A2", "ADANI_PAVILION_END", -185, -120, ["GATE_SW", "GATE_S"]),
  buildBlock("A3", "ADANI_PAVILION_END", -195, -45, ["GATE_S", "GATE_SE"]),
  buildBlock("A4", "ADANI_PAVILION_END", -195, 35, ["GATE_S", "GATE_SE"]),
  buildBlock("A5", "ADANI_PAVILION_END", -185, 110, ["GATE_S", "GATE_SE"]),
  buildBlock("A6", "ADANI_PAVILION_END", -172, 180, ["GATE_SE", "GATE_E"]),

  buildBlock("E1", "EAST_STAND", 155, 190, ["GATE_NE", "GATE_E"]),
  buildBlock("E2", "EAST_STAND", 110, 225, ["GATE_NE", "GATE_E"]),
  buildBlock("E3", "EAST_STAND", 65, 250, ["GATE_E"]),
  buildBlock("E4", "EAST_STAND", 15, 270, ["GATE_E"]),
  buildBlock("E5", "EAST_STAND", -40, 272, ["GATE_E", "GATE_SE"]),
  buildBlock("E6", "EAST_STAND", -90, 250, ["GATE_E", "GATE_SE"]),
  buildBlock("E7", "EAST_STAND", -130, 220, ["GATE_E", "GATE_SE"]),
  buildBlock("E8", "EAST_STAND", -165, 185, ["GATE_SE"]),

  buildBlock("W1", "WEST_STAND", 155, -190, ["GATE_NW", "GATE_W"]),
  buildBlock("W2", "WEST_STAND", 110, -225, ["GATE_NW", "GATE_W"]),
  buildBlock("W3", "WEST_STAND", 65, -252, ["GATE_W"]),
  buildBlock("W4", "WEST_STAND", 15, -272, ["GATE_W"]),
  buildBlock("W5", "WEST_STAND", -40, -272, ["GATE_W", "GATE_SW"]),
  buildBlock("W6", "WEST_STAND", -90, -250, ["GATE_W", "GATE_SW"]),
  buildBlock("W7", "WEST_STAND", -130, -220, ["GATE_W", "GATE_SW"]),
  buildBlock("W8", "WEST_STAND", -165, -185, ["GATE_SW"]),
];

const BLOCK_ID_LOOKUP = new Map(
  NARENDRA_MODI_STADIUM_BLOCKS.map((block) => [block.id, block]),
);

const BLOCK_ALIAS_LOOKUP = new Map<string, StadiumBlock>();

for (const block of NARENDRA_MODI_STADIUM_BLOCKS) {
  for (const alias of block.aliases) {
    BLOCK_ALIAS_LOOKUP.set(alias.replace(/\s+/g, ""), block);
  }
}

const SECTION_ID_SET = new Set<StadiumSectionId>(
  NARENDRA_MODI_STADIUM_SECTIONS.map((section) => section.id),
);

export function isStadiumSectionId(value: string): value is StadiumSectionId {
  return SECTION_ID_SET.has(value as StadiumSectionId);
}

export function findBlockById(blockId: string) {
  return BLOCK_ID_LOOKUP.get(blockId.toUpperCase()) ?? null;
}

export function findBlockByAlias(input: string) {
  const normalized = input.toUpperCase().replace(/\s+/g, "");
  return BLOCK_ALIAS_LOOKUP.get(normalized) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimateSeatCoordinate(
  block: StadiumBlock,
  row: number | undefined,
  seat: number | undefined,
): StadiumCoordinate {
  if (row === undefined && seat === undefined) {
    return block.coordinate;
  }

  const normalizedRow =
    row === undefined ? 0.5 : clamp((row - 1) / (block.seatRows - 1), 0, 1);
  const normalizedSeat =
    seat === undefined
      ? 0.5
      : clamp((seat - 1) / (block.seatsPerRow - 1), 0, 1);

  const rowShift = (normalizedRow - 0.5) * 26;
  const seatShift = (normalizedSeat - 0.5) * 24;

  if (
    block.sectionId === "JIO_END" ||
    block.sectionId === "ADANI_PAVILION_END"
  ) {
    const northShift =
      block.sectionId === "JIO_END" ? rowShift + 6 : -rowShift - 6;
    return offsetCoordinateByMeters(block.coordinate, northShift, seatShift);
  }

  const eastShift =
    block.sectionId === "EAST_STAND" ? rowShift + 6 : -rowShift - 6;
  return offsetCoordinateByMeters(block.coordinate, -seatShift, eastShift);
}

export function resolveSeatQuery(
  rawSeatQuery: string,
): SeatLookupResult | null {
  const cleaned = rawSeatQuery.trim().toUpperCase();

  if (cleaned.length === 0) {
    return null;
  }

  const normalized = cleaned.replace(/\s+/g, "");
  const match = normalized.match(
    /^([A-Z]\d{1,2})(?:[-/:]?R(\d{1,2}))?(?:[-/:]?S(\d{1,2}))?$/,
  );

  const block = match ? findBlockById(match[1]) : findBlockByAlias(normalized);

  if (!block) {
    return null;
  }

  const parsedRow =
    match && match[2]
      ? clamp(Number.parseInt(match[2], 10), 1, block.seatRows)
      : undefined;
  const parsedSeat =
    match && match[3]
      ? clamp(Number.parseInt(match[3], 10), 1, block.seatsPerRow)
      : undefined;

  const coordinate = estimateSeatCoordinate(block, parsedRow, parsedSeat);
  const displayLabel =
    parsedRow && parsedSeat
      ? `${block.id} / Row ${parsedRow} / Seat ${parsedSeat}`
      : parsedRow
        ? `${block.id} / Row ${parsedRow}`
        : block.id;

  return {
    block,
    row: parsedRow,
    seat: parsedSeat,
    coordinate,
    displayLabel,
  };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  pointA: StadiumCoordinate,
  pointB: StadiumCoordinate,
) {
  const earthRadiusMeters = 6_371_000;
  const latDelta = degreesToRadians(pointB.lat - pointA.lat);
  const lngDelta = degreesToRadians(pointB.lng - pointA.lng);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(degreesToRadians(pointA.lat)) *
      Math.cos(degreesToRadians(pointB.lat)) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function findNearestGate(
  target: StadiumCoordinate,
  candidateGateIds?: string[],
) {
  const candidates = candidateGateIds?.length
    ? NARENDRA_MODI_STADIUM_GATES.filter((gate) =>
        candidateGateIds.includes(gate.id),
      )
    : NARENDRA_MODI_STADIUM_GATES;

  let nearestGate = candidates[0] ?? null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const gate of candidates) {
    const currentDistance = distanceMeters(target, gate.coordinate);

    if (currentDistance < nearestDistance) {
      nearestDistance = currentDistance;
      nearestGate = gate;
    }
  }

  return nearestGate;
}

export function toGeoJSONPoint(coordinate: StadiumCoordinate) {
  return {
    type: "Point" as const,
    coordinates: [coordinate.lng, coordinate.lat] as [number, number],
  };
}

export function fromGeoJSONPoint(coordinates: [number, number]) {
  return {
    lat: coordinates[1],
    lng: coordinates[0],
  };
}
