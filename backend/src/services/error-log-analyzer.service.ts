import type { Request } from "express";
import type {
  ErrorLogClient,
  ErrorLogClientOptions,
  ErrorLogResult,
} from "error-log-analyzer-js-sdk";

type ErrorLogSdkModule = typeof import("error-log-analyzer-js-sdk");

type ImportErrorLogSdk = (specifier: string) => Promise<ErrorLogSdkModule>;

const importErrorLogSdk = new Function(
  "specifier",
  "return import(specifier)",
) as ImportErrorLogSdk;

interface CaptureBackendErrorContext {
  source?: string;
  statusCode?: number;
  request?: Request;
  job?: {
    id?: string | number | null;
    name?: string;
    attemptsMade?: number;
    attempts?: number;
    queueName?: string;
  };
  metadata?: Record<string, unknown>;
}

let clientPromise: Promise<ErrorLogClient | null> | null = null;
let processHandlersInstalled = false;

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getClient(): Promise<ErrorLogClient | null> {
  const apiKey = process.env.ERROR_LOG_API_KEY;
  if (!apiKey) return null;

  clientPromise ??= importErrorLogSdk("error-log-analyzer-js-sdk").then(
    ({ ErrorLogClient: ErrorLogAnalyzerClient }) => {
      const options: ErrorLogClientOptions = {
        apiKey,
        endpoint:
          process.env.ERROR_LOG_ENDPOINT ?? "http://127.0.0.1:8000/errors",
        timeoutMs: numberFromEnv(process.env.ERROR_LOG_TIMEOUT_MS, 5000),
        retries: numberFromEnv(process.env.ERROR_LOG_RETRIES, 2),
        retryDelayMs: numberFromEnv(
          process.env.ERROR_LOG_RETRY_DELAY_MS,
          500,
        ),
        throwOnFailure: false,
      };

      return new ErrorLogAnalyzerClient(options);
    },
  );

  return clientPromise;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  let message: string;
  try {
    message =
      typeof error === "string"
        ? error
        : JSON.stringify(error, null, 2) ?? String(error);
  } catch {
    message = String(error);
  }

  return {
    name: typeof error,
    message,
  };
}

function requestMetadata(req: Request) {
  return {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
  };
}

function buildPayload(error: unknown, context: CaptureBackendErrorContext) {
  return {
    timestamp: new Date().toISOString(),
    service: "backend-node",
    environment: process.env.NODE_ENV ?? "development",
    source: context.source ?? "backend-node",
    statusCode: context.statusCode,
    request: context.request ? requestMetadata(context.request) : undefined,
    job: context.job,
    metadata: context.metadata,
    error: serializeError(error),
  };
}

export async function captureBackendError(
  error: unknown,
  context: CaptureBackendErrorContext = {},
): Promise<ErrorLogResult | null> {
  const client = await getClient();
  if (!client) return null;

  return client.capture(buildPayload(error, context), {
    source: context.source ?? "backend-node",
  });
}

export function reportBackendError(
  error: unknown,
  context: CaptureBackendErrorContext = {},
): void {
  void captureBackendError(error, context).catch((captureError) => {
    console.error(
      "[error-log-analyzer] failed to capture backend error",
      captureError,
    );
  });
}

export function installProcessErrorLogAnalyzer(source = "backend-node"): void {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;

  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandled rejection", reason);
    reportBackendError(reason, { source: `${source}:unhandledRejection` });
  });

  process.on("uncaughtExceptionMonitor", (error) => {
    reportBackendError(error, { source: `${source}:uncaughtException` });
  });
}

export async function shutdownErrorLogAnalyzer(): Promise<void> {
  const client = clientPromise ? await clientPromise : null;
  if (!client) return;

  await client.flush();
  client.shutdown();
}
