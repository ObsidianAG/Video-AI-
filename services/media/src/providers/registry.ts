/**
 * Provider registry — resolves provider adapters by name.
 * Adapters are singletons (lazy-initialized).
 */
import { AnthropicAdapter } from "./anthropic.js";
import { ProviderAdapter, ProviderError, ProviderName } from "./interface.js";
import { KlingAdapter } from "./kling.js";
import { VeoAdapter } from "./veo.js";

type AdapterFactory = () => ProviderAdapter;

const factories = new Map<ProviderName, AdapterFactory>([
  ["veo", () => new VeoAdapter() as unknown as ProviderAdapter],
  ["kling", () => new KlingAdapter() as unknown as ProviderAdapter],
  ["anthropic", () => new AnthropicAdapter() as unknown as ProviderAdapter],
] as Array<[ProviderName, AdapterFactory]>);

const instances = new Map<ProviderName, ProviderAdapter>();

export function getProvider(name: ProviderName): ProviderAdapter {
  const cached = instances.get(name);
  if (cached) return cached;

  const factory = factories.get(name);
  if (!factory) {
    throw new ProviderError(name, "UNKNOWN_PROVIDER", `No adapter registered for provider: ${name}`);
  }

  const adapter = factory();
  instances.set(name, adapter);
  return adapter;
}

export function listProviders(): ProviderName[] {
  return Array.from(factories.keys());
}

export function isValidProvider(name: string): name is ProviderName {
  return factories.has(name as ProviderName);
}
