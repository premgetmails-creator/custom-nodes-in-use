import { chromium, type Browser, type Page } from "playwright";
import { ensureComfyAIResult, type BrowserBridge, type BrowserBridgeInfo, type ComfyAIResult, type JsonValue } from "./browserBridge.js";

export type PlaywrightBridgeOptions = {
  targetUrl?: string;
  cdpUrl?: string;
};

export class PlaywrightBridge implements BrowserBridge {
  private readonly targetUrl: string;
  private readonly cdpUrl?: string;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(options: PlaywrightBridgeOptions = {}) {
    this.targetUrl = options.targetUrl ?? process.env.COMFYAI_TARGET_URL ?? "http://localhost:8188";
    this.cdpUrl = options.cdpUrl ?? process.env.COMFYAI_CDP_URL;
  }

  info(): BrowserBridgeInfo {
    return {
      name: "playwright",
      connected: Boolean(this.page),
      targetUrl: this.targetUrl,
      cdpUrl: this.cdpUrl,
    };
  }

  async connect(): Promise<void> {
    if (this.page) return;

    if (this.cdpUrl) {
      try {
        this.browser = await chromium.connectOverCDP(this.cdpUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not connect to Chrome CDP at ${this.cdpUrl}. Start Chrome with remote debugging enabled, then retry. Original error: ${message}`
        );
      }
      const context = this.browser.contexts()[0];
      this.page = context.pages().find((p) => p.url().includes(this.targetUrl.replace(/^https?:\/\//, ""))) ?? null;
      if (!this.page) {
        throw new Error(`No existing ComfyUI tab found for ${this.targetUrl}. Open it first in the CDP Chrome window.`);
      }
    } else {
      this.browser = await chromium.launch({ headless: false });
      this.page = await this.browser.newPage();
      await this.page.goto(this.targetUrl, { waitUntil: "domcontentloaded" });
    }

    await this.page.waitForFunction(() => Boolean((globalThis.window as any)?.comfyAI), null, { timeout: 30000 });
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  async evaluateComfyAI(command: string, args: JsonValue[] = []): Promise<ComfyAIResult> {
    await this.connect();
    const page = this.requirePage();
    const value = await (page as any).evaluate(
      (payload: any) => {
        const { commandName, commandArgs } = payload;
        const api = (globalThis.window as any)?.comfyAI;
        const path = commandName.split(".");
        let fnParent = api;
        for (const part of path.slice(0, -1)) fnParent = fnParent?.[part];
        const fn = fnParent?.[path[path.length - 1]];
        if (typeof fn !== "function") {
          return {
            ok: false,
            action: commandName,
            error: {
              code: "COMFYAI_COMMAND_NOT_FOUND",
              message: `window.comfyAI command not found: ${commandName}`,
              details: { commandName },
            },
            suggested_fix: "Call window.comfyAI.getCommandCatalog() to see available commands.",
          };
        }
        return fn(...commandArgs);
      },
      { commandName: command, commandArgs: args }
    );

    return ensureComfyAIResult(value, command);
  }

  async hardRefresh(): Promise<void> {
    await this.connect();
    await this.requirePage().keyboard.press(process.platform === "darwin" ? "Meta+Shift+R" : "Control+Shift+R");
  }

  async pressShortcut(keys: string[]): Promise<void> {
    await this.connect();
    await this.requirePage().keyboard.press(keys.join("+"));
  }

  async screenshot(): Promise<Uint8Array> {
    await this.connect();
    return this.requirePage().screenshot({ fullPage: false });
  }

  async healthCheck(): Promise<ComfyAIResult> {
    const startedAt = new Date().toISOString();
    try {
      await this.connect();
      const ping = await this.evaluateComfyAI("ping", []);
      const graph = await this.evaluateComfyAI("getGraphInfo", []);
      return {
        ok: Boolean(ping.ok && graph.ok),
        action: "browser.healthCheck",
        summary: "Checked MCP browser bridge, ComfyAI core, and live graph readiness.",
        data: {
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          bridge: this.info() as unknown as JsonValue,
          ping: ping as unknown as JsonValue,
          graph: graph as unknown as JsonValue,
          screenshot_ready: true,
        },
        warnings: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        action: "browser.healthCheck",
        summary: "MCP browser bridge health check failed.",
        data: {
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          bridge: this.info() as unknown as JsonValue,
        },
        error: {
          code: "BROWSER_HEALTH_CHECK_FAILED",
          message,
          details: {
            target_url: this.targetUrl,
            cdp_url: this.cdpUrl ?? null,
          },
        },
        suggested_fix: this.cdpUrl
          ? "Confirm Chrome was started with --remote-debugging-port=9222 and has the ComfyUI tab open."
          : "Confirm ComfyUI is running, then retry or set COMFYAI_CDP_URL to attach to an existing Chrome tab.",
      };
    }
  }

  private requirePage(): Page {
    if (!this.page) throw new Error("Playwright page is not connected.");
    return this.page;
  }
}
