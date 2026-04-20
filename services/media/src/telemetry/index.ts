/**
 * OpenTelemetry setup for media service.
 */
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { config } from "../config.js";

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  if (sdk) return;

  const exporter = new OTLPTraceExporter({
    url: config.OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: config.OTEL_SERVICE_NAME,
    }),
    traceExporter: exporter,
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  });

  sdk.start();
  console.log(`[telemetry] OTel initialized → ${config.OTEL_EXPORTER_OTLP_ENDPOINT}`);
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
