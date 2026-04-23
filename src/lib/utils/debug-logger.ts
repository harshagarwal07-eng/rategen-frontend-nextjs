/**
 * Debug Logger Utility
 *
 * Provides conditional logging that only outputs in development mode.
 * This prevents console pollution in production while preserving
 * useful debug information during development.
 */

const IS_DEV = process.env.NODE_ENV === "development";

type LogLevel = "log" | "warn" | "error" | "info" | "debug";

interface DebugLogger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Creates a namespaced debug logger
 * @param namespace - The namespace/prefix for log messages (e.g., "[Hook]", "[API]")
 * @returns Logger object with conditional logging methods
 */
export function createDebugLogger(namespace: string): DebugLogger {
  const createLogFn =
    (level: LogLevel) =>
    (...args: unknown[]): void => {
      if (IS_DEV) {
        console[level](namespace, ...args);
      }
    };

  return {
    log: createLogFn("log"),
    warn: createLogFn("warn"),
    error: createLogFn("error"),
    info: createLogFn("info"),
    debug: createLogFn("debug"),
  };
}

/**
 * Global debug flag - can be set at runtime for debugging production issues
 * Usage: window.__RATEGEN_DEBUG__ = true
 */
declare global {
  interface Window {
    __RATEGEN_DEBUG__?: boolean;
  }
}

/**
 * Check if debug mode is enabled (dev mode or runtime flag)
 */
export function isDebugEnabled(): boolean {
  if (typeof window !== "undefined" && window.__RATEGEN_DEBUG__) {
    return true;
  }
  return IS_DEV;
}

/**
 * Conditional log that respects both dev mode and runtime debug flag
 */
export function debugLog(namespace: string, ...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log(namespace, ...args);
  }
}

/**
 * Always log errors (even in production) but with optional stack trace in dev
 */
export function logError(namespace: string, message: string, error?: unknown): void {
  console.error(namespace, message);
  if (IS_DEV && error) {
    console.error(error);
  }
}
