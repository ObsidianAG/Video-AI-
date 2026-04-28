export type DomainErrorCode =
  | 'PROMPT_INVALID'
  | 'SAFETY_BLOCK'
  | 'CREDIT_INSUFFICIENT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_REPLAY'
  | 'STORAGE_UPLOAD_FAILED'
  | 'STORAGE_VERIFY_FAILED'
  | 'ARTIFACT_HASH_MISMATCH'
  | 'ARTIFACT_NOT_FOUND'
  | 'AUDIT_WRITE_FAILED'
  | 'STATE_TRANSITION_INVALID'
  | 'INTERNAL';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly retryable: boolean;
  public override readonly cause?: unknown;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      cause?: unknown;
      details?: Readonly<Record<string, unknown>>;
    } = {},
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.cause !== undefined) this.cause = options.cause;
    if (options.details !== undefined) this.details = options.details;
  }
}
