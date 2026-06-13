import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function replaceNode() {
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
  
  // 1. Create KSampler node
  const createResult = await client.callTool({
    name: "comfy_create_node",
    arguments: {
      args: [{
        type: "KSampler",
        title: "KSampler",
        position: [670, 80],
        widgets: {
          seed: 501566801615976,
          steps: 20,
          cfg: 7,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1
        }
      }]
    },
  });
  const newNodeId = JSON.parse(createResult.content[0].text).data.node_id;
  console.log("Created KSampler node:", newNodeId);
  
  // 2. Connect inputs
  // Need to connect model, positive, negative, latent.
  // 3. Delete old node 19.
  // I should stop here and perform connections/deletion.

  await client.close();
}

replaceNode().catch(console.error);
