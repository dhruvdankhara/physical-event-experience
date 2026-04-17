import { getFirestoreRuntimeConfig } from "@/lib/db";
import { asISODate, toFirestoreOperationError } from "@/repositories/utils";

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
});
