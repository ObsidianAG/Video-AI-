/**
 * Veo Vertex AI adapter — GA text-to-video and image-to-video.
 * Uses Vertex AI REST API directly (no SDK) for long-running operations.
 */
import { config } from "../config.js";
import {
  GenerateTextParams,
  GenerateVideoParams,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderError,
  ProviderName,
  ProviderResult,
} from "./interface.js";

interface VeoOperation {
  name: string;
  done?: boolean;
  response?: {
    videos?: Array<{ gcsUri?: string; mimeType?: string }>;
  };
  error?: { code?: number; message?: string };
}

export class VeoAdapter implements ProviderAdapter {
  readonly name: ProviderName = "veo";
  readonly capabilities: ProviderCapabilities = {
    textToVideo: true,
    imageToVideo: true,
    textToText: false,
  };

  private readonly project: string;
  private readonly region: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.project = config.GOOGLE_CLOUD_PROJECT;
    this.region = config.GOOGLE_CLOUD_REGION;
    this.model = config.VEO_MODEL;
    this.baseUrl = `https://${this.region}-aiplatform.googleapis.com/v1`;
  }

  async generateVideo(params: GenerateVideoParams): Promise<ProviderResult> {
    // Mode selection: presence of `imageUrl` triggers image-to-video;
    // absence defaults to text-to-video. Both share the same Veo endpoint.
    const endpoint = [
      this.baseUrl,
      "projects", this.project,
      "locations", this.region,
      "publishers/google/models",
      `${this.model}:predictLongRunning`,
    ].join("/");

    const requestBody: Record<string, unknown> = {
      instances: [
        {
          prompt: params.prompt,
          ...(params.imageUrl ? { image: { gcsUri: params.imageUrl } } : {}),
        },
      ],
      parameters: {
        durationSeconds: params.durationSeconds,
        aspectRatio: params.aspectRatio,
        ...(params.fps !== undefined ? { fps: params.fps } : {}),
        ...(params.seed !== undefined ? { seed: params.seed } : {}),
        ...(params.providerParams ?? {}),
      },
    };

    const accessToken = await this._getAccessToken();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderError("veo", `HTTP_${response.status}`, `Veo API error: ${text}`);
    }

    const operation = (await response.json()) as VeoOperation;
    return {
      provider: "veo",
      operationId: operation.name,
      status: operation.done ? "COMPLETE" : "PENDING",
      ...(operation.response?.videos?.[0]?.gcsUri
        ? { videoUrl: operation.response.videos[0].gcsUri }
        : {}),
    };
  }

  async generateText(_params: GenerateTextParams): Promise<ProviderResult> {
    throw new ProviderError("veo", "UNSUPPORTED", "Veo does not support text generation");
  }

  async pollStatus(operationId: string): Promise<ProviderResult> {
    const accessToken = await this._getAccessToken();
    const response = await fetch(`${this.baseUrl}/${operationId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new ProviderError("veo", `POLL_HTTP_${response.status}`, await response.text());
    }

    const operation = (await response.json()) as VeoOperation;

    if (!operation.done) {
      return { provider: "veo", operationId, status: "RUNNING" };
    }

    if (operation.error) {
      return {
        provider: "veo",
        operationId,
        status: "ERROR",
        errorCode: String(operation.error.code ?? "UNKNOWN"),
        errorMessage: operation.error.message ?? "Unknown error",
      };
    }

    return {
      provider: "veo",
      operationId,
      status: "COMPLETE",
      ...(operation.response?.videos?.[0]?.gcsUri
        ? { videoUrl: operation.response.videos[0].gcsUri }
        : {}),
    };
  }

  async cancel(operationId: string): Promise<void> {
    const accessToken = await this._getAccessToken();
    await fetch(`${this.baseUrl}/${operationId}:cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  private async _getAccessToken(): Promise<string> {
    // Try GCP metadata server (works in GKE/Cloud Run/GCE)
    try {
      const response = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        {
          headers: { "Metadata-Flavor": "Google" },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (response.ok) {
        const data = (await response.json()) as { access_token?: string };
        if (data.access_token) return data.access_token;
      }
    } catch {
      // Not on GCP metadata server
    }

    const token = process.env["GOOGLE_ACCESS_TOKEN"];
    if (token) return token;

    throw new ProviderError(
      "veo",
      "AUTH_FAILED",
      "Unable to obtain GCP access token. Set GOOGLE_APPLICATION_CREDENTIALS or run on GCP.",
    );
  }
}
