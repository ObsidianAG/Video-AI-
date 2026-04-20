/**
 * Kling video generation adapter.
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

interface KlingGenerateResponse {
  task_id: string;
  status: string;
  video_url?: string;
  error?: string;
}

export class KlingAdapter implements ProviderAdapter {
  readonly name: ProviderName = "kling";
  readonly capabilities: ProviderCapabilities = {
    textToVideo: true,
    imageToVideo: true,
    textToText: false,
  };

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.KLING_API_BASE_URL;
    this.apiKey = config.KLING_API_KEY;
  }

  async generateVideo(params: GenerateVideoParams): Promise<ProviderResult> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      duration: params.durationSeconds,
      aspect_ratio: params.aspectRatio,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      ...(params.fps ? { fps: params.fps } : {}),
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
      ...(params.providerParams ?? {}),
    };

    const endpoint = params.imageUrl ? "/v1/videos/image2video" : "/v1/videos/text2video";

    const response = await this._request("POST", endpoint, body);
    const data = response as KlingGenerateResponse;

    return {
      provider: "kling",
      operationId: data.task_id,
      status: this._mapStatus(data.status),
      ...(data.video_url !== undefined ? { videoUrl: data.video_url } : {}),
      ...(data.error !== undefined ? { errorMessage: data.error } : {}),
    };
  }

  async generateText(_params: GenerateTextParams): Promise<ProviderResult> {
    throw new ProviderError("kling", "UNSUPPORTED", "Kling does not support text generation");
  }

  async pollStatus(operationId: string): Promise<ProviderResult> {
    const data = (await this._request("GET", `/v1/videos/tasks/${operationId}`)) as KlingGenerateResponse;

    return {
      provider: "kling",
      operationId,
      status: this._mapStatus(data.status),
      ...(data.video_url !== undefined ? { videoUrl: data.video_url } : {}),
      ...(data.error !== undefined ? { errorMessage: data.error, errorCode: "KLING_ERROR" } : {}),
    };
  }

  async cancel(operationId: string): Promise<void> {
    await this._request("POST", `/v1/videos/tasks/${operationId}/cancel`, {});
  }

  private _mapStatus(klingStatus: string): "PENDING" | "RUNNING" | "COMPLETE" | "ERROR" {
    switch (klingStatus?.toLowerCase()) {
      case "submitted":
      case "queued":
        return "PENDING";
      case "processing":
      case "running":
        return "RUNNING";
      case "succeed":
      case "success":
      case "completed":
        return "COMPLETE";
      case "failed":
      case "error":
        return "ERROR";
      default:
        return "PENDING";
    }
  }

  private async _request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      throw new ProviderError("kling", "NETWORK_ERROR", `Request to ${path} failed`, err);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderError(
        "kling",
        `HTTP_${response.status}`,
        `Kling API error (${response.status}): ${text}`,
      );
    }

    return response.json();
  }
}
