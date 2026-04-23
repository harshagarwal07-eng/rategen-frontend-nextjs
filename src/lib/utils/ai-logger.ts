/**
 * AI Agent Logger
 *
 * Logs all AI agent activity to a file for debugging.
 * File is cleared on each app restart.
 * ONLY ACTIVE IN DEVELOPMENT MODE (NODE_ENV !== "production")
 *
 * Usage:
 *   import { aiLog } from "@/lib/utils/ai-logger";
 *   aiLog("[ComboAgent]", "Found 3 combos", { combo_ids: [...] });
 */

import * as fs from "fs";
import * as path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "ai-agent.log");

// Check if we're in development mode
const IS_DEV = process.env.NODE_ENV !== "production";

// Track if we've cleared the log this session
let logCleared = false;

/**
 * Ensure logs directory exists and clear log file on first call
 */
function ensureLogFile() {
  // Skip in production
  if (!IS_DEV) return;

  const logsDir = path.dirname(LOG_FILE);

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Clear log file on first call (app restart)
  if (!logCleared) {
    const timestamp = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, `=== AI Agent Log Started: ${timestamp} ===\n\n`);
    logCleared = true;
  }
}

/**
 * Format a value for logging
 */
function formatValue(value: any): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Log a message to the AI agent log file
 * Only logs in development mode (NODE_ENV !== "production")
 *
 * @param prefix - Log prefix like "[ComboAgent]" or "[BusinessRules]"
 * @param message - Main log message
 * @param data - Optional data to log (will be JSON stringified)
 */
export function aiLog(prefix: string, message: string, data?: any) {
  // Skip in production
  if (!IS_DEV) return;

  try {
    ensureLogFile();

    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] ${prefix} ${message}`;

    if (data !== undefined) {
      logLine += `\n${formatValue(data)}`;
    }

    logLine += "\n\n";

    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    // Silently fail - don't break the app for logging issues
    console.error("[AI Logger] Failed to write log:", error);
  }
}

/**
 * Log a separator line for better readability
 * Only logs in development mode (NODE_ENV !== "production")
 */
export function aiLogSeparator(title?: string) {
  // Skip in production
  if (!IS_DEV) return;

  try {
    ensureLogFile();

    const timestamp = new Date().toISOString();
    const separator = "=".repeat(60);
    let logLine = `\n${separator}\n`;

    if (title) {
      logLine += `[${timestamp}] ${title}\n`;
    }

    logLine += `${separator}\n\n`;

    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    console.error("[AI Logger] Failed to write separator:", error);
  }
}

/**
 * Get the log file path (for reading)
 */
export function getLogFilePath(): string {
  return LOG_FILE;
}
