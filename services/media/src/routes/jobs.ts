/**
 * Internal jobs execute route.
 * POST /internal/jobs/execute
 */
import { Router, Request, Response, NextFunction, type IRouter } from "express";
import { z } from "zod";
import { getProvider, isValidProvider } from "../providers/registry.js";
import { ProviderError } from "../providers/interface.js";
import { config } from "../config.js";

export const jobsRouter: IRouter = Router();

const executeJobSchema = z.object({
  jobId: z.string().uuid(),
  provider: z.string().min(1),
  jobType: z.enum(["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO", "TEXT_TO_TEXT"]),
  params: z.record(z.unknown()),
  callbackUrl: z.string().url(),
  idempotencyKey: z.string().min(1),
});

type ExecuteJobBody = z.infer<typeof executeJobSchema>;

// Internal secret middleware
function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers["x-internal-secret"];
  if (secret !== config.MEDIA_SERVICE_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

jobsRouter.post(
  "/internal/jobs/execute",
  requireInternalSecret,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = executeJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const body = parsed.data;

    if (!isValidProvider(body.provider)) {
      res.status(400).json({ error: `Unknown provider: ${body.provider}` });
      return;
    }

    const provider = getProvider(body.provider);
    const mediaJobId = `${body.provider}-${body.jobId}-${Date.now()}`;

    // Fire and forget — callback reports result
    void executeJobAsync(body, provider, mediaJobId);

    res.status(202).json({
      accepted: true,
      mediaJobId,
    });
  },
);

async function executeJobAsync(
  body: ExecuteJobBody,
  provider: ReturnType<typeof getProvider>,
  mediaJobId: string,
): Promise<void> {
  let result;

  try {
    if (body.jobType === "TEXT_TO_TEXT") {
      const p = body.params as {
        system_prompt?: string;
        systemPrompt?: string;
        user_message?: string;
        userMessage?: string;
        max_tokens?: number;
        temperature?: number;
      };
      result = await provider.generateText({
        systemPrompt: p.system_prompt ?? p.systemPrompt ?? "",
        userMessage: p.user_message ?? p.userMessage ?? "",
        ...(p.max_tokens !== undefined ? { maxTokens: p.max_tokens } : {}),
        ...(p.temperature !== undefined ? { temperature: p.temperature } : {}),
      });
    } else {
      const p = body.params as {
        prompt?: string;
        image_url?: string;
        imageUrl?: string;
        duration_seconds?: number;
        durationSeconds?: number;
        aspect_ratio?: "16:9" | "9:16" | "1:1";
        aspectRatio?: "16:9" | "9:16" | "1:1";
        fps?: 24 | 30 | 60;
        seed?: number;
        provider_params?: Record<string, unknown>;
      };
      result = await provider.generateVideo({
        prompt: p.prompt ?? "",
        ...(p.image_url !== undefined ? { imageUrl: p.image_url } : p.imageUrl !== undefined ? { imageUrl: p.imageUrl } : {}),
        durationSeconds: p.duration_seconds ?? p.durationSeconds ?? 5,
        aspectRatio: p.aspect_ratio ?? p.aspectRatio ?? "16:9",
        ...(p.fps !== undefined ? { fps: p.fps } : {}),
        ...(p.seed !== undefined ? { seed: p.seed } : {}),
        ...(p.provider_params !== undefined ? { providerParams: p.provider_params } : {}),
      });
    }

    // Poll until complete if provider returned PENDING/RUNNING
    if (result.status === "PENDING" || result.status === "RUNNING") {
      result = await pollUntilComplete(provider, result.operationId);
    }

    await sendCallback(body.callbackUrl, {
      jobId: body.jobId,
      mediaJobId,
      state: result.status === "COMPLETE" ? "SUCCEEDED" : "FAILED",
      outputUrl: result.videoUrl ?? result.textOutput,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      usageMetadata: result.usageMetadata,
    });
  } catch (err) {
    const errorCode = err instanceof ProviderError ? err.code : "EXECUTION_ERROR";
    const errorMessage = err instanceof Error ? err.message : String(err);

    await sendCallback(body.callbackUrl, {
      jobId: body.jobId,
      mediaJobId,
      state: "FAILED",
      errorCode,
      errorMessage,
    });
  }
}

async function pollUntilComplete(
  provider: ReturnType<typeof getProvider>,
  operationId: string,
  maxAttempts = 120,
  intervalMs = 5000,
): Promise<ReturnType<typeof provider.pollStatus> extends Promise<infer T> ? T : never> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs);
    const result = await provider.pollStatus(operationId);
    if (result.status === "COMPLETE" || result.status === "ERROR") {
      return result as Awaited<ReturnType<typeof provider.pollStatus>>;
    }
  }
  throw new ProviderError(
    provider.name,
    "POLL_TIMEOUT",
    `Polling timed out after ${maxAttempts} attempts`,
  );
}

async function sendCallback(url: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": config.MEDIA_SERVICE_SECRET,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[callback] Failed to send callback to ${url}: HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[callback] Network error sending callback to ${url}:`, err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
