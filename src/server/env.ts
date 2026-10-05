import "server-only";

import { parseEnv } from "./env.schema";

/** Validated server env. Imported at boot by src/instrumentation.ts and the worker. */
export const env = parseEnv(process.env);
