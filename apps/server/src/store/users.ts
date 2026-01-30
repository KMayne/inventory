import type { User, StoredCredential } from "@inventory/shared";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { prisma } from "./prisma.ts";

export async function createUser(name: string): Promise<User> {
  const user = await prisma.user.create({
    data: { name },
    include: { credentials: true },
  });

  return {
    id: user.id,
    name: user.name,
    credentials: user.credentials.map(credentialToStored),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { credentials: true },
  });

  if (!user) return undefined;

  return {
    id: user.id,
    name: user.name,
    credentials: user.credentials.map(credentialToStored),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserByCredentialId(
  credentialId: string
): Promise<User | undefined> {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    include: {
      user: {
        include: { credentials: true },
      },
    },
  });

  if (!credential) return undefined;

  const user = credential.user;
  return {
    id: user.id,
    name: user.name,
    credentials: user.credentials.map(credentialToStored),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function addCredentialToUser(
  userId: string,
  credential: StoredCredential
): Promise<void> {
  await prisma.credential.create({
    data: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports
        ? JSON.stringify(credential.transports)
        : null,
      userId,
    },
  });
}

export async function getCredentialById(
  userId: string,
  credentialId: string
): Promise<StoredCredential | undefined> {
  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId,
    },
  });

  if (!credential) return undefined;

  return credentialToStored(credential);
}

export async function updateCredentialCounter(
  userId: string,
  credentialId: string,
  counter: number
): Promise<void> {
  await prisma.credential.updateMany({
    where: {
      id: credentialId,
      userId,
    },
    data: { counter },
  });
}

function credentialToStored(credential: {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string | null;
}): StoredCredential {
  return {
    id: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports
      ? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
      : undefined,
  };
}
