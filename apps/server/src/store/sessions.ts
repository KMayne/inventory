import type { Session } from "@inventory/shared";
import { config } from "../config.ts";
import { prisma } from "./prisma.ts";

export async function createSession(userId: string): Promise<Session> {
  const expiresAt = Date.now() + config.sessionMaxAge;

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: BigInt(expiresAt),
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    expiresAt: Number(session.expiresAt),
  };
}

export async function getSession(
  sessionId: string
): Promise<Session | undefined> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) return undefined;

  const expiresAt = Number(session.expiresAt);

  // Check if expired
  if (expiresAt < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return undefined;
  }

  return {
    id: session.id,
    userId: session.userId,
    expiresAt,
  };
}

export async function refreshSession(
  sessionId: string
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  // Sliding expiration
  const newExpiresAt = Date.now() + config.sessionMaxAge;

  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: BigInt(newExpiresAt) },
  });

  return {
    ...session,
    expiresAt: newExpiresAt,
  };
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await prisma.session.delete({ where: { id: sessionId } });
    return true;
  } catch {
    return false;
  }
}
