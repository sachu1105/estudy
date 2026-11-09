import "server-only";

import { systemClock } from "@/lib/clock";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { examCalendarRepository } from "@/server/repositories/exam-calendar-repository";
import { notificationService } from "@/server/services/notifications";
import { storage } from "@/server/storage";

import { createExamCalendarService } from "./exam-calendar-service";
import { fetchPage, fetchPdf } from "./fetch";
import { pdfPages } from "./pdf-pages";

export const examCalendarService = createExamCalendarService({
  repo: examCalendarRepository,
  clock: systemClock,
  store: (key, bytes) => storage.put(key, bytes, "application/pdf"),
  fetchPage,
  fetchPdf,
  readPdf: pdfPages,
  notify: (rows) => notificationService.notify(rows),
  audit: (entry) => auditLogRepository.append(entry),
  ownsSyllabus: (userId, syllabusId) =>
    examCalendarRepository.hasExamPod(userId, syllabusId),
  examPods: (userId) => examCalendarRepository.examPods(userId),
});

export { postName } from "./exam-calendar-service";
