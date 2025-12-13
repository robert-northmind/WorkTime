import {
  initializeFaro,
  getWebInstrumentations,
  type Faro,
} from "@grafana/faro-web-sdk";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

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
