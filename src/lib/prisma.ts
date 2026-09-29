import { PrismaClient } from "@prisma/client";

/**
 * Единый экземпляр PrismaClient.
 * В dev-режиме Next.js перезагружает модули — храним клиент в globalThis,
 * чтобы не исчерпать пул соединений.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
