import 'dotenv/config';
import { z } from 'zod';

const envBool = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  }
  return v;
}, z.boolean());

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8081),

  DB_PATH: z.string().default('./data.sqlite'),

  LMSTUDIO_BASE_URL: z.string().url().default('http://localhost:1234/v1'),
  LMSTUDIO_MODEL: z.string().default('openai/gpt-oss-20b'),
  LMSTUDIO_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  CORS_ORIGIN: z.string().default('http://localhost:4200'),

  AUTH_ENABLED: envBool.default(true),
  AUTH_TOKEN: z.string().default('i do deserve it'),
  AUTH_BYPASS_LOCALHOST: envBool.default(true),
  ENABLE_SWAGGER: envBool.default(true),
  HOST: z.string().default('0.0.0.0'),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
