# ComfyAI Browser Control API Guide

This guide is written primarily for an AI model or agent that needs to control
the currently open ComfyUI workflow through the browser.

Manual DevTools usage is only a temporary development and testing method. The
real target user is an AI model that will call these commands through a bridge
such as MCP, Playwright, a browser extension, or a future WebSocket layer.

## Operating Rules

- Start every session with `window.comfyAI.ping()`.
- Inspect before editing.
- Prefer exact node IDs after calling `getNodes()`.
- Prefer socket names only after calling `getNodeSockets(nodeId)`.
- Validate before connecting sockets.
- Use `replaceExisting: true` only when intentionally replacing an occupied
  target input.
- Use `force: true` only for debugging known type mismatches.
- After every edit, call a read command to confirm the result.
- Branch on `ok`, `error.code`, and structured `data`, not on natural-language
  summaries.
- Treat every mutating command as an action that should be logged by the calling
  AI agent or MCP server.

## Basic Workflow

1. Check bridge health:

```js
window.comfyAI.ping()
window.comfyAIInjector.status()
```

2. List current nodes:

```js
window.comfyAI.getNodes()
```

3. Inspect one node:

```js
window.comfyAI.getNode(nodeId)
window.comfyAI.getNodeWidgets(nodeId)
window.comfyAI.getNodeSockets(nodeId)
```

4. Inspect current connections:

```js
window.comfyAI.getConnectionMap()
window.comfyAI.getConnectedNodes(nodeId)
window.comfyAI.traceUpstream(nodeId)
window.comfyAI.traceDownstream(nodeId)
```

5. Select and show nodes to the human:

```js
window.comfyAI.selectNode(nodeId)
window.comfyAI.selectNodes([nodeA, nodeB])
window.comfyAI.centerOnNode(nodeId)
```

6. Edit a widget value:

```js
window.comfyAI.setWidgetValue(nodeId, "widget_name", value)
```

7. Connect sockets:

```js
window.comfyAI.validateConnection({
  fromNodeId,
  fromOutput: "IMAGE",
  toNodeId,
  toInput: "images",
  replaceExisting: true
})

window.comfyAI.connectNodes({
  fromNodeId,
  fromOutput: "IMAGE",
  toNodeId,
  toInput: "images",
  replaceExisting: true
})
```

8. Disconnect sockets:

```js
window.comfyAI.disconnectInput(nodeId, "input_name")
window.comfyAI.disconnectOutput(nodeId, "output_name")
```

## Which Command Should An AI Use?

- Need the full current workflow JSON:
  `getWorkflow()`
- Need a compact list of nodes:
  `getNodes()`
- Need widgets/settings:
  `getNodeWidgets(nodeId)`
- Need input/output sockets:
  `getNodeSockets(nodeId)`
- Need current splines:
  `getConnectionMap()`
- Need parents or children:
  `getConnectedNodes(nodeId)`
- Need full data-flow direction:
  `traceUpstream(nodeId)` or `traceDownstream(nodeId)`
- Need to visibly point at a node:
  `selectNode(nodeId)`
- Need to change a setting:
  `setWidgetValue(nodeId, widget, value)`
- Need to connect two known sockets:
  `validateConnection(...)` then `connectNodes(...)`
- Need to connect two nodes by best type match:
  `autoConnectNodes(...)`
- Need to replace an occupied input:
  `replaceConnection(...)`
- Need installed backend node definitions:
  `await backend.getObjectInfo()`
- Need to compare open workflow nodes with installed backend definitions:
  `await backend.compareFrontendNodesWithObjectInfo()`

## Backend Awareness

The browser graph knows what is currently open and unsaved. The backend knows
what ComfyUI can execute.

Use these read-only backend helpers:

```js
await window.comfyAI.backend.getObjectInfo()
await window.comfyAI.backend.getQueue()
await window.comfyAI.backend.getHistory()
await window.comfyAI.backend.getSystemStats()
await window.comfyAI.backend.compareFrontendNodesWithObjectInfo()
await window.comfyAI.backend.getDropdownDiagnostics()
```

An AI should use backend data when it needs installed node schemas, available
node class definitions, queue state, history state, or server/device status.

Use `getDropdownDiagnostics()` when a workflow appears to reference a missing
checkpoint, VAE, LoRA, model, sampler, scheduler, or other dropdown-selected
resource. It compares current widget values with known dropdown options where
ComfyUI exposes them.

## Running Workflows

Queueing a workflow is a real execution action. An AI should inspect and prepare
before it queues:

```js
await window.comfyAI.backend.prepareCurrentPrompt()
await window.comfyAI.backend.queueCurrentWorkflow({ dryRun: true })
await window.comfyAI.backend.queueCurrentWorkflow()
```

After queueing, use the returned prompt ID:

```js
await window.comfyAI.backend.getHistoryForPrompt(promptId)
await window.comfyAI.backend.getQueue()
```

To stop a running workflow:

```js
await window.comfyAI.backend.interrupt()
```

## Response Shape

Every public command returns either:

```js
{
  ok: true,
  action: "commandName",
  summary: "Human-readable result",
  data: {},
  warnings: []
}
```

or:

```js
{
  ok: false,
  action: "commandName",
  error: {
    code: "ERROR_CODE",
    message: "What went wrong",
    details: {}
  },
  suggested_fix: "What to try next"
}
```

An AI should branch on `ok`, not on natural-language text.

## Built-In Self Documentation

An AI model can ask the bridge what it can do:

```js
window.comfyAI.help()
window.comfyAI.getCommandCatalog()
```

`help()` returns operating rules and a recommended workflow.

`getCommandCatalog()` returns command records with:

- command name
- category
- whether the command mutates the graph or canvas
- purpose
- when to use it
- example call
