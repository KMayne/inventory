import type { User } from "@inventory/shared";
import { prisma } from "./prisma.ts";

export async function createUser(
  username: string,
  passwordHash: string,
  name: string,
): Promise<User> {
  const user = await prisma.user.create({
    data: { username, passwordHash, name },
  });

  return {
    id: user.id,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getAllUsers(): Promise<
  Array<{ id: string; name: string }>
> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) return undefined;

  return {
    id: user.id,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserByUsername(
  username: string,
): Promise<{ id: string; name: string; passwordHash: string } | undefined> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, passwordHash: true },
  });

  return user ?? undefined;
}

export async function updateUser(
  id: string,
  data: { name?: string },
): Promise<{ id: string; name: string } | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });
    return user;
  } catch {
    return null;
  }
}
