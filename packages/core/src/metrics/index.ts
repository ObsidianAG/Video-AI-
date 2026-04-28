import { Counter, Gauge, Histogram, Registry, type RegistryContentType } from 'prom-client';

export const METRIC_PREFIX = 'text_to_video_';

export const METRIC_NAMES = {
  jobsTotal: `${METRIC_PREFIX}jobs_total`,
  jobStateTransitionsTotal: `${METRIC_PREFIX}job_state_transitions_total`,
  providerLatencySeconds: `${METRIC_PREFIX}provider_latency_seconds`,
  providerErrorsTotal: `${METRIC_PREFIX}provider_errors_total`,
  webhookSignatureFailuresTotal: `${METRIC_PREFIX}webhook_signature_failures_total`,
  artifactDownloadSeconds: `${METRIC_PREFIX}artifact_download_seconds`,
  artifactVerifyTotal: `${METRIC_PREFIX}artifact_verify_total`,
  artifactVerifySeconds: `${METRIC_PREFIX}artifact_verify_seconds`,
  queueDepth: `${METRIC_PREFIX}queue_depth`,
  workerActiveJobs: `${METRIC_PREFIX}worker_active_jobs`,
  creditDebitsTotal: `${METRIC_PREFIX}credit_debits_total`,
  storageUploadSeconds: `${METRIC_PREFIX}storage_upload_seconds`,
  storageErrorsTotal: `${METRIC_PREFIX}storage_errors_total`,
  auditWriteFailuresTotal: `${METRIC_PREFIX}audit_write_failures_total`,
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

const LATENCY_BUCKETS_SECONDS = [
  0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600, 1800,
];

export interface VideoMetrics {
  readonly jobsTotal: Counter<'state' | 'provider_label'>;
  readonly jobStateTransitionsTotal: Counter<'from' | 'to' | 'reason'>;
  readonly providerLatencySeconds: Histogram<'provider_label' | 'provider_model_id' | 'operation'>;
  readonly providerErrorsTotal: Counter<'provider_label' | 'code'>;
  readonly webhookSignatureFailuresTotal: Counter<'provider_label'>;
  readonly artifactDownloadSeconds: Histogram<'provider_label'>;
  readonly artifactVerifyTotal: Counter<'result'>;
  readonly artifactVerifySeconds: Histogram<never>;
  readonly queueDepth: Gauge<'queue'>;
  readonly workerActiveJobs: Gauge<'queue'>;
  readonly creditDebitsTotal: Counter<'reason'>;
  readonly storageUploadSeconds: Histogram<'storage_provider'>;
  readonly storageErrorsTotal: Counter<'storage_provider' | 'code'>;
  readonly auditWriteFailuresTotal: Counter<'reason'>;
}

export const registerVideoMetrics = (registry: Registry): VideoMetrics => {
  return {
    jobsTotal: new Counter({
      name: METRIC_NAMES.jobsTotal,
      help: 'Total video jobs by terminal/active state and provider label.',
      labelNames: ['state', 'provider_label'],
      registers: [registry],
    }),
    jobStateTransitionsTotal: new Counter({
      name: METRIC_NAMES.jobStateTransitionsTotal,
      help: 'Count of state machine transitions for video jobs.',
      labelNames: ['from', 'to', 'reason'],
      registers: [registry],
    }),
    providerLatencySeconds: new Histogram({
      name: METRIC_NAMES.providerLatencySeconds,
      help: 'Provider API latency in seconds.',
      labelNames: ['provider_label', 'provider_model_id', 'operation'],
      buckets: LATENCY_BUCKETS_SECONDS,
      registers: [registry],
    }),
    providerErrorsTotal: new Counter({
      name: METRIC_NAMES.providerErrorsTotal,
      help: 'Provider error count by label and DomainErrorCode.',
      labelNames: ['provider_label', 'code'],
      registers: [registry],
    }),
    webhookSignatureFailuresTotal: new Counter({
      name: METRIC_NAMES.webhookSignatureFailuresTotal,
      help: 'Webhook signature verification failures.',
      labelNames: ['provider_label'],
      registers: [registry],
    }),
    artifactDownloadSeconds: new Histogram({
      name: METRIC_NAMES.artifactDownloadSeconds,
      help: 'Artifact download time in seconds.',
      labelNames: ['provider_label'],
      buckets: LATENCY_BUCKETS_SECONDS,
      registers: [registry],
    }),
    artifactVerifyTotal: new Counter({
      name: METRIC_NAMES.artifactVerifyTotal,
      help: 'Artifact verification outcomes.',
      labelNames: ['result'],
      registers: [registry],
    }),
    artifactVerifySeconds: new Histogram({
      name: METRIC_NAMES.artifactVerifySeconds,
      help: 'Artifact verification duration in seconds.',
      buckets: LATENCY_BUCKETS_SECONDS,
      registers: [registry],
    }),
    queueDepth: new Gauge({
      name: METRIC_NAMES.queueDepth,
      help: 'Current queue depth per queue name.',
      labelNames: ['queue'],
      registers: [registry],
    }),
    workerActiveJobs: new Gauge({
      name: METRIC_NAMES.workerActiveJobs,
      help: 'Active jobs being processed per queue.',
      labelNames: ['queue'],
      registers: [registry],
    }),
    creditDebitsTotal: new Counter({
      name: METRIC_NAMES.creditDebitsTotal,
      help: 'Total credit debits, labelled by reason.',
      labelNames: ['reason'],
      registers: [registry],
    }),
    storageUploadSeconds: new Histogram({
      name: METRIC_NAMES.storageUploadSeconds,
      help: 'Storage upload time in seconds.',
      labelNames: ['storage_provider'],
      buckets: LATENCY_BUCKETS_SECONDS,
      registers: [registry],
    }),
    storageErrorsTotal: new Counter({
      name: METRIC_NAMES.storageErrorsTotal,
      help: 'Storage error count.',
      labelNames: ['storage_provider', 'code'],
      registers: [registry],
    }),
    auditWriteFailuresTotal: new Counter({
      name: METRIC_NAMES.auditWriteFailuresTotal,
      help: 'Audit log write failures by reason.',
      labelNames: ['reason'],
      registers: [registry],
    }),
  };
};

export interface MetricsExporter {
  contentType: RegistryContentType;
  export(): Promise<string>;
}

export const buildExporter = (registry: Registry): MetricsExporter => ({
  contentType: registry.contentType,
  export: () => registry.metrics(),
});

/**
 * Sample PromQL queries.
 * Use the `_bucket` series with `histogram_quantile` for classic histograms:
 *
 *   histogram_quantile(
 *     0.95,
 *     sum by (le) (
 *       rate(text_to_video_provider_latency_seconds_bucket[5m])
 *     )
 *   )
 *
 *   histogram_quantile(
 *     0.99,
 *     sum by (le, provider_label) (
 *       rate(text_to_video_artifact_download_seconds_bucket[5m])
 *     )
 *   )
 *
 *   sum(rate(text_to_video_provider_errors_total[5m])) by (provider_label, code)
 *
 *   max by (queue) (text_to_video_queue_depth)
 */
export const PROM_EXAMPLES = Object.freeze({
  providerLatencyP95:
    'histogram_quantile(0.95, sum by (le) (rate(text_to_video_provider_latency_seconds_bucket[5m])))',
  artifactDownloadP99:
    'histogram_quantile(0.99, sum by (le, provider_label) (rate(text_to_video_artifact_download_seconds_bucket[5m])))',
  providerErrorRateByCode:
    'sum(rate(text_to_video_provider_errors_total[5m])) by (provider_label, code)',
  queueDepth: 'max by (queue) (text_to_video_queue_depth)',
});
