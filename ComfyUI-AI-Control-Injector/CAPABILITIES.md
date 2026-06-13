# Capability Catalog

This file is a README-ready catalog of what ComfyAI can do. It is written for
both AI models and human developers.

## Health and Discovery

### `window.comfyAI.ping()`

- Purpose: confirm the browser core is installed.
- Mutates: no.
- Use before any other command.
- Verified: yes.

### `window.comfyAI.help()`

- Purpose: return operating rules and command guidance for an AI model.
- Mutates: no.
- Verified: syntax checked.

### `window.comfyAI.getCommandCatalog()`

- Purpose: return machine-readable command descriptions.
- Mutates: no.
- Verified: syntax checked.

### `window.comfyAI.getOperatingProtocol()`

- Purpose: return the AI operating loop, logging discipline, safety rules, socket strategy, and human-intervention triggers.
- Mutates: no.
- Verified: syntax checked.

## Graph Reading

### `getWorkflow()`

- Purpose: read the full live workflow from the browser graph.
- Mutates: no.
- Verified: yes.

### `getNodes()`

- Purpose: list all current nodes.
- Mutates: no.
- Verified: yes, including dynamic updates as graph changes.

### `getNode(nodeId)`

- Purpose: read one node by ID.
- Mutates: no.
- Verified: yes.

### `getGraphInfo()`

- Purpose: return graph-level counts and metadata.
- Mutates: no.
- Verified: yes.

### `getCanvasState()`

- Purpose: return canvas camera and selection state.
- Mutates: no.
- Verified: yes.

## Widget Reading and Editing

### `getNodeWidgets(nodeId)`

- Purpose: inspect node settings, values, dropdown options, numeric metadata,
  and text metadata.
- Mutates: no.
- Verified: syntax checked.

### `getSelectedNodeWidgets()`

- Purpose: inspect settings for selected nodes.
- Mutates: no.
- Verified: syntax checked.

### `setWidgetValue(nodeId, widgetNameOrIndex, value)`

- Purpose: edit a single widget value.
- Mutates: workflow widget value.
- Safety: returns old value and new value.
- Verified: syntax checked.

### `batchSetWidgetValues(updates)`

- Purpose: edit multiple widget values.
- Mutates: workflow widget values.
- Safety: returns per-update result.
- Verified: syntax checked.

## Socket and Connection Reading

### `getNodeSockets(nodeId)`

- Purpose: inspect input/output sockets and connection state.
- Includes: raw socket type, normalized type list, inferred semantic types, connection state.
- Mutates: no.
- Verified: yes.

### `getSelectedNodeSockets()`

- Purpose: inspect sockets for selected nodes.
- Mutates: no.
- Verified: syntax checked.

### `getConnectionMap()`

- Purpose: read all splines as source socket to target socket records.
- Mutates: no.
- Verified: yes.

### `getConnectedNodes(nodeId)`

- Purpose: get direct parents and children of a node.
- Mutates: no.
- Verified: syntax checked.

### `traceUpstream(nodeId)` / `traceDownstream(nodeId)`

- Purpose: recursively trace graph data flow.
- Mutates: no.
- Verified: syntax checked.

## Canvas Navigation

### `selectNode(nodeId)` / `selectNodes(nodeIds)`

- Purpose: visually select nodes for human guidance.
- Mutates: canvas selection only.
- Verified: syntax checked.

### `centerOnNode(nodeId)`

- Purpose: move camera to a node.
- Mutates: canvas camera only.
- Verified: syntax checked.

### `deselectAll()`

- Purpose: clear visible selection.
- Mutates: canvas selection only.
- Verified: syntax checked.

## Connection Editing

### `validateConnection(request)`

- Purpose: validate output -> input compatibility before editing.
- Includes: socket compatibility explanation with exact/union type matches and inferred semantic matches.
- Mutates: no.
- Verified: yes.

### `connectNodes(request)`

- Purpose: create a visible spline.
- Mutates: graph links.
- Safety: validates first.
- Verified: yes, spline appeared visually.

### `connectInputToOutput(request)`

- Purpose: support reverse wording from input to output.
- Mutates: graph links.
- Safety: routes through connect validation.
- Verified: syntax checked.

### `autoConnectNodes(request)`

- Purpose: search compatible sockets between two nodes and connect best match.
- Mutates: graph links.
- Safety: ranks exact type matches first, then semantic type matches, with names as a lower-weight hint.
- Verified: syntax checked.

### `disconnectInput(nodeId, inputNameOrIndex)`

- Purpose: remove one input connection.
- Mutates: graph links.
- Verified: yes, spline disappeared visually.

### `disconnectOutput(nodeId, outputNameOrIndex)`

- Purpose: remove all links from one output.
- Mutates: graph links.
- Verified: syntax checked.

### `replaceConnection(request)`

- Purpose: replace one input's source.
- Mutates: graph links.
- Safety: returns old and new link details.
- Verified: syntax checked.

