import { compare, hash } from "bcryptjs";

import { loginUser, registerUser } from "@/services/auth.service";
import { createUser, getUserByEmail } from "@/repositories/user.repository";
import type { UserRecord } from "@/types/models";

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@/repositories/user.repository", () => ({
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
}));

const mockedHash = hash as jest.MockedFunction<typeof hash>;
const mockedCompare = compare as jest.MockedFunction<typeof compare>;
const mockedCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockedGetUserByEmail = getUserByEmail as jest.MockedFunction<
  typeof getUserByEmail
>;

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    _id: "user-1",
    name: "Taylor Fan",
    email: "taylor@example.com",
    passwordHash: "stored-hash",
    role: "ATTENDEE",
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects registration when the email already exists", async () => {
    mockedGetUserByEmail.mockResolvedValue(buildUser());

    await expect(
      registerUser({
        name: "Taylor Fan",
        email: "taylor@example.com",
        passwordHash: "Secret123!",
      }),
    ).rejects.toThrow("An account with that email already exists.");

    expect(mockedHash).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("hashes password and always persists ATTENDEE role on register", async () => {
    const createdUser = buildUser();
    mockedGetUserByEmail.mockResolvedValue(null);
    mockedHash.mockResolvedValue("hashed-password");
    mockedCreateUser.mockResolvedValue(createdUser);

    const result = await registerUser({
      name: "Taylor Fan",
      email: "taylor@example.com",
      passwordHash: "Secret123!",
      role: "ADMIN",
    });

    expect(mockedHash).toHaveBeenCalledWith("Secret123!", 12);
    expect(mockedCreateUser).toHaveBeenCalledWith({
      name: "Taylor Fan",
      email: "taylor@example.com",
      passwordHash: "hashed-password",
      role: "ATTENDEE",
    });
    expect(result).toEqual(createdUser);
  });

  it("uses the dummy hash path for missing users and still returns invalid credentials", async () => {
    mockedGetUserByEmail.mockResolvedValue(null);
    mockedCompare.mockResolvedValue(false);

    await expect(
      loginUser("missing@example.com", "wrong-password"),
    ).rejects.toThrow("Invalid email or password.");

    expect(mockedCompare).toHaveBeenCalledTimes(1);
    const [, comparedHash] = mockedCompare.mock.calls[0] ?? [];
    expect(comparedHash).toContain("$2a$12$");
  });
});
