/**
 * Common ProviderAdapter interface.
 * All provider implementations must satisfy this contract.
 */

export type ProviderName = "veo" | "kling" | "anthropic" | "vllm" | "gemini";

export interface ProviderCapabilities {
  readonly textToVideo: boolean;
  readonly imageToVideo: boolean;
  readonly textToText: boolean;
}

export interface GenerateVideoParams {
  prompt: string;
  imageUrl?: string;
  durationSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  fps?: 24 | 30 | 60;
  seed?: number;
  providerParams?: Record<string, unknown>;
}

export interface GenerateTextParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export type ProviderStatus = "PENDING" | "RUNNING" | "COMPLETE" | "ERROR";

export interface ProviderResult {
  provider: ProviderName;
  operationId: string;
  status: ProviderStatus;
  videoUrl?: string;
  textOutput?: string;
  errorCode?: string;
  errorMessage?: string;
  usageMetadata?: Record<string, unknown>;
}

export interface ProviderAdapter {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;

  generateVideo(params: GenerateVideoParams): Promise<ProviderResult>;
  generateText(params: GenerateTextParams): Promise<ProviderResult>;
  pollStatus(operationId: string): Promise<ProviderResult>;
  cancel(operationId: string): Promise<void>;
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly code: string,
    message: string,
    public readonly providerCause?: unknown,
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = "ProviderError";
  }
}
