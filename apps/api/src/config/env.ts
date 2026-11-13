import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LIVEKIT_WS_URL: z.string().url().default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  NEO4J_URI: z.string().optional(),
  NEO4J_USERNAME: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
