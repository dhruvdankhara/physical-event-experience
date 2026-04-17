import { hash, compare } from "bcryptjs";
import { createUser, getUserByEmail, type CreateUserInput } from "@/repositories/user.repository";

export async function registerUser(input: CreateUserInput) {
  const existingUser = await getUserByEmail(input.email);
  if (existingUser) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hash(input.passwordHash, 12);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "ATTENDEE",
  });

  return user;
}

export async function loginUser(email: string, passwordString: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await compare(passwordString, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  return user;
}
