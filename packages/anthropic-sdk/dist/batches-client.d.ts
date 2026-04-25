import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { CircuitBreaker } from './circuit-breaker.js';
import { CircuitOpenError } from './circuit-breaker.js';
export declare const BatchResultSucceededSchema: z.ZodObject<{
    type: z.ZodLiteral<"succeeded">;
    message: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"message">;
        role: z.ZodLiteral<"assistant">;
        content: z.ZodArray<z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "text";
            text: string;
        }, {
            type: "text";
            text: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"tool_use">;
            id: z.ZodString;
            name: z.ZodString;
            input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        }, {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        }>]>, "many">;
        model: z.ZodString;
        stop_reason: z.ZodNullable<z.ZodString>;
        stop_sequence: z.ZodNullable<z.ZodString>;
        usage: z.ZodObject<{
            input_tokens: z.ZodNumber;
            output_tokens: z.ZodNumber;
            cache_read_input_tokens: z.ZodOptional<z.ZodNumber>;
            cache_creation_input_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        }, {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    }, {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    message: {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    };
    type: "succeeded";
}, {
    message: {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    };
    type: "succeeded";
}>;
export declare const BatchResultErroredSchema: z.ZodObject<{
    type: z.ZodLiteral<"errored">;
    error: z.ZodObject<{
        type: z.ZodString;
        error: z.ZodObject<{
            type: z.ZodString;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            message: string;
            type: string;
        }, {
            message: string;
            type: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        error: {
            message: string;
            type: string;
        };
    }, {
        type: string;
        error: {
            message: string;
            type: string;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    type: "errored";
    error: {
        type: string;
        error: {
            message: string;
            type: string;
        };
    };
}, {
    type: "errored";
    error: {
        type: string;
        error: {
            message: string;
            type: string;
        };
    };
}>;
export declare const BatchResultExpiredSchema: z.ZodObject<{
    type: z.ZodLiteral<"expired">;
}, "strip", z.ZodTypeAny, {
    type: "expired";
}, {
    type: "expired";
}>;
export declare const BatchResultCanceledSchema: z.ZodObject<{
    type: z.ZodLiteral<"canceled">;
}, "strip", z.ZodTypeAny, {
    type: "canceled";
}, {
    type: "canceled";
}>;
export declare const BatchResultSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"succeeded">;
    message: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"message">;
        role: z.ZodLiteral<"assistant">;
        content: z.ZodArray<z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "text";
            text: string;
        }, {
            type: "text";
            text: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"tool_use">;
            id: z.ZodString;
            name: z.ZodString;
            input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        }, {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        }>]>, "many">;
        model: z.ZodString;
        stop_reason: z.ZodNullable<z.ZodString>;
        stop_sequence: z.ZodNullable<z.ZodString>;
        usage: z.ZodObject<{
            input_tokens: z.ZodNumber;
            output_tokens: z.ZodNumber;
            cache_read_input_tokens: z.ZodOptional<z.ZodNumber>;
            cache_creation_input_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        }, {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    }, {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    message: {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    };
    type: "succeeded";
}, {
    message: {
        type: "message";
        id: string;
        role: "assistant";
        content: ({
            type: "text";
            text: string;
        } | {
            type: "tool_use";
            id: string;
            name: string;
            input: Record<string, unknown>;
        })[];
        model: string;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            output_tokens: number;
            cache_read_input_tokens?: number | undefined;
            cache_creation_input_tokens?: number | undefined;
        };
    };
    type: "succeeded";
}>, z.ZodObject<{
    type: z.ZodLiteral<"errored">;
    error: z.ZodObject<{
        type: z.ZodString;
        error: z.ZodObject<{
            type: z.ZodString;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            message: string;
            type: string;
        }, {
            message: string;
            type: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        error: {
            message: string;
            type: string;
        };
    }, {
        type: string;
        error: {
            message: string;
            type: string;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    type: "errored";
    error: {
        type: string;
        error: {
            message: string;
            type: string;
        };
    };
}, {
    type: "errored";
    error: {
        type: string;
        error: {
            message: string;
            type: string;
        };
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"expired">;
}, "strip", z.ZodTypeAny, {
    type: "expired";
}, {
    type: "expired";
}>, z.ZodObject<{
    type: z.ZodLiteral<"canceled">;
}, "strip", z.ZodTypeAny, {
    type: "canceled";
}, {
    type: "canceled";
}>]>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
export declare const BatchResultItemSchema: z.ZodObject<{
    custom_id: z.ZodString;
    result: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"succeeded">;
        message: z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"message">;
            role: z.ZodLiteral<"assistant">;
            content: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                type: z.ZodLiteral<"text">;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "text";
                text: string;
            }, {
                type: "text";
                text: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"tool_use">;
                id: z.ZodString;
                name: z.ZodString;
                input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            }, "strip", z.ZodTypeAny, {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            }, {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            }>]>, "many">;
            model: z.ZodString;
            stop_reason: z.ZodNullable<z.ZodString>;
            stop_sequence: z.ZodNullable<z.ZodString>;
            usage: z.ZodObject<{
                input_tokens: z.ZodNumber;
                output_tokens: z.ZodNumber;
                cache_read_input_tokens: z.ZodOptional<z.ZodNumber>;
                cache_creation_input_tokens: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            }, {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        }, {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        message: {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        };
        type: "succeeded";
    }, {
        message: {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        };
        type: "succeeded";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"errored">;
        error: z.ZodObject<{
            type: z.ZodString;
            error: z.ZodObject<{
                type: z.ZodString;
                message: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                message: string;
                type: string;
            }, {
                message: string;
                type: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            error: {
                message: string;
                type: string;
            };
        }, {
            type: string;
            error: {
                message: string;
                type: string;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "errored";
        error: {
            type: string;
            error: {
                message: string;
                type: string;
            };
        };
    }, {
        type: "errored";
        error: {
            type: string;
            error: {
                message: string;
                type: string;
            };
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"expired">;
    }, "strip", z.ZodTypeAny, {
        type: "expired";
    }, {
        type: "expired";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"canceled">;
    }, "strip", z.ZodTypeAny, {
        type: "canceled";
    }, {
        type: "canceled";
    }>]>;
}, "strip", z.ZodTypeAny, {
    custom_id: string;
    result: {
        message: {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        };
        type: "succeeded";
    } | {
        type: "errored";
        error: {
            type: string;
            error: {
                message: string;
                type: string;
            };
        };
    } | {
        type: "expired";
    } | {
        type: "canceled";
    };
}, {
    custom_id: string;
    result: {
        message: {
            type: "message";
            id: string;
            role: "assistant";
            content: ({
                type: "text";
                text: string;
            } | {
                type: "tool_use";
                id: string;
                name: string;
                input: Record<string, unknown>;
            })[];
            model: string;
            stop_reason: string | null;
            stop_sequence: string | null;
            usage: {
                input_tokens: number;
                output_tokens: number;
                cache_read_input_tokens?: number | undefined;
                cache_creation_input_tokens?: number | undefined;
            };
        };
        type: "succeeded";
    } | {
        type: "errored";
        error: {
            type: string;
            error: {
                message: string;
                type: string;
            };
        };
    } | {
        type: "expired";
    } | {
        type: "canceled";
    };
}>;
export type BatchResultItem = z.infer<typeof BatchResultItemSchema>;
/**
 * A single request within a batch (maps to one Anthropic message request).
 */
export interface BatchRequest {
    /** Caller-assigned identifier (must be unique within the batch). */
    custom_id: string;
    params: Anthropic.MessageCreateParamsNonStreaming;
}
export interface BatchesClientOptions {
    apiKey?: string;
    circuitBreaker?: CircuitBreaker;
    anthropicClient?: Anthropic;
    /**
     * Interval in milliseconds between polling attempts.
     * @default 5_000
     */
    pollIntervalMs?: number;
    /**
     * Maximum time in milliseconds to poll before timing out.
     * @default 3_600_000 (1 hour)
     */
    pollTimeoutMs?: number;
}
/**
 * Anthropic Message Batches client.
 *
 * Supports creating batches of up to 100,000 requests, polling until the
 * batch is complete, and processing results with Zod validation.
 */
export declare class BatchesClient {
    private readonly _client;
    private readonly _circuitBreaker;
    private readonly _pollIntervalMs;
    private readonly _pollTimeoutMs;
    /** Maximum requests per batch (Anthropic hard limit). */
    static readonly MAX_BATCH_SIZE = 100000;
    constructor(options?: BatchesClientOptions);
    /**
     * Create a new message batch.
     *
     * @param requests - Up to {@link BatchesClient.MAX_BATCH_SIZE} requests.
     * @throws {RangeError} when the request count exceeds the limit.
     */
    createBatch(requests: BatchRequest[]): Promise<Anthropic.Beta.Messages.BetaMessageBatch>;
    /**
     * Poll a batch until it reaches a terminal state (ended, errored, expired,
     * or canceled).
     *
     * @param batchId - The batch ID returned by {@link createBatch}.
     * @returns The completed batch object.
     * @throws {Error} if polling times out.
     */
    pollUntilComplete(batchId: string): Promise<Anthropic.Beta.Messages.BetaMessageBatch>;
    /**
     * Retrieve and Zod-validate all results for a completed batch.
     *
     * Results are streamed from the Anthropic API and validated one by one.
     * Invalid items are wrapped in a {@link BatchResultValidationError} and
     * collected; they do NOT stop processing.
     *
     * @returns An object with `valid` (validated items) and `errors` (items
     *   that failed Zod validation).
     */
    processResults(batchId: string): Promise<{
        valid: BatchResultItem[];
        errors: BatchResultValidationError[];
    }>;
    /**
     * Convenience method: create a batch, wait for it to complete, and return
     * validated results in one call.
     */
    createAndProcess(requests: BatchRequest[]): Promise<{
        batch: Anthropic.Beta.Messages.BetaMessageBatch;
        valid: BatchResultItem[];
        errors: BatchResultValidationError[];
    }>;
    private _isTerminal;
    private _sleep;
    private _extractStatus;
}
export declare class BatchResultValidationError extends Error {
    readonly name = "BatchResultValidationError";
    readonly raw: Record<string, unknown>;
    readonly zodError: z.ZodError;
    constructor(raw: Record<string, unknown>, zodError: z.ZodError);
}
export { CircuitOpenError };
//# sourceMappingURL=batches-client.d.ts.map