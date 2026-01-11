import {
  initializeFaro,
  getWebInstrumentations,
  type Faro,
} from "@grafana/faro-web-sdk";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";
import type { Span, Tracer } from "@opentelemetry/api";

let faro: Faro | null = null;

export interface FaroConfig {
  url: string;
  appName: string;
  appVersion?: string;
  environment?: string;
}

/**
 * Initialize Grafana Faro Web SDK for real user monitoring
 * @param config Configuration for Faro including collector URL and app metadata
 * @returns Initialized Faro instance
 */
export function initFaro(config: FaroConfig): Faro {
  if (faro) {
    console.warn("Faro is already initialized");
    return faro;
  }

  if (!config.url) {
    throw new Error("Faro collector URL is required");
  }

  faro = initializeFaro({
    url: config.url,
    app: {
      name: config.appName,
      version: config.appVersion || "0.0.0",
      environment: config.environment || "development",
    },
    instrumentations: [
      // Mandatory, omits default instrumentations otherwise.
      ...getWebInstrumentations(),
      // Tracing package to get end-to-end visibility for HTTP requests.
      new TracingInstrumentation(),
    ],
  });

  return faro;
}

/**
 * Get the initialized Faro instance
 * @returns Faro instance or null if not initialized
 */
export function getFaro(): Faro | null {
  return faro;
}

export interface FaroUser {
  id: string;
  email?: string;
  username?: string;
  attributes?: Record<string, string>;
}

/**
 * Set the current user for Faro telemetry
 * All subsequent events will be associated with this user
 * @param user User information to attach to telemetry
 */
export function setFaroUser(user: FaroUser): void {
  if (!faro) {
    return;
  }

  faro.api.setUser(user);
}

/**
 * Clear the current user from Faro telemetry
 * Call this when the user logs out
 */
export function clearFaroUser(): void {
  if (!faro) {
    return;
  }

  faro.api.resetUser();
}

/**
 * Check if Faro is initialized
 * @returns true if Faro is initialized, false otherwise
 */
export function isFaroInitialized(): boolean {
  return faro !== null;
}

/**
 * Start tracking a user action with Faro
 * @param name Name of the user action (e.g., 'entry-saved', 'entry-deleted')
 * @param attributes Optional attributes to attach to the user action
 */
export function trackUserAction(
  name: string,
  attributes?: Record<string, string>
): void {
  if (!faro) {
    return;
  }

  faro.api.startUserAction(name, attributes);
}

/**
 * Get a tracer for creating custom spans
 * @param name Tracer name (e.g., 'firestore', 'auth')
 * @returns Tracer instance or null if Faro is not initialized
 */
export function getTracer(name: string): Tracer | null {
  if (!faro) {
    return null;
  }

  const otel = faro.api.getOTEL();
  if (!otel) {
    return null;
  }

  return otel.trace.getTracer(name);
}

/**
 * Wrap an async operation with a traced span
 * @param tracerName Name of the tracer (e.g., 'firestore')
 * @param spanName Name of the span (e.g., 'saveEntry')
 * @param attributes Optional attributes to attach to the span
 * @param operation The async operation to trace
 * @returns The result of the operation
 */
export async function withTrace<T>(
  tracerName: string,
  spanName: string,
  attributes: Record<string, string>,
  operation: () => Promise<T>
): Promise<T> {
  const tracer = getTracer(tracerName);

  if (!tracer) {
    // Faro not initialized, just run the operation
    return operation();
  }

  const span: Span = tracer.startSpan(spanName);

  // Add attributes to span
  Object.entries(attributes).forEach(([key, value]) => {
    span.setAttribute(key, value);
  });

  try {
    const result = await operation();
    span.setStatus({ code: 0 }); // SpanStatusCode.OK
    return result;
  } catch (error) {
    span.setStatus({
      code: 2, // SpanStatusCode.ERROR
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    span.end();
  }
}
