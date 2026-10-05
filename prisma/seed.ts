// Creates (or re-promotes) the SUPER_ADMIN from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD and
// the exam list. Run with `pnpm db:seed`. Safe to run repeatedly.
import "dotenv/config";

import { systemClock } from "@/lib/clock";
import { hashPassword } from "@/server/auth/password";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { catalogueRepository } from "@/server/repositories/catalogue-repository";
import { userRepository } from "@/server/repositories/user-repository";

// Catalogue syllabuses start empty: each one enters PENDING and needs admin approval (rule 5).
const exams = [
  { slug: "kerala-psc-ldc", name: "LD Clerk", board: "Kerala PSC", description: "Lower Division Clerk, district-wise." },
  { slug: "kerala-psc-lgs", name: "Last Grade Servants", board: "Kerala PSC", description: "LGS, district-wise." },
  { slug: "kerala-psc-degree-prelims", name: "Degree level preliminary exam", board: "Kerala PSC", description: "Common prelims for degree level posts." },
  { slug: "kerala-hc-assistant", name: "High Court Assistant", board: "Kerala High Court", description: "Assistant / Computer Assistant." },
  { slug: "ssc-cgl", name: "Combined Graduate Level", board: "SSC", description: "SSC CGL, Tier 1 and Tier 2." },
  { slug: "ssc-chsl", name: "Combined Higher Secondary Level", board: "SSC", description: "SSC CHSL (10+2)." },
  { slug: "rrb-ntpc", name: "Non-Technical Popular Categories", board: "RRB", description: "RRB NTPC, graduate and undergraduate." },
];

async function seedExams() {
  for (const [order, exam] of exams.entries())
    await catalogueRepository.upsertExam({ ...exam, order });
  console.log(`Exams ready: ${exams.length}`);
}

async function main() {
  await seedExams();
  const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(
      "SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set; skipping super admin.",
    );
    return;
  }
  if (password.length < 12)
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  const user = await userRepository.upsertSuperAdmin({
    email,
    passwordHash: await hashPassword(password),
    verifiedAt: systemClock.now(),
  });
  console.log(`Super admin ready: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
