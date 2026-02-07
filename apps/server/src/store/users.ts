import type { InventoryDoc, Session, User } from "@homie/shared";
import { config } from "../config.ts";
import { getRepo } from "../repo.ts";
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

export async function createUserWithInventory(
  username: string,
  passwordHash: string,
  name: string,
): Promise<{ user: User; inventoryId: string; session: Session }> {
  // Create the Automerge doc first (not in DB transaction, but idempotent)
  const repo = getRepo();
  const handle = repo.create<InventoryDoc>();
  handle.change((doc) => {
    doc.items = {};
  });

  // Create user, inventory access, and session in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, passwordHash, name },
    });

    await tx.inventory.create({
      data: { id: handle.documentId, name: "Inventory", ownerId: user.id },
    });

    const expiresAt = Date.now() + config.sessionMaxAge;
    const session = await tx.session.create({
      data: { userId: user.id, expiresAt: BigInt(expiresAt) },
    });

    return {
      user: { id: user.id, name: user.name, createdAt: user.createdAt.toISOString() },
      inventoryId: handle.documentId,
      session: { id: session.id, userId: session.userId, expiresAt: Number(session.expiresAt) },
    };
  });

  return result;
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
