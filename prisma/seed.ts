// Creates (or re-promotes) the SUPER_ADMIN from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
// Run with `pnpm db:seed`. Safe to run repeatedly.
import "dotenv/config";

import { systemClock } from "@/lib/clock";
import { hashPassword } from "@/server/auth/password";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { userRepository } from "@/server/repositories/user-repository";

async function main() {
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
