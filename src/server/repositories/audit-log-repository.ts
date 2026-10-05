import "server-only";

import { prisma } from "@/server/db";

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  ip?: string | null;
};

// Append-only (rule 6): there is deliberately no update or delete here, and the
// database trigger rejects both.
export const auditLogRepository = {
  append(entry: AuditEntry) {
    return prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? {},
        ip: entry.ip ?? null,
      },
    });
  },
};

export type AuditLogRepository = typeof auditLogRepository;
