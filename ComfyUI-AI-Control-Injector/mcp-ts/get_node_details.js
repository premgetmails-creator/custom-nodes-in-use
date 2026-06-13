import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function getNodeDetails() {
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
  
  const nodeId = 19;
  
  const widgetsResult = await client.callTool({
    name: "comfy_get_node_widgets",
    arguments: { args: [nodeId] },
  });
  console.log("Widgets:", JSON.stringify(JSON.parse(widgetsResult.content[0].text), null, 2));

  const socketsResult = await client.callTool({
    name: "comfy_get_node_sockets",
    arguments: { args: [nodeId] },
  });
  console.log("Sockets:", JSON.stringify(JSON.parse(socketsResult.content[0].text), null, 2));
  
  await client.close();
}

getNodeDetails().catch(console.error);
