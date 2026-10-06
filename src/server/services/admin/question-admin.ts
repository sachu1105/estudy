import type { Clock } from "@/lib/clock";
import {
  parseImport,
  topicKey,
  type QuestionInput,
} from "@/lib/questions/questions";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { QuestionRepository } from "@/server/repositories/question-repository";

import { failure, type Result } from "../syllabus/deps";
import type { Admin } from "./admin-service";

/** A topic needs at least this many verified questions for a fair check test. */
export const THIN_BELOW = 5;

/** The question pool from the admin side: the human gate of rule 5. */
export function createQuestionAdmin(deps: {
  questions: QuestionRepository;
  audit: AuditLogRepository;
  clock: Clock;
}) {
  const log = (
    by: Admin,
    action: string,
    metadata: Record<string, string | number>,
  ) =>
    deps.audit.append({ actorId: by.id, action, metadata, ip: by.ip ?? null });

  /** The catalogue topic a question belongs to, when one has that name. */
  async function withTopic(questions: QuestionInput[]) {
    const topics = await deps.questions.catalogueTopics();
    const byKey = new Map(topics.map((t) => [topicKey(t.name), t.id]));
    return questions.map((q) => {
      const key = topicKey(q.topicName);
      return { ...q, topicKey: key, topicId: byKey.get(key) ?? null };
    });
  }

  return {
    list: (
      status: "PENDING" | "VERIFIED" | "SUPPRESSED",
      topic: string,
      page: number,
    ) => deps.questions.adminList({ status, topic: topicKey(topic) }, page),

    /** Written by an admin: verified at once, they are the human gate. */
    async add(by: Admin, input: QuestionInput): Promise<Result<object>> {
      await deps.questions.createMany(
        await withTopic([input]),
        { id: by.id, status: "VERIFIED", source: "ADMIN" },
        deps.clock.now(),
      );
      await log(by, "admin.question.add", { topic: input.topicName });
      return { ok: true };
    },

    /** Imports wait as PENDING unless the admin says they've checked them already. */
    async import(by: Admin, raw: string, verified: boolean) {
      const { questions, errors } = parseImport(raw);
      if (questions.length > 0)
        await deps.questions.createMany(
          await withTopic(questions),
          {
            id: by.id,
            status: verified ? "VERIFIED" : "PENDING",
            source: "ADMIN",
          },
          deps.clock.now(),
        );
      await log(by, "admin.question.import", {
        added: questions.length,
        errors: errors.length,
      });
      return { added: questions.length, errors };
    },

    async edit(
      by: Admin,
      id: string,
      input: QuestionInput,
    ): Promise<Result<object>> {
      const existing = await deps.questions.find(id);
      if (!existing) return failure("NOT_FOUND", "That question is gone.");
      await deps.questions.update(id, {
        ...input,
        topicKey: topicKey(input.topicName),
      });
      await log(by, "admin.question.edit", { id });
      return { ok: true };
    },

    /** Verify, suppress or delete; any open reports on them are closed. */
    async decide(
      by: Admin,
      ids: string[],
      decision: "VERIFIED" | "SUPPRESSED" | "DELETE",
    ) {
      const at = deps.clock.now();
      if (decision === "DELETE") await deps.questions.remove(ids);
      else {
        await deps.questions.setStatus(ids, decision, by.id, at);
        await deps.questions.resolveReports(ids, at);
      }
      await log(by, `admin.question.${decision.toLowerCase()}`, {
        count: ids.length,
      });
      return { ok: true as const };
    },

    /** Catalogue topics with too few verified questions, thinnest first. */
    async thinPool() {
      const topics = await deps.questions.catalogueTopics();
      const keys = [...new Set(topics.map((t) => topicKey(t.name)))];
      const counts = await deps.questions.verifiedCounts(keys);
      const seen = new Set<string>();
      return topics
        .map((t) => ({
          ...t,
          key: topicKey(t.name),
          count: counts.get(topicKey(t.name)) ?? 0,
        }))
        .filter(
          (t) => t.count < THIN_BELOW && !seen.has(t.key) && seen.add(t.key),
        )
        .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
    },
  };
}

export type QuestionAdmin = ReturnType<typeof createQuestionAdmin>;
