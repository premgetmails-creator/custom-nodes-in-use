import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function connectLatent() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector/mcp-ts/dist/server.js"],
    env: {
      ...process.env,
      COMFYAI_TARGET_URL: "http://localhost:8188",
      COMFYAI_CDP_URL: "http://127.0.0.1:9222",
    }
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  
  // Connect Node 20 (output 0: LATENT) to Node 6 (input 0: samples)
  await client.callTool({
    name: "comfy_connect_nodes",
    arguments: { args: [{ fromNodeId: 20, fromOutput: 0, toNodeId: 6, toInput: 0 }] },
  });
  console.log("Connected 20 to 6");
  
  await client.close();
}

connectLatent().catch(console.error);
