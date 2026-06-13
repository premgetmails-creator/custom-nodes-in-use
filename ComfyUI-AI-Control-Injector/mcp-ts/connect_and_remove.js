import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function connectAndRemove() {
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
  
  const connections = [
    { fromNodeId: 1, fromOutput: 0, toNodeId: 20, toInput: 0 },
    { fromNodeId: 2, fromOutput: 0, toNodeId: 20, toInput: 1 },
    { fromNodeId: 3, fromOutput: 0, toNodeId: 20, toInput: 2 },
    { fromNodeId: 4, fromOutput: 0, toNodeId: 20, toInput: 3 },
    { fromNodeId: 20, fromOutput: 0, toNodeId: 6, toInput: 0 },
  ];

  for (const conn of connections) {
    await client.callTool({
      name: "comfy_connect_nodes",
      arguments: { args: [conn] },
    });
    console.log(`Connected ${conn.fromNodeId} to ${conn.toNodeId}`);
  }
  
  // Remove node 19
  await client.callTool({
    name: "comfy_remove_node",
    arguments: { args: [19] },
  });
  console.log("Removed node 19");
  
  await client.close();
}

connectAndRemove().catch(console.error);
