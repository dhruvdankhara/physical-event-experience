import { getFirestoreRuntimeConfig } from "@/lib/db";
import {
  asAlertAudience,
  asAlertSeverity,
  asBoolean,
  asCoordinates,
  asISODate,
  asNumber,
  asOptionalString,
  asPOIStatus,
  asPOIType,
  asRole,
  asString,
  isRecord,
  normalizeEmail,
  toFirestoreOperationError,
} from "@/repositories/utils";

jest.mock("@/lib/db", () => ({
  getFirestoreRuntimeConfig: jest.fn(),
}));

const mockedGetFirestoreRuntimeConfig =
  getFirestoreRuntimeConfig as jest.MockedFunction<
    typeof getFirestoreRuntimeConfig
  >;

describe("repositories/utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetFirestoreRuntimeConfig.mockReturnValue({
      projectId: "stadium-project",
      databaseId: "operations-db",
    });
  });

  it("converts Firestore-style timestamps to ISO strings", () => {
    const iso = asISODate({
      toDate: () => new Date("2026-04-17T12:34:56.000Z"),
    });

    expect(iso).toBe("2026-04-17T12:34:56.000Z");
  });

  it("wraps Firestore code 5 errors with actionable configuration details", () => {
    const original = { code: 5, details: "database missing" };

    const wrapped = toFirestoreOperationError("reading alerts", original);

    expect(wrapped.message).toContain("Firestore returned NOT_FOUND");
    expect(wrapped.message).toContain("stadium-project");
    expect(wrapped.message).toContain("operations-db");
    expect(wrapped.message).toContain("database missing");
    expect((wrapped as Error & { cause?: unknown }).cause).toBe(original);
  });

  it("wraps Firestore NOT_FOUND when the numeric code is provided as a string", () => {
    const original = { code: "5" };
    const wrapped = toFirestoreOperationError("writing POIs", original);
    expect(wrapped.message).toContain("NOT_FOUND");
  });

  it("passes through Error instances for non-NOT_FOUND codes", () => {
    const err = new Error("permission");
    expect(toFirestoreOperationError("reading users", err)).toBe(err);
  });

  it("creates a generic error for unknown non-Error values", () => {
    const wrapped = toFirestoreOperationError("reading users", 404);
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toContain("Unexpected Firestore error");
  });

  it("normalizes primitive coercions predictably", () => {
    expect(normalizeEmail("  Test@Example.COM ")).toBe("test@example.com");
    expect(asString(12, "fallback")).toBe("fallback");
    expect(asString("x")).toBe("x");
    expect(asOptionalString("")).toBeUndefined();
    expect(asOptionalString(" ok ")).toBe(" ok ");
    expect(asNumber("nope", 7)).toBe(7);
    expect(asNumber(3.5, 0)).toBe(3.5);
    expect(asNumber(Number.NaN, 2)).toBe(2);
    expect(asBoolean("yes", false)).toBe(false);
    expect(asBoolean(true, false)).toBe(true);
    expect(asRole("ADMIN")).toBe("ADMIN");
    expect(asRole("UNKNOWN")).toBe("ATTENDEE");
    expect(asAlertSeverity("CRITICAL")).toBe("CRITICAL");
    expect(asAlertSeverity(null)).toBe("INFO");
    expect(asAlertAudience("STAFF")).toBe("STAFF");
    expect(asAlertAudience({})).toBe("ALL");
    expect(asPOIType("FIRST_AID")).toBe("FIRST_AID");
    expect(asPOIType(1)).toBe("CONCESSION");
    expect(asPOIStatus("CLOSED")).toBe("CLOSED");
    expect(asPOIStatus(undefined)).toBe("OPEN");
    expect(asCoordinates([72.5, 23.0])).toEqual([72.5, 23.0]);
    expect(asCoordinates(["x", "y"])).toEqual([0, 0]);
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
  });

  it("uses default fallbacks when optional fallback parameters are omitted", () => {
    expect(asNumber("nope")).toBe(0);
    expect(asBoolean("yes")).toBe(false);
    expect(asCoordinates("not-an-array")).toEqual([0, 0]);
  });

  it("returns ISO strings for plain string timestamps", () => {
    expect(asISODate("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
  });

  it("falls back to now when a Firestore timestamp is invalid", () => {
    const before = Date.now();
    const value = asISODate({
      toDate: () => new Date(Number.NaN),
    });
    const after = Date.now();
    expect(Date.parse(value)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(value)).toBeLessThanOrEqual(after);
  });

  it("treats records without a toDate field as non-timestamps", () => {
    const before = Date.now();
    const iso = asISODate({ kind: "plain" });
    const after = Date.now();
    expect(Date.parse(iso)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(iso)).toBeLessThanOrEqual(after);
  });

  it("falls back to ADC-oriented Firestore hints when runtime config is unavailable", () => {
    mockedGetFirestoreRuntimeConfig.mockReturnValue({});

    const wrapped = toFirestoreOperationError("reading alerts", { code: 5 });

    expect(wrapped.message).toContain("from Application Default Credentials");
    expect(wrapped.message).toContain("(default)");
  });
});
