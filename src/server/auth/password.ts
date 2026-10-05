import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id parameters (19 MiB, 2 iterations).
const options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/** Burns the same time as a real check so login timing does not reveal which emails exist. */
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
  return false;
}
