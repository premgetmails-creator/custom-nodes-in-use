import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function listNodes() {
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
  
  const nodesResult = await client.callTool({
    name: "comfy_list_nodes",
    arguments: { args: [] },
  });

  const nodes = JSON.parse(nodesResult.content[0].text).data.nodes;
  
  nodes.forEach(node => {
      console.log(`ID: ${node.id}, Type: ${node.type}, Title: ${node.title}`);
  });
  
  await client.close();
}

listNodes().catch(console.error);
