import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.url(),
    DEFAULT_TIMEZONE: z.string().min(1).default("Asia/Kolkata"),

    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.stringbool(),

    AI_PROVIDER: z.enum(["ollama", "hosted"]),
    OLLAMA_BASE_URL: z.url(),
    OLLAMA_MODEL: z.string().min(1),
    AI_API_KEY: optionalString,
    AI_MODEL: optionalString,

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    EMAIL_FROM: z.string().min(1),

    BILLING_ENABLED: z.stringbool(),

    SEED_ADMIN_EMAIL: optionalString.pipe(z.email().optional()),
    SEED_ADMIN_PASSWORD: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "must differ from JWT_ACCESS_SECRET",
      });
    }
    if (env.AI_PROVIDER === "hosted") {
      for (const key of ["AI_API_KEY", "AI_MODEL"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "required when AI_PROVIDER=hosted",
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parses raw env vars; throws one readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${problems}\nSee .env.example.`,
  );
}
