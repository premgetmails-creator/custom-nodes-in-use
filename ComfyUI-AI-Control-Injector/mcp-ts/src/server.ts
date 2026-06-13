import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PlaywrightBridge } from "./playwrightBridge.js";
import { TOOL_CATALOG } from "./toolCatalog.js";
import { JsonlLogger } from "./jsonlLogger.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractVideoFrames, listOutputMedia } from "./mediaTools.js";
import { NodeKnowledgeCache } from "./nodeKnowledgeCache.js";

const bridge = new PlaywrightBridge();
console.error("SERVER ENV COMFYAI_CDP_URL:", process.env.COMFYAI_CDP_URL);
console.error("SERVER ENV COMFYAI_TARGET_URL:", process.env.COMFYAI_TARGET_URL);
const logger = new JsonlLogger();
const nodeKnowledge = new NodeKnowledgeCache();
nodeKnowledge.startupRefresh();

const server = new Server(
  {
    name: "comfyui-ai-control",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_CATALOG.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ?? {
      type: "object",
      properties: {
        args: {
          type: "array",
          description: tool.command
            ? `Arguments passed to window.comfyAI.${tool.command}(...args).`
            : "Arguments for the browser bridge action.",
          items: {},
        },
      },
    },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const spec = TOOL_CATALOG.find((tool) => tool.name === request.params.name);
  if (!spec) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = Array.isArray(request.params.arguments?.args) ? request.params.arguments.args : [];
  let result: unknown;

  if (spec.bridgeAction === "hardRefresh") {
    await bridge.hardRefresh();
    result = { ok: true, action: "browser_hard_refresh", summary: "Hard refresh shortcut sent to browser." };
  } else if (spec.bridgeAction === "pressShortcut") {
    const keys = Array.isArray(args[0]) ? args[0].map(String) : [];
    await bridge.pressShortcut(keys);
    result = { ok: true, action: "browser_press_shortcut", summary: `Pressed shortcut: ${keys.join("+")}`, data: { keys } };
  } else if (spec.bridgeAction === "viewportScreenshot") {
    const screenshot = await bridge.screenshot();
    const outputPath = path.join(os.tmpdir(), `comfyai_viewport_${Date.now()}.png`);
    fs.writeFileSync(outputPath, screenshot);
    result = {
      ok: true,
      action: "browser_take_viewport_screenshot",
      summary: "Captured current visible ComfyUI viewport.",
      data: {
        path: outputPath,
        size_bytes: screenshot.length,
        note: "ComfyUI uses an infinite canvas; this image is only the current viewport, not the full graph."
      }
    };
  } else if (spec.bridgeAction === "healthCheck") {
    result = await bridge.healthCheck();
  } else if (spec.bridgeAction === "listOutputMedia") {
    const options = args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] as { limit?: number; outputDir?: string } : {};
    result = listOutputMedia(options);
  } else if (spec.bridgeAction === "extractVideoFrames") {
    const options = args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] as { path?: string; count?: number } : {};
    const extraction = extractVideoFrames(options);
    result = extraction.result;
    await logger.write({
      tool: request.params.name,
      command: spec.command ?? null,
      bridgeAction: spec.bridgeAction ?? null,
      args,
      result,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
        ...extraction.framePaths.map((framePath) => ({
          type: "image" as const,
          data: fs.readFileSync(framePath).toString("base64"),
          mimeType: "image/png",
        })),
      ],
    };
  } else if (spec.bridgeAction === "nodeKnowledgeStatus") {
    result = nodeKnowledge.getStatus();
  } else if (spec.bridgeAction === "nodeKnowledgeRefresh") {
    const options = args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] as { reason?: string } : {};
    result = await nodeKnowledge.refresh(options);
  } else if (spec.bridgeAction === "nodeKnowledgeSearch") {
    result = nodeKnowledge.search(String(args[0] ?? ""), args[1] && typeof args[1] === "object" && !Array.isArray(args[1]) ? args[1] as { limit?: number } : {});
  } else if (spec.bridgeAction === "evaluateComfyAICommand") {
    const request = args[0] && typeof args[0] === "object" && !Array.isArray(args[0])
      ? args[0] as { command?: unknown; args?: unknown }
      : {};
    const command = typeof request.command === "string" ? request.command.trim() : "";
    const commandArgs = Array.isArray(request.args) ? request.args as any[] : [];
    const blockedPathParts = new Set(["__proto__", "prototype", "constructor"]);
    const pathParts = command.split(".");

    if (
      !command ||
      pathParts.some((part) => !part || blockedPathParts.has(part) || part.startsWith("_"))
    ) {
      result = {
        ok: false,
        action: "comfy_call_command",
        error: {
          code: "INVALID_COMFYAI_COMMAND_PATH",
          message: "Command must be a normal public window.comfyAI command path.",
          details: { command },
        },
        suggested_fix: "Use a named MCP tool when possible, or pass a public command such as getGraphInfo or backend.getQueue.",
      };
    } else {
      result = await bridge.evaluateComfyAI(command, commandArgs);
    }
  } else if (spec.command) {
    result = await bridge.evaluateComfyAI(spec.command, args);
  } else {
    throw new Error(`Tool has no command or bridge action: ${request.params.name}`);
  }

  await logger.write({
    tool: request.params.name,
    command: spec.command ?? null,
    bridgeAction: spec.bridgeAction ?? null,
    args,
    result,
  });

  if (spec.bridgeAction === "viewportScreenshot" && result && typeof result === "object") {
    const screenshotPath = (result as any)?.data?.path;
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
          {
            type: "image",
            data: fs.readFileSync(screenshotPath).toString("base64"),
            mimeType: "image/png",
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
