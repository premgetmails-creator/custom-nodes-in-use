export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ComfyAIResult = {
  ok: boolean;
  action: string;
  summary?: string;
  data?: JsonValue;
  warnings?: string[];
  error?: {
    code: string;
    message: string;
    details?: JsonValue;
  };
  suggested_fix?: string;
  needs_human_intervention?: boolean;
  requested_help?: string;
};

export type BrowserBridgeInfo = {
  name: string;
  connected: boolean;
  targetUrl: string;
  cdpUrl?: string;
};

export interface BrowserBridge {
  info(): BrowserBridgeInfo;
  connect(): Promise<void>;
  close(): Promise<void>;
  evaluateComfyAI(command: string, args?: JsonValue[]): Promise<ComfyAIResult>;
  hardRefresh(): Promise<void>;
  pressShortcut(keys: string[]): Promise<void>;
  screenshot(): Promise<Uint8Array>;
  healthCheck(): Promise<ComfyAIResult>;
}

export function ensureComfyAIResult(value: unknown, action: string): ComfyAIResult {
  if (value && typeof value === "object" && "ok" in value && "action" in value) {
    return value as ComfyAIResult;
  }

  return {
    ok: false,
    action,
    error: {
      code: "INVALID_COMFYAI_RESULT",
      message: "window.comfyAI returned an unexpected result shape.",
      details: { value: value as JsonValue },
    },
    suggested_fix: "Verify the browser page is loaded and window.comfyAI is installed.",
  };
}
