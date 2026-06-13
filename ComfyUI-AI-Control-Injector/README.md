# ComfyUI AI Control Injector

## AI Canvas Layout

Codex and future AI operators must keep workflows visually readable when adding
or editing nodes. The current lean rule is a one-directional left-to-right,
role-based layout:

```text
Inputs / Models -> Preprocess -> Conditioning -> Sampling -> Decode -> Output
```

See [AI_LAYOUT_POLICY.md](AI_LAYOUT_POLICY.md) for the required placement grid,
line-alignment rules, modular set/get guidance, and the future recursive graph
beautifier direction.

Local-first browser control layer for ComfyUI.

ComfyAI lets an AI model inspect and modify the currently open ComfyUI workflow
directly in the browser, without manual workflow JSON export/import.

## Key Docs

- `ARCHITECTURE.md` explains the modular layers.
- `CAPABILITIES.md` lists current commands and verification status.
- `AI_USAGE.md` explains how an AI model should operate the bridge.
- `AGENT_OPERATING_PROTOCOL.md` defines the autonomous AI operating loop and logging discipline.
- `mcp/README.md` explains the future MCP wrapper layer.

## Current Shape

```text
ComfyUI custom frontend extension
  -> web/ai_loader.js
  -> web/ai_core.js
  -> window.comfyAI

Future MCP bridge
  -> mcp/
  -> mcp-ts/
  -> BrowserBridge
  -> window.comfyAI
```

`mcp-ts/` is the TypeScript-first MCP scaffold for browser control. It is not
installed yet; it records the intended thin bridge shape around `window.comfyAI`.
