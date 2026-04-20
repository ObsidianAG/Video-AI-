/**
 * Redis queue consumer for the media service.
 * Processes jobs independently from Express server.
 */
import Redis from "ioredis";
import { config } from "../config.js";
import { getProvider, isValidProvider } from "../providers/registry.js";
import { ProviderError } from "../providers/interface.js";

const MEDIA_QUEUE_KEY = "media:jobs:queue";
const MEDIA_PROCESSING_KEY = "media:jobs:processing";

let running = true;

process.on("SIGTERM", () => {
  running = false;
});
process.on("SIGINT", () => {
  running = false;
});

export async function startQueueWorker(): Promise<void> {
  const redis = new Redis(config.REDIS_URL);
  console.log("[queue-worker] Started, listening on:", MEDIA_QUEUE_KEY);

  while (running) {
    try {
      const result = await redis.blpop(MEDIA_QUEUE_KEY, 5);
      if (!result) continue;

      const [, raw] = result;
      let entry: {
        jobId: string;
        provider: string;
        jobType: string;
        params: Record<string, unknown>;
        callbackUrl: string;
        idempotencyKey: string;
        attempt?: number;
      };

      try {
        entry = JSON.parse(raw) as typeof entry;
      } catch {
        console.error("[queue-worker] Failed to parse job entry:", raw);
        continue;
      }

      await redis.hset(
        MEDIA_PROCESSING_KEY,
        entry.jobId,
        JSON.stringify({ ...entry, startedAt: new Date().toISOString() }),
      );

      try {
        await processQueuedJob(entry);
        await redis.hdel(MEDIA_PROCESSING_KEY, entry.jobId);
      } catch (err) {
        console.error("[queue-worker] Job processing error:", entry.jobId, err);
        await redis.hdel(MEDIA_PROCESSING_KEY, entry.jobId);

        const attempt = (entry.attempt ?? 0) + 1;
        if (attempt < 3) {
          await redis.rpush(MEDIA_QUEUE_KEY, JSON.stringify({ ...entry, attempt }));
        } else {
          console.error("[queue-worker] Job dead-lettered:", entry.jobId);
          await redis.rpush(
            "media:jobs:dlq",
            JSON.stringify({ ...entry, attempt, deadLetteredAt: new Date().toISOString() }),
          );
        }
      }
    } catch (err) {
      console.error("[queue-worker] Loop error:", err);
      await sleep(1000);
    }
  }

  await redis.quit();
  console.log("[queue-worker] Stopped");
}

async function processQueuedJob(entry: {
  jobId: string;
  provider: string;
  jobType: string;
  params: Record<string, unknown>;
  callbackUrl: string;
  idempotencyKey: string;
}): Promise<void> {
  if (!isValidProvider(entry.provider)) {
    throw new Error(`Unknown provider: ${entry.provider}`);
  }

  const provider = getProvider(entry.provider);

  let result;
  if (entry.jobType === "TEXT_TO_TEXT") {
    const p = entry.params as {
      system_prompt?: string;
      user_message?: string;
      max_tokens?: number;
      temperature?: number;
    };
    result = await provider.generateText({
      systemPrompt: p.system_prompt ?? "",
      userMessage: p.user_message ?? "",
      ...(p.max_tokens !== undefined ? { maxTokens: p.max_tokens } : {}),
      ...(p.temperature !== undefined ? { temperature: p.temperature } : {}),
    });
  } else {
    const p = entry.params as {
      prompt?: string;
      image_url?: string;
      duration_seconds?: number;
      aspect_ratio?: "16:9" | "9:16" | "1:1";
      fps?: 24 | 30 | 60;
      seed?: number;
    };
    result = await provider.generateVideo({
      prompt: p.prompt ?? "",
      ...(p.image_url !== undefined ? { imageUrl: p.image_url } : {}),
      durationSeconds: p.duration_seconds ?? 5,
      aspectRatio: p.aspect_ratio ?? "16:9",
      ...(p.fps !== undefined ? { fps: p.fps } : {}),
      ...(p.seed !== undefined ? { seed: p.seed } : {}),
    });
  }

  if (result.status === "PENDING" || result.status === "RUNNING") {
    // Poll
    for (let i = 0; i < 120; i++) {
      await sleep(5000);
      result = await provider.pollStatus(result.operationId);
      if (result.status === "COMPLETE" || result.status === "ERROR") break;
    }
  }

  await sendCallback(entry.callbackUrl, {
    jobId: entry.jobId,
    mediaJobId: result.operationId,
    state: result.status === "COMPLETE" ? "SUCCEEDED" : "FAILED",
    outputUrl: result.videoUrl ?? result.textOutput,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  });
}

async function sendCallback(url: string, payload: Record<string, unknown>): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": config.MEDIA_SERVICE_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Callback failed: HTTP ${response.status}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
