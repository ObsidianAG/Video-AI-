import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  // Internal auth
  MEDIA_SERVICE_SECRET: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url(),

  // Google Cloud / Vertex AI (Veo)
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_REGION: z.string().default("us-central1"),
  VEO_MODEL: z.string().default("veo-3.0-generate-preview"),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // Kling
  KLING_API_KEY: z.string().min(1),
  KLING_API_BASE_URL: z.string().url().default("https://api.klingai.com"),

  // vLLM
  VLLM_BASE_URL: z.string().url(),
  VLLM_MODEL: z.string().default("meta-llama/Llama-3-8b-instruct"),

  // Gemini (optional verifier)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-pro"),

  // OTel
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4317"),
  OTEL_SERVICE_NAME: z.string().default("veo3-media"),
});

function loadConfig() {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Media service configuration error:\n${missing}`);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
