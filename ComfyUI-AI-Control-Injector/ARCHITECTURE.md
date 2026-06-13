# ComfyAI Architecture

ComfyAI is designed like a small graph of swappable parts. Each part has a
single responsibility, clear inputs, and clear outputs.

## Layer Map

```text
ComfyUI custom node package
  -> __init__.py
      exposes frontend web assets to ComfyUI

Browser loader
  -> web/ai_loader.js
      imports ComfyUI app
      imports ai_core.js
      installs/reinstalls the core
      exposes window.comfyAIInjector

Reusable browser core
  -> web/ai_core.js
      exposes window.comfyAI
      reads live graph
      edits widgets
      validates/connects/disconnects sockets
      calls backend read/queue APIs

MCP bridge
  -> mcp/
      exposes AI tool names
      validates tool inputs
      calls BrowserBridge
      never duplicates graph logic

Browser backend adapters
  -> mcp/comfyai_mcp/adapters/
      Playwright adapter
      Puppeteer adapter
      future browser/CDP/WebSocket adapters
```

The top-level `mcp/` folder is a project layer, not the Python implementation
package. The implementation package is named `comfyai_mcp` so it will not
shadow the official MCP SDK package named `mcp`.

## Core Design Rules

- Keep graph-control logic in `web/ai_core.js` or its future submodules.
- Keep environment-specific loading in `web/ai_loader.js`.
- Keep MCP as a thin wrapper around `window.comfyAI`.
- Keep browser automation libraries behind `BrowserBridge`.
- Every public command returns structured JSON.
- Every mutating command should have a read/validate command that can confirm it.
- Prefer adding a new small module over expanding a giant file forever.

## Current Modularity Status

The project is architecturally modular, but `web/ai_core.js` has grown large.
It currently holds many capability groups:

- response helpers
- normalizers
- graph reading
- widget reading/editing
- socket reading
- connection maps
- tracing
- canvas selection/navigation
- connection validation/editing
- backend reads
- workflow queue helpers
- AI command catalog

This was useful during rapid proof-building. Before the public/open-source
phase, it should be split into smaller browser modules.

## Future Core Module Split

Recommended future shape:

```text
web/core/
  response.js
  catalog.js
  graph_read.js
  widgets.js
  sockets.js
  connections.js
  canvas.js
  backend.js
  queue.js
  installer.js

web/ai_core.js
  imports modules
  assembles window.comfyAI
  preserves the public API
```

This split should be behavior-preserving. Public calls such as
`window.comfyAI.getNodes()` and `window.comfyAI.connectNodes(...)` should not
change.

## Mental Model For Contributors

Think of each file like a ComfyUI node:

- one purpose
- clear inputs
- clear outputs
- easy to unplug or replace
- no hidden dependency on unrelated behavior
