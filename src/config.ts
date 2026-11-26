/**
 * Deployment constants for the Chrome extension.
 *
 * Keep endpoint values here; the extension build must not depend on constants
 * owned by the web application.
 */
export const APP_CONFIG = {
  /** Prompt-AI.ART API origin. */
  apiBase: "https://prompt-ai.art",
  /** Prompt-AI.ART website origin. */
  webBase: "https://prompt-ai.art",
  /** Maximum number of tags accepted by the collector. */
  maxTags: 10,
  /** Maximum number of tags requested from the cloud tag proxy. */
  cloudTagLimit: 500,
  /** Fallback cloud tag limit for older API deployments. */
  cloudTagFallbackLimit: 200,
  /** Reverse job polling interval. */
  reversePollMs: 1_500,
  /** Reverse job timeout. */
  reverseTimeoutMs: 5 * 60_000,
} as const;