## Backend Awareness

### `backend.getObjectInfo()`

- Purpose: read backend node definitions.
- Mutates: no.
- Verified: yes.

### `backend.compareFrontendNodesWithObjectInfo()`

- Purpose: compare current graph node types with backend definitions.
- Mutates: no.
- Verified: yes.

### `backend.getDropdownDiagnostics()`

- Purpose: detect invalid dropdown/model selections.
- Mutates: no.
- Verified: yes.

### `backend.searchNodeDefinitions(query, options)`

- Purpose: search backend node definitions by class, display name, category, inputs, outputs, or description.
- Mutates: no.
- Use while planning which node type to create for a workflow goal.
- Verified: syntax checked.

### `backend.getNodeDefinition(type)`

- Purpose: return one backend node definition with inputs, outputs, category, and raw schema.
- Mutates: no.
- Use before `createNode()` and widget initialization.
- Verified: syntax checked.

### `backend.getModelCatalog()`

- Purpose: extract model-like dropdown options from backend node definitions.
- Mutates: no.
- Use to discover checkpoints, VAEs, LoRAs, ControlNets, upscale models, and similar local model options.
- Verified: syntax checked.

### `backend.prepareCurrentPrompt()`

- Purpose: convert current graph to executable prompt.
- Mutates: no.
- Verified: yes.

### `backend.queueCurrentWorkflow({ dryRun: true })`

- Purpose: test queue payload without running.
- Mutates: no.
- Verified: yes.

### `backend.queueCurrentWorkflow()`

- Purpose: queue and run the current workflow.
- Mutates: backend queue/execution.
- Verified: not run yet on this CPU-only MacBook Air test setup.

### `backend.waitForPrompt(promptId, options)`

- Purpose: poll history/queue until a prompt finishes or times out.
- Mutates: no.
- Use after real queueing to detect completion.
- Returns: history record plus extracted output metadata when finished.
- Verified: syntax checked.

### `backend.getPromptOutputs(promptId)`

- Purpose: extract output file metadata and `/view` URLs from prompt history.
- Mutates: no.
- Use after a prompt finishes so the AI can inspect generated images/videos.
- Verified: syntax checked.

### `backend.runCurrentWorkflowAndWait(options)`

- Purpose: queue the current workflow, wait for completion, and return outputs.
- Mutates: backend queue/execution.
- Use for an end-to-end run/test iteration after building or modifying a workflow.
- Verified: syntax checked; real generation not run on CPU-only test setup.

### `backend.preflightCurrentWorkflow()`

- Purpose: combined readiness check before real queue execution.
- Mutates: no.
- Checks: graph summary, frontend node types vs backend `object_info`, dropdown/model validity, prompt conversion.
- Verified: syntax checked.

## Safety and Undo

### `requestHumanIntervention(message, details, requestedHelp)`

- Purpose: return a structured stop-and-ask response when no safe practical path exists.
- Mutates: no.
- Use when the AI cannot safely proceed through graph APIs, backend APIs, browser controls, local files, or available recovery paths.
- Verified: syntax checked.

### `getActionLog(limit)`

- Purpose: return recent browser-core actions for debugging and reproducibility.
- Mutates: no.
- Records: action name, time, compact input, success/failure, summary, error code, and human-intervention flag.
- Verified: syntax checked.

### `getControlMode()` / `setControlMode(mode)`

- Purpose: gate AI power level.
- Modes: `read_only`, `safe_edit`, `full_control`.
- Default: `safe_edit`.
- `read_only`: blocks workflow mutations.
- `safe_edit`: allows smaller edits such as widget/connection/node edits.
- `full_control`: required for destructive rebuild actions such as `clearWorkflow()` and `buildTextToImageWorkflow()`.
- Verified: syntax checked.

### `createSnapshot(reason, metadata)`

- Purpose: save the current live workflow graph in browser memory.
- Mutates: no.
- Use before risky experiments, clear-graph operations, node creation, or batch edits.
- Verified: syntax checked.

### `listSnapshots()`

- Purpose: list available in-memory recovery points for this browser session.
- Mutates: no.
- Verified: syntax checked.

### `restoreSnapshot(snapshotId)`

- Purpose: restore the graph to a previous in-memory workflow snapshot.
- Mutates: graph workflow.
- Safety: creates a rollback snapshot before restoring.
- Verified: syntax checked.

### `undoLastEdit()`

- Purpose: restore the most recent automatic pre-edit snapshot.
- Mutates: graph workflow.
- Safety: mutating commands now attach `data.pre_edit_snapshot`.
- Verified: syntax checked.

Current automatic pre-edit snapshots are created for:

- `clearWorkflow`
- `createNode`
- `setWidgetValue`
- `batchSetWidgetValues`
- `connectNodes`
- `connectInputToOutput`
- `autoConnectNodes`
- `disconnectInput`
- `disconnectOutput`
- `disconnectAllInputs`
- `disconnectAllOutputs`
- `replaceConnection`

