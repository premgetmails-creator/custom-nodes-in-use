# ComfyAI TypeScript MCP Bridge

This is the planned AI-facing MCP layer for ComfyAI.

It stays thin:

```text
MCP tool
-> BrowserBridge
-> page.evaluate(...)
-> window.comfyAI
-> live ComfyUI graph
```

The browser core remains the source of truth. This package should not duplicate
graph traversal, socket compatibility, workflow building, or queue logic.

## Why TypeScript Here

The live control surface is the browser, and Playwright/Puppeteer are strongest
in the JavaScript/TypeScript ecosystem. Python remains useful for backend/local
helpers, but this MCP layer is browser-centered.

## Current Status

The TypeScript MCP bridge is now buildable and can reach the live ComfyUI page
through Playwright.

Two browser connection modes are supported:

```text
Default mode:
  Launch a Playwright-controlled browser and open COMFYAI_TARGET_URL.

CDP attach mode:
  Attach to an already-open Chrome debugging session through COMFYAI_CDP_URL.
```

CDP attach mode is useful for the user's preferred workflow: ComfyUI is already
open in Chrome, and the AI/MCP bridge connects to that exact tab instead of
opening a new page or refreshing the UI.

Example environment:

```text
COMFYAI_TARGET_URL=http://localhost:8188
COMFYAI_CDP_URL=http://127.0.0.1:9222
```

The bridge waits until `window.comfyAI` exists before serving tool calls.

## Startup Node Knowledge Refresh

On startup, the MCP server does a small non-blocking refresh of ComfyUI's live
node knowledge:

```text
GET COMFYAI_TARGET_URL/object_info
-> compact class/display/category/input/output cache
-> diff against previous cache
-> report added/removed/changed node classes
```

This is intentionally lightweight. It does not rebuild the full custom-node
knowledge base. It only keeps Codex aware of the currently loaded node classes
after ComfyUI finishes its own registry/node startup work.

Cache file:

```text
/Users/krishna/Desktop/ComfyAI/logs/comfyai_node_knowledge_cache.json
```

Override with:

```text
COMFYAI_NODE_KNOWLEDGE_CACHE=/path/to/cache.json
```

Disable startup refresh with:

```text
COMFYAI_DISABLE_STARTUP_NODE_REFRESH=1
```

Manual tools:

```text
node_knowledge_status
node_knowledge_refresh
node_knowledge_search
```

If ComfyUI is still printing registry/startup progress, call
`node_knowledge_refresh` after startup settles.

## AI Agent MCP Configuration

Use this server command for agents that accept MCP stdio servers:

```json
{
  "mcpServers": {
    "comfyui-ai-control": {
      "command": "node",
      "args": [
        "/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector/mcp-ts/dist/server.js"
      ],
      "env": {
        "COMFYAI_TARGET_URL": "http://localhost:8188",
        "COMFYAI_CDP_URL": "http://127.0.0.1:9222",
        "COMFYAI_MCP_ACTION_LOG": "/Users/krishna/Desktop/ComfyAI/logs/comfyai_mcp_actions.jsonl"
      }
    }
  }
}
```

Before using that config:

```text
1. Build once with npm run build inside mcp-ts.
2. Start ComfyUI from active, not base.
3. Open ComfyUI in the Chrome instance that has remote debugging enabled.
4. Call browser_health_check from the AI agent before making graph edits.
```

The first expected proof from a real AI agent is:

```text
browser_health_check
comfy_ping
comfy_get_graph_info
browser_take_viewport_screenshot
```

If all four work, the AI can reach the visible ComfyUI tab, inspect the graph,
and receive image evidence from the browser viewport.

## Lean Artifact-Troubleshooting Loop

For the near-term Codex operator workflow, keep the loop small:

```text
1. browser_health_check
2. comfy_get_workflow
3. comfy_list_nodes
4. comfy_get_connection_map
5. comfy_get_node_widgets for suspicious nodes
6. comfy_get_node_sockets for suspicious nodes
7. media_list_output_files
8. media_extract_video_frames on the latest output video
9. Diagnose visible artifact against graph/settings/model evidence
10. Use comfy_set_widget_value, comfy_connect_nodes, comfy_create_node, or
    other existing graph tools for the smallest safe fix
11. Record the attempt with comfy_record_attempt
```

This is intentionally lean. The first goal is not full autonomy; it is for the
AI to understand the already-open workflow, inspect output evidence, identify
likely causes, and make targeted graph or setting changes.

When creating or moving nodes, follow the project canvas policy in:

```text
/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector/AI_LAYOUT_POLICY.md
```

The short version is one-directional left to right:

```text
Inputs / Models -> Preprocess -> Conditioning -> Sampling -> Decode -> Output
```

Use symmetric lanes around convergence nodes such as samplers, and keep note
nodes below the main graph. Do not create above/below semantic branches by
default. When it improves readability, preserve or use modular set/get blocks so
the graph does not need long splines from the far-left side to the far-right
side.

Set the output folder if needed:

```text
COMFYAI_OUTPUT_DIR=/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/output
```

## Future Browser Actions

The bridge should support both structured calls and browser-native fallback:

```text
evaluate window.comfyAI commands
hard refresh with Command+Shift+R
clear selected nodes with Command+A and Backspace
click/type/drag when no direct API exists
take screenshots for visual verification
```

Prefer `window.comfyAI` APIs when available because they are structured,
validated, and undo-aware.

## Visual Inspection

`browser_take_viewport_screenshot` captures the currently visible ComfyUI
viewport and returns both:

```text
1. JSON metadata with the temporary PNG path and byte size.
2. MCP image content as image/png base64.
```

Important limitation:

```text
ComfyUI uses an infinite canvas. A viewport screenshot is what the AI/human can
currently see, not a complete screenshot of every node in the workflow.
```

For full graph understanding, combine screenshots with structured graph tools
such as `comfy_get_nodes`, `comfy_get_connection_map`, and
`comfy_get_graph_info`.

## Persistent Action Log

Every MCP tool call is intended to append a JSONL entry to:

```text
/Users/krishna/Desktop/ComfyAI/logs/comfyai_mcp_actions.jsonl
```

Override with:

```text
COMFYAI_MCP_ACTION_LOG=/path/to/actions.jsonl
```

This file is for the detailed replay/debug trail. Canvas notes should stay
short and human-readable.
