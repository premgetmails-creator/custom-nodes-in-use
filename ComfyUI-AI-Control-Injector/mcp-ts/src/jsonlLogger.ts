import { mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type JsonlLoggerOptions = {
  path?: string;
};

export class JsonlLogger {
  private readonly path: string;

  constructor(options: JsonlLoggerOptions = {}) {
    this.path = resolve(
      options.path ??
        process.env.COMFYAI_MCP_ACTION_LOG ??
        "/Users/krishna/Desktop/ComfyAI/logs/comfyai_mcp_actions.jsonl"
    );
  }

  async write(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8");
  }
}
