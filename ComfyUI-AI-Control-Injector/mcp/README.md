# ComfyAI MCP Bridge

This folder is the future AI-facing MCP layer.

The MCP server must remain a thin wrapper around the browser-installed
`window.comfyAI` API. It should not duplicate graph-control logic.

## Architecture

```text
AI Model
  -> MCP tool call
  -> MCP server
  -> BrowserBridge.evaluate_comfy_ai(...)
  -> window.comfyAI.<command>(...)
  -> live ComfyUI browser graph
```

## Responsibilities

MCP is responsible for:

- exposing AI-friendly tool names
- validating tool input shapes
- calling browser-side `window.comfyAI`
- returning structured results
- logging AI actions
- recovering when the browser bridge is unavailable

MCP is not responsible for:

- reimplementing graph traversal
- reimplementing widget editing
- reimplementing socket compatibility
- directly editing workflow JSON
- replacing `ai_core.js`

## Human Maintainer Notes

If a feature requires knowledge of the live graph, add it to `web/ai_core.js`
first. Then expose it here as a thin MCP wrapper.

If a feature requires browser-level control such as opening a tab, hard refresh,
screenshots, or fallback clicking, keep it in the browser bridge layer and do
not mix it into the reusable core.

## Current Status

This is a scaffold. It defines the bridge shape and the tool catalog, but the
actual browser automation backend still needs to be wired.

## Browser Backend Abstraction

MCP tools depend only on the `BrowserBridge` protocol in
`comfyai_mcp/browser_bridge.py`.

Concrete adapters live under `mcp/comfyai_mcp/adapters/`:

- `playwright_bridge.py`
- `puppeteer_bridge.py`

This keeps the provider switch easy. If Playwright is not ideal later, replace
the adapter with Puppeteer without changing MCP tool definitions.

## Python Package Naming

The top-level folder is named `mcp/` because that is the project layer. It is
not the implementation package.

The implementation package is:

```text
mcp/comfyai_mcp/
```

This avoids shadowing the official MCP SDK package, which also uses the Python
package name `mcp`.
