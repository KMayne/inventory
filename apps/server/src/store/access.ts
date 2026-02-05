import type { InventoryAccess } from "@inventory/shared";
import { prisma } from "./prisma.ts";

export async function createInventoryAccess(
  inventoryId: string,
  ownerId: string
): Promise<InventoryAccess> {
  const inventory = await prisma.inventory.create({
    data: {
      id: inventoryId,
      ownerId,
    },
    include: { members: true },
  });

  return {
    inventoryId: inventory.id,
    ownerId: inventory.ownerId,
    memberIds: inventory.members.map((m) => m.userId),
  };
}

export async function getInventoryAccess(
  inventoryId: string
): Promise<InventoryAccess | undefined> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { members: true },
  });

  if (!inventory) return undefined;

  return {
    inventoryId: inventory.id,
    ownerId: inventory.ownerId,
    memberIds: inventory.members.map((m) => m.userId),
  };
}

export async function getInventoriesForUser(
  userId: string
): Promise<InventoryAccess[]> {
  // Get inventories where user is owner or member
  const inventories = await prisma.inventory.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: { members: true },
  });

  return inventories.map((inv) => ({
    inventoryId: inv.id,
    ownerId: inv.ownerId,
    memberIds: inv.members.map((m) => m.userId),
  }));
}

export async function canUserAccessInventory(
  userId: string,
  inventoryId: string
): Promise<boolean> {
  const inventory = await prisma.inventory.findFirst({
    where: {
      id: inventoryId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });

  return inventory !== null;
}

export async function isInventoryOwner(
  userId: string,
  inventoryId: string
): Promise<boolean> {
  const inventory = await prisma.inventory.findFirst({
    where: {
      id: inventoryId,
      ownerId: userId,
    },
  });

  return inventory !== null;
}

export async function addMemberToInventory(
  inventoryId: string,
  memberId: string
): Promise<boolean> {
  try {
    await prisma.inventoryMember.upsert({
      where: {
        inventoryId_userId: {
          inventoryId,
          userId: memberId,
        },
      },
      update: {},
      create: {
        inventoryId,
        userId: memberId,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeMemberFromInventory(
  inventoryId: string,
  memberId: string
): Promise<boolean> {
  try {
    await prisma.inventoryMember.delete({
      where: {
        inventoryId_userId: {
          inventoryId,
          userId: memberId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteInventoryAccess(
  inventoryId: string
): Promise<boolean> {
  try {
    await prisma.inventory.delete({
      where: { id: inventoryId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getInventoryMembersWithNames(
  inventoryId: string
): Promise<{ members: Array<{ id: string; name: string }>; ownerId: string } | null> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
      owner: { select: { id: true, name: true } },
    },
  });

  if (!inventory) return null;

  return {
    ownerId: inventory.ownerId,
    members: inventory.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
    })),
  };
}

export async function getAvailableUsersForInventory(
  inventoryId: string,
  excludeUserId: string
): Promise<Array<{ id: string; name: string }>> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: { members: true },
  });

  if (!inventory) return [];

  const excludedIds = [
    inventory.ownerId,
    ...inventory.members.map((m) => m.userId),
    excludeUserId,
  ];

  const users = await prisma.user.findMany({
    where: { id: { notIn: excludedIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return users;
}
