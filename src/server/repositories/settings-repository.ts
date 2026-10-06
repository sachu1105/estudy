import "server-only";

import { prisma } from "@/server/db";
import type { Prisma } from "@/server/db/generated/prisma/client";

export const settingsRepository = {
  all() {
    return prisma.appSetting.findMany();
  },
  save(key: string, value: unknown, actorId: string) {
    const json = value as Prisma.InputJsonValue;
    return prisma.appSetting.upsert({
      where: { key },
      create: { key, value: json, updatedById: actorId },
      update: { value: json, updatedById: actorId },
    });
  },
};