## Workflow Editing

### `getRegisteredNodeTypes(search)`

- Purpose: list frontend/LiteGraph node types that can be created in the current browser session.
- Mutates: no.
- Use before `createNode()` to discover exact creatable type strings.
- Verified: syntax checked.

### `clearWorkflow(options)`

- Purpose: clear all nodes and links from the live graph so the AI can start from an empty workflow.
- Mutates: graph workflow.
- Safety: creates `data.pre_edit_snapshot` before clearing.
- Options: `reason`, `snapshotReason`, or `snapshot_reason`.
- Fallback note: future BrowserBridge can emulate `Command+A` then `Backspace` when UI-native clearing is needed.
- Verified: syntax checked.

### `createNode(request)`

- Purpose: create one ComfyUI node in the live graph by exact frontend/LiteGraph type.
- Mutates: graph workflow.
- Safety: creates `data.pre_edit_snapshot` before adding the node.
- Request fields: `type` or `nodeType`, optional `position`, `title`, `titleMode`, `size`, and `widgets`.
- Title policy: default title mode preserves the original ComfyUI node identity, e.g. `Sampler__KSampler`.
- Use after `backend.getObjectInfo()` confirms the node class exists.
- Returns: normalized node, sockets, widgets, widget initialization results, and snapshot metadata.
- Verified: syntax checked.

## Workflow Builders

### `buildTextToImageWorkflow(request)`

- Purpose: clear the graph and build a standard text-to-image workflow.
- Mutates: graph workflow.
- Safety: creates `data.pre_edit_snapshot` before clearing/building.
- Nodes: `CheckpointLoaderSimple`, two `CLIPTextEncode`, `EmptyLatentImage`, `KSampler`, `VAEDecode`, `SaveImage`.
- Request fields: `positivePrompt`, `negativePrompt`, `checkpoint`, `width`, `height`, `batchSize`, `seed`, `steps`, `cfg`, `samplerName`, `scheduler`, `denoise`, `filenamePrefix`.
- Returns: created nodes, node results, connection results, graph summary, and connection map.
- Verified: syntax checked.

## Workflow Documentation

### `createCanvasNote(request)`

- Purpose: create a visible note/memo node on the canvas.
- Mutates: graph workflow.
- Use for human instructions, AI decisions, model provenance, references, and warnings.
- Safety: snapshots before adding the note.
- Fallback: if no known note node type is registered, returns `needs_human_intervention`.
- Verified: syntax checked.

### `createRunDocumentationNotes(request)`

- Purpose: create multiple note nodes for structured run documentation.
- Sections: human instructions, AI steps with timestamps, models and sources, references, open questions.
- Mutates: graph workflow.
- Verified: syntax checked.

### `recordAttempt(request)`

- Purpose: record one AI iteration with goal, output, observation, diagnosis, change, result, and next step.
- Mutates: no by default; optionally creates a canvas note with `createCanvasNote: true`.
- Use after every run/inspect/modify cycle.
- Canvas note style: concise by default; use `canvasStyle: "detailed"` only when a larger note is wanted.
- Returns: structured journal entry and optional note creation result.
- Verified: syntax checked.

### `getAttemptJournal(limit)`

- Purpose: return the browser-session attempt journal.
- Mutates: no.
- Use to summarize how the AI got to the current workflow state.
- Verified: syntax checked.

## MCP Bridge

### `mcp/`

- Purpose: future AI-facing MCP layer.
- Mutates: depends on tool.
- Status: scaffolded.
- Verified: Python compile check.

### `mcp/comfyai_mcp/adapters/`

- Purpose: swappable browser backends.
- Includes: Playwright scaffold, Puppeteer scaffold.
- Verified: Python compile check.

### `mcp-ts/`

- Purpose: TypeScript MCP bridge that exposes AI-facing tools and forwards them to the live browser core.
- Architecture: thin MCP server -> PlaywrightBridge -> `window.comfyAI`.
- Mutates: depends on the called tool.
- Verified: TypeScript build passed.

### `COMFYAI_CDP_URL`

- Purpose: attach Playwright to an already-open Chrome debugging session instead of launching a fresh browser.
- Use when: the user already has ComfyUI running in Chrome and wants the AI to work in that visible tab.
- Example: `COMFYAI_CDP_URL=http://127.0.0.1:9222`.
- Verified: bridge reached the existing ComfyUI tab and `ping` returned ok in the away-session test.

### `browser_take_viewport_screenshot`

- Purpose: capture the currently visible ComfyUI canvas/browser viewport for AI visual inspection.
- Returns: JSON metadata plus MCP `image/png` content.
- Limitation: viewport only, because ComfyUI is an infinite canvas.
- Verified: actual MCP client received both text and image content in the away-session test.
