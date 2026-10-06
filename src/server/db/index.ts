import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/server/env";

import { PrismaClient } from "./generated/prisma/client";

// One client per process. In dev, hot reload would otherwise open a new pool each time.
// The cache is keyed by the generated class: after `prisma generate` (a new migration),
// hot reload brings a new class and gets a fresh client instead of the stale one.
const globalForPrisma = globalThis as unknown as {
  prisma?: { client: PrismaClient; generated: typeof PrismaClient };
};

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
}

const cached = globalForPrisma.prisma;
if (cached && cached.generated !== PrismaClient) {
  // A stale client, possibly cached in an older shape: close its pool and replace it.
  const stale = (cached.client ?? cached) as Partial<PrismaClient>;
  void stale.$disconnect?.().catch(() => {});
}

export const prisma =
  cached?.generated === PrismaClient ? cached.client : createClient();

if (env.NODE_ENV !== "production")
  globalForPrisma.prisma = { client: prisma, generated: PrismaClient };
