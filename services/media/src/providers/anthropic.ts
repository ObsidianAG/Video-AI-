/**
 * Anthropic (Claude) adapter — planning and structured inference.
 * Routes:
 *   - claude-opus-4-5    → planning / long-horizon agent work
 *   - claude-sonnet-4-5  → runtime agent execution
 *   - claude-haiku-4-5   → low-cost helper tasks
 */
import Anthropic from "@anthropic-ai/sdk";
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

type ClaudeRole = "planning" | "execution" | "helper";

function selectModel(role: ClaudeRole): string {
  switch (role) {
    case "planning":
      return "claude-opus-4-5";
    case "execution":
      return "claude-sonnet-4-5";
    case "helper":
      return "claude-haiku-4-5";
  }
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly name: ProviderName = "anthropic";
  readonly capabilities: ProviderCapabilities = {
    textToVideo: false,
    imageToVideo: false,
    textToText: true,
  };

  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }

  async generateVideo(_params: GenerateVideoParams): Promise<ProviderResult> {
    throw new ProviderError(
      "anthropic",
      "UNSUPPORTED",
      "Anthropic does not support video generation",
    );
  }

  async generateText(params: GenerateTextParams): Promise<ProviderResult> {
    // Role is communicated via convention in systemPrompt prefix
    const role: ClaudeRole = params.systemPrompt.startsWith("[PLANNING]")
      ? "planning"
      : params.systemPrompt.startsWith("[HELPER]")
        ? "helper"
        : "execution";

    const model = selectModel(role);
    const operationId = `anthropic-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const message = await this.client.messages.create({
        model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userMessage }],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new ProviderError("anthropic", "EMPTY_RESPONSE", "No text content in response");
      }

      return {
        provider: "anthropic",
        operationId,
        status: "COMPLETE",
        textOutput: textContent.text,
        usageMetadata: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          model,
          stopReason: message.stop_reason,
        },
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError("anthropic", "API_ERROR", String(err), err);
    }
  }

  async pollStatus(operationId: string): Promise<ProviderResult> {
    // Anthropic text generation is synchronous; no async polling needed
    return {
      provider: "anthropic",
      operationId,
      status: "COMPLETE",
    };
  }

  async cancel(_operationId: string): Promise<void> {
    // No-op — Anthropic requests cannot be cancelled mid-flight
  }
}
