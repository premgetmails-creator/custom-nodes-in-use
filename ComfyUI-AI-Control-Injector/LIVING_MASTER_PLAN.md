# ComfyUI AI Control Injector - Living Master Plan

This file is the current source-of-truth roadmap for the ComfyUI AI Control
Injector project.

It preserves the original zero-progress master plan, records decisions made
during development, and expands the objective into the final autonomous
ComfyUI operator vision.

Golden environment rule:

```text
Do not modify:
/Users/krishna/Desktop/ComfyAI/base

Work only in:
/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector
```

---

## 1. Final Objective

Build a local-first AI control system that can use ComfyUI like an expert
human operator.

The final system should let a user describe an image or video goal without
needing to understand diffusion internals such as latents, conditioning,
samplers, CFG, denoise, VAEs, ControlNet, IPAdapter, AnimateDiff, or model
compatibility.

The AI should eventually be able to:

```text
1. Understand the user's desired output.
2. Open or reset the live ComfyUI workflow.
3. Build a workflow from scratch.
4. Add nodes.
5. Configure node values.
6. Select available model files.
7. Connect compatible sockets.
8. Validate the graph.
9. Queue the workflow.
10. Watch execution.
11. Collect output images or videos.
12. Analyze outputs visually.
13. Compare outputs against the user's goal.
14. Diagnose artifacts or mismatches.
15. Modify settings, prompts, nodes, models, or connections.
16. Repeat until the output is good enough or a defined stop condition is hit.
17. If needed, create or modify a custom ComfyUI node, reload ComfyUI, verify
    the node exists, and use it in the workflow.
```

The project is not only a "graph editor." It is intended to become an
observe-build-run-inspect-diagnose-revise loop for ComfyUI.

---

## 2. Original Core Purpose

The original project purpose remains valid:

Build a local-first AI control system for ComfyUI that can inspect and
manipulate the currently open workflow directly in the browser.

The system avoids this manual loop:

```text
Export workflow JSON
-> give JSON to AI
-> AI edits JSON
-> user re-imports workflow
-> user tests
-> repeat
```

The preferred loop is:

```text
AI Agent
-> MCP Tool
-> Browser Bridge
-> window.comfyAI
-> Live ComfyUI canvas
-> inspect / select / connect / disconnect / edit / validate / run
```

The first proof remains intentionally small:

```text
If the system can:
[x] detect local nodes
[x] read their widgets
[x] read their input/output sockets
[x] read existing splines/connections
[~] select nodes visually
[x] connect two compatible sockets with a spline
[x] disconnect splines safely

Then the same mechanism can scale to larger workflows.
```

---

## 3. Architecture Decision Record

### 3.1 Loader Plus Reusable Core

Decision:

```text
Environment-specific loader
+
Reusable browser core
```

Current files:

```text
web/ai_loader.js = ComfyUI-specific loader / injector / watchdog
web/ai_core.js   = reusable browser graph-control API
```

Reason:

The same browser graph-control logic should be reusable from several launch
methods:

```text
[x] ComfyUI custom frontend extension
[ ] Chrome/browser extension
[ ] Playwright-controlled MCP bridge
[ ] Future WebSocket or Chrome DevTools bridge
```

### 3.2 MCP Must Stay Thin

Decision:

MCP must not duplicate ComfyUI graph logic.

MCP tools should call `window.comfyAI` in the browser where the reusable core
is installed.

Example:

```javascript
await page.evaluate(() => window.comfyAI.getNodes())
```

Reason:

This keeps one source of truth for graph behavior and prevents separate
browser, MCP, and backend implementations from drifting apart.

### 3.3 Browser Control Layer Stays Separate

Decision:

Browser automation belongs in the MCP/browser bridge layer, not inside
`web/ai_core.js`.

Reason:

`web/ai_core.js` should know how to operate the ComfyUI graph once it is
installed. It should not know whether the caller is a human console, Chrome
extension, Playwright, Puppeteer, or a future adapter.

### 3.4 TypeScript-Leaning MCP Direction

Decision:

The current recommendation is to build the real MCP/browser-control layer in
TypeScript, while leaving room for Python helpers.

Reason:

The live control surface is the browser:

```text
window.comfyAI
ComfyUI canvas
Playwright/Puppeteer page evaluation
screenshots
reloads
visual/browser testing
```

TypeScript fits this browser-centered layer naturally. Python remains valuable
for ComfyUI/backend/local utilities, model file analysis, environment checks,
workflow file operations, and custom-node authoring helpers.

Important nuance:

Blender MCP being Python makes sense because Blender's native control surface
is Python. ComfyUI's current control surface in this project is the live
browser page, so the MCP browser layer can reasonably be TypeScript-first.

### 3.5 Playwright First, Puppeteer Swappable

Decision:

Use a browser backend abstraction so Playwright and Puppeteer can be swapped.

Current concept:

```text
BrowserBridge
  -> PlaywrightBridge
  -> PuppeteerBridge
  -> future CDP/WebSocket/browser adapters
```

Reason:

Playwright is strong for Chrome and has broader browser support. Puppeteer is
excellent for Chrome and should remain easy to add or switch to.

### 3.6 Modular "ComfyUI Node" Style

Decision:

Every component should feel like a small ComfyUI node:

```text
one purpose
clear inputs
clear outputs
easy to replace
easy to remove
easy to test
minimal hidden coupling
```

Reason:

This project is meant for long-term extensibility and eventual open-source
community understanding. Modularity is not decoration; it is the operating
style.

---

## 4. Current Layer Map

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

Future MCP bridge
  -> mcp/
  -> mcp-ts/
      exposes AI tool names
      validates tool inputs
      calls BrowserBridge
      never duplicates graph logic

Browser backend adapters
  -> mcp/comfyai_mcp/adapters/
      Playwright adapter scaffold
      Puppeteer adapter scaffold
      future adapters

TypeScript MCP browser bridge
  -> mcp-ts/
      exposes AI-facing MCP tool names
      attaches to existing Chrome through COMFYAI_CDP_URL when provided
      calls window.comfyAI in the live ComfyUI tab
      can return viewport screenshots as MCP image content

Browser-native control actions
  -> future BrowserBridge capability
      keyboard shortcuts such as Command+A, Backspace, Command+Shift+R
      mouse clicks, typing, drag/drop, screenshots
      UI-native recovery when direct graph APIs are not enough
```

Future ideal shape:

```text
AI model
  -> MCP tools
  -> browser bridge
  -> window.comfyAI
  -> ComfyUI frontend graph/canvas
  -> ComfyUI backend APIs
  -> output files
  -> multimodal analysis
  -> next workflow edit
```

---

## 5. AI Operator Capability Targets

### 5.1 Live ComfyUI Operation

The AI must eventually operate the same UI the user sees:

```text
[ ] start a new workflow like ComfyUI menu File -> New
[ ] clear example/default nodes
[ ] add nodes by class/type
[ ] place nodes cleanly on the canvas
[ ] select and center nodes
[ ] configure widgets
[x] read nodes
[x] read widgets
[x] read sockets
[x] read links/splines
[x] validate connections
[x] connect compatible sockets
[x] disconnect sockets
[x] replace connections
[~] queue current workflow through backend
```

### 5.2 Backend Knowledge

The AI must understand what the installed ComfyUI backend can do:

```text
[x] fetch backend object_info
[x] compare live frontend node types with backend definitions
[x] inspect dropdown values and invalid selections
[~] prepare current workflow as executable prompt
[ ] list model files by category
[ ] suggest closest valid model file
[ ] explain missing node/model problems
[ ] validate workflow against backend before queueing
```

### 5.3 Workflow Creation From Scratch

The AI must be able to create workflows, not only edit existing ones:

```text
[ ] create empty graph
[ ] add node by backend node class
[ ] initialize required widgets
[ ] connect standard text-to-image chain
[ ] connect image-to-image chain
[ ] connect inpainting chain
[ ] connect ControlNet chain
[ ] connect IPAdapter/reference-image chain
[ ] connect video/AnimateDiff chain
[ ] connect upscale/detailing chain
[ ] save reusable workflow templates
[ ] generate workflows from composable blocks instead of rigid templates
```

Important design:

Common workflows should be built from composable graph blocks:

```text
checkpoint loading block
prompt encoding block
latent creation block
sampling block
VAE decode block
image save block
ControlNet block
reference image block
video frame block
upscale block
detail/fix block
```

### 5.4 Queue, Observe, and Iterate

The AI must eventually close the loop:

```text
[ ] queue real workflow execution
[ ] monitor queue status
[ ] monitor execution progress
[ ] collect prompt ID
[ ] read history for prompt ID
[ ] find output image/video paths
[ ] interrupt execution when needed
[ ] record each attempt
[ ] compare attempt outputs
[ ] decide next edit
[ ] stop based on quality, budget, time, or user instruction
```

### 5.5 Visual Image and Video Analysis

This is one of the most important final layers.

The AI must inspect inputs and outputs, then reason about why artifacts occur.

Targets:

```text
[ ] inspect input/reference images
[ ] inspect generated images
[ ] inspect generated video frames
[ ] detect face/body/hand/artifact problems
[ ] detect temporal flicker in video
[ ] detect prompt mismatch
[ ] detect ignored reference image
[ ] detect color/style/composition mismatch
[ ] connect problems to likely diffusion causes
[ ] recommend setting changes
[ ] recommend node/model/prompt changes
```

The tool should provide the AI with evidence:

```text
workflow graph
node settings
model names
seed
sampler
steps
CFG
denoise
resolution
input images
output images/videos
ComfyUI errors/logs
attempt history
```

### 5.6 Custom Node Authoring

Eventually, if existing nodes are insufficient, the AI should be able to:

```text
[ ] design a custom ComfyUI node
[ ] write it into the active custom_nodes area
[ ] restart or reload ComfyUI
[ ] verify the node appears in object_info
[ ] add the node to the workflow
[ ] test the node
[ ] roll back safely if it breaks the environment
```

This requires strong safety controls because custom nodes can break the local
ComfyUI environment.

---

## 6. Current Verified Capabilities

Verified in the user's Chrome DevTools session:

```text
[x] ComfyUI loaded the injector.
[x] window.comfyAIInjector.status() returned ok.
[x] window.comfyAI.ping() returned ok.
[x] getNodes() reflected live graph changes.
[x] getNodeSockets() returned node inputs/outputs.
[x] validateConnection() accepted a valid IMAGE -> images connection.
[x] connectNodes() created a visible spline.
[x] getConnectionMap() returned the created connection.
[x] disconnectInput() removed the spline visually.
[x] getConnectionMap() returned zero connections afterward.
[x] backend.getObjectInfo() fetched backend object definitions.
[x] backend.compareFrontendNodesWithObjectInfo() found no missing current types.
[x] backend.getDropdownDiagnostics() reported invalid dropdown values.
[x] backend.prepareCurrentPrompt() prepared current workflow.
[x] backend.queueCurrentWorkflow({ dryRun: true }) prepared without queueing.
[x] TypeScript MCP bridge built successfully.
[x] Playwright bridge attached to an existing Chrome/ComfyUI tab through CDP.
[x] MCP bridge called `window.comfyAI.ping()` in that existing tab.
[x] MCP bridge read graph info from that existing tab.
[x] MCP viewport screenshot returned both text metadata and image/png content.
```

Real queue execution has not been run yet because the test machine is a CPU-only
MacBook Air 2015 and the user intentionally avoided running generation.

---

## 7. Current Public Browser API

Health and guidance:

```text
window.comfyAI.ping()
window.comfyAI.help()
window.comfyAI.getCommandCatalog()
```

Graph read:

```text
getWorkflow()
getNodes()
getNode(nodeId)
getLinks()
getGraphInfo()
getCanvasState()
```

Widgets:

```text
getNodeWidgets(nodeId)
getSelectedNodeWidgets()
setWidgetValue(nodeId, widgetNameOrIndex, value)
batchSetWidgetValues(updates)
```

Sockets and connections:

```text
getNodeSockets(nodeId)
getSelectedNodeSockets()
getConnectionMap()
getConnectedNodes(nodeId)
traceUpstream(nodeId)
traceDownstream(nodeId)
```

Canvas:

```text
getSelectedNodes()
deselectAll()
centerOnNode(nodeId)
selectNode(nodeId, options)
selectNodes(nodeIds, options)
```

Connection editing:

```text
validateConnection(request)
connectNodes(request)
connectInputToOutput(request)
autoConnectNodes(request)
disconnectInput(nodeId, inputNameOrIndex)
disconnectOutput(nodeId, outputNameOrIndex)
disconnectAllInputs(nodeId)
disconnectAllOutputs(nodeId)
replaceConnection(request)
```

Backend:

```text
backend.getObjectInfo()
backend.getQueue()
backend.getHistory()
backend.getSystemStats()
backend.compareFrontendNodesWithObjectInfo()
backend.getDropdownDiagnostics()
backend.prepareCurrentPrompt()
backend.queueCurrentWorkflow(options)
backend.getHistoryForPrompt(promptId)
backend.interrupt()
```

---

## 8. Original Stage Plan With Current Status

Legend:

```text
[ ] not started
[~] partially implemented
[x] implemented and tested or syntax-checked as noted
```

### Stage 0 - Local Environment Setup

```text
[x] Start local ComfyUI from active environment.
[x] Confirm browser opens local ComfyUI on localhost:8188.
[x] Create ComfyUI-AI-Control-Injector folder.
[x] Add frontend-only __init__.py.
[x] Add web/ai_loader.js.
[x] Add web/ai_core.js.
[x] Restart ComfyUI after initial install.
[x] Confirm loader/core appear in browser console.
[x] Create/use small local test workflow.
[~] Save dedicated test workflow copies.
```

### Stage 1 - Persistent Loader / Injector

```text
[x] Register loader with ComfyUI frontend extension loading.
[x] Import ComfyUI app.
[x] Wait for app.graph and app.canvas.
[x] Import/install ai_core.js.
[x] Create window.comfyAIInjector.
[x] Add status API.
[x] Add monitor/reinstall loop.
[x] Avoid duplicate installs.
[x] Track install count and last install reason.
```

### Stage 2 - Reusable Core Basic Installation

```text
[x] Create window.installComfyAICore().
[x] Accept app/source/logger/options-style install config.
[x] Validate install context.
[x] Create window.comfyAI.
[x] Add version/source/ping.
[x] Handle reinstall.
```

### Stage 3 - Basic Graph Reading

```text
[x] getWorkflow()
[x] getNodes()
[x] getNode(nodeId)
[x] getLinks()
[x] getGraphInfo()
[x] getCanvasState()
[x] Return node IDs, titles, types, positions, and sizes.
```

### Stage 4 - Widget Reading

```text
[x] Read widgets for nodes.
[x] Return index/name/type/value.
[x] Return dropdown options where available.
[x] Return numeric/string metadata where available.
[x] Handle nodes with no widgets.
```

### Stage 5 - Socket Reading

```text
[x] getNodeSockets(nodeId)
[x] getSelectedNodeSockets()
[x] Return input/output index, name, type, label, and connection state.
```

### Stage 6 - Spline / Link Reading

```text
[x] Normalize link records.
[x] getConnectionMap()
[x] Include source/target node and socket data.
[x] getConnectedNodes(nodeId)
[x] traceUpstream(nodeId)
[x] traceDownstream(nodeId)
```

### Stage 7 - Canvas Selection and Navigation

```text
[x] selectNode(nodeId)
[x] selectNodes(nodeIds)
[x] deselectAll()
[x] centerOnNode(nodeId)
[x] getSelectedNodes()
[~] Full visual verification of every canvas command.
```

### Stage 8 - Safe Widget Editing

```text
[x] setWidgetValue(nodeId, widgetNameOrIndex, value)
[x] batchSetWidgetValues(updates)
[x] Return old and new values.
[x] Mark graph/canvas dirty.
[~] More browser verification needed across widget types.
```

### Stages 9-14 - Connection Control

```text
[x] validateConnection()
[x] connectNodes()
[x] connectInputToOutput()
[x] autoConnectNodes()
[x] disconnectInput()
[x] disconnectOutput()
[x] disconnectAllInputs()
[x] disconnectAllOutputs()
[x] replaceConnection()
[x] Browser verified valid connect/disconnect with visible spline.
[~] More incompatible and edge-case tests needed.
```

### Stage 15 - Minimal Local Proof

```text
[x] Browser loads injector.
[x] Injector status works.
[x] Core ping works.
[x] List nodes.
[x] Read widgets.
[x] Read sockets.
[x] Read existing/created spline.
[x] Disconnect spline.
[x] Reconnect spline.
[~] Select/source/target visual verification.
[~] Auto-connect browser verification.
[~] Incompatible connection refusal browser verification.
[x] Page refresh/core reinstall behavior observed.
```

### Stage 16 - Backend API Read Integration

```text
[x] Fetch object_info.
[x] Fetch queue.
[x] Fetch history.
[x] Fetch system stats.
[x] Compare frontend nodes with backend object_info.
```

### Stage 17 - Model/File Discovery

```text
[ ] List checkpoints.
[ ] List VAEs.
[ ] List LoRAs.
[ ] List ControlNets.
[ ] List upscale models.
[ ] Detect whether selected model exists.
[ ] Suggest closest file match.
[x] Early dropdown diagnostics helper exists.
```

### Stage 18 - Queue Current Workflow

```text
[x] Prepare current workflow.
[x] Dry-run queue preparation.
[ ] Real queue execution test.
[ ] Monitor execution status.
[ ] Get latest outputs.
[x] Interrupt helper exists.
```

### Stage 19 - MCP Server

```text
[x] MCP folder scaffolded.
[x] BrowserBridge abstraction started.
[x] Playwright adapter scaffolded.
[x] Puppeteer adapter scaffolded.
[x] Python package shadowing issue fixed by using comfyai_mcp package name.
[x] Add TypeScript MCP scaffold after TypeScript-first decision.
[~] Decide final MCP implementation package layout after TypeScript/Python choice.
[~] Implement real browser connection.
[~] Register actual MCP tools.
[ ] End-to-end AI tool call test.
```

### Stage 20 - MCP Tool List

Planned AI-facing tools:

```text
[ ] comfy_ping
[ ] comfy_get_injector_status
[ ] comfy_get_current_workflow
[ ] comfy_list_nodes
[ ] comfy_get_node
[ ] comfy_get_node_sockets
[ ] comfy_get_selected_nodes
[ ] comfy_get_selected_node_sockets
[ ] comfy_get_connection_map
[ ] comfy_select_node
[ ] comfy_select_nodes
[ ] comfy_center_on_node
[ ] comfy_set_widget_value
[ ] comfy_validate_connection
[ ] comfy_connect_nodes
[ ] comfy_connect_input_to_output
[ ] comfy_auto_connect_nodes
[ ] comfy_disconnect_input
[ ] comfy_disconnect_output
[ ] comfy_replace_connection
[ ] comfy_trace_upstream
[ ] comfy_trace_downstream
[ ] comfy_new_workflow
[ ] comfy_clear_workflow
[ ] comfy_add_node
[ ] comfy_set_model
[ ] comfy_queue_workflow
[ ] comfy_get_outputs
[ ] comfy_analyze_attempt_context
```

### Stage 21 - Safety and Undo

```text
[~] Snapshot before every edit.
[~] Undo last action.
[~] Restore snapshot.
[ ] Persistent snapshot storage.
[~] Action log.
[x] Read-only mode.
[x] Safe-edit mode.
[x] Full-control mode.
[ ] Confirmation gates for destructive actions.
```

### Stage 22 - Visual Guidance

```text
[ ] Highlight selected node.
[ ] Flash changed node.
[ ] Highlight socket.
[ ] Highlight created spline.
[ ] Show temporary label.
[ ] Clear annotations.
```

---

## 9. New Stages Added After Clarifying The Final Goal

### Stage 23 - New Workflow and Clear Graph

Goal:

Let the AI start from a clean canvas.

Checklist:

```text
[~] Add a safe command to create/reset a workflow.
[ ] Include BrowserBridge keyboard fallback: Command+A then Backspace.
[ ] Detect existing unsaved graph.
[x] Snapshot before clearing.
[x] Clear default/example nodes.
[x] Verify graph is empty through returned counts.
[x] Return before/after node and link counts.
```

### Stage 23B - Browser-Native Keyboard and UI Control

Goal:

Give the MCP/browser bridge the same emergency and convenience controls a human
has in Chrome and ComfyUI.

Checklist:

```text
[ ] Press keyboard shortcuts such as Command+A, Backspace, Command+Shift+R.
[ ] Click UI menu items when needed.
[ ] Type into focused fields.
[ ] Drag nodes or sockets when direct APIs are insufficient.
[ ] Take screenshots before and after UI-native actions.
[ ] Prefer direct window.comfyAI graph APIs when they are safer and easier to validate.
[ ] Use keyboard/UI emulation as a bridge-layer fallback, not hidden inside ai_core.js.
```

### Stage 24 - Node Creation API

Goal:

Let the AI add ComfyUI nodes by backend class/type.

Checklist:

```text
[~] Search backend object_info for node class.
[~] List frontend-registered node types for exact createNode() names.
[x] Add node to live graph.
[x] Set title if requested.
[x] Set position.
[x] Initialize widgets.
[x] Return new node ID and sockets.
[~] Verify node appears in getNodes().
```

### Stage 24B - Socket Semantic Robustness

Goal:

Handle official and community nodes whose socket names are unclear, inconsistent,
or misleading.

Checklist:

```text
[x] Preserve raw socket names and raw socket types.
[x] Normalize union socket types such as IMAGE,LATENT.
[x] Infer semantic socket categories such as image, latent, model, clip, vae, conditioning, mask.
[x] Prefer socket type compatibility over socket name matching.
[x] Return compatibility explanations from validation.
[x] Rank auto-connect candidates by exact type, semantic type, then name hints.
[ ] Add backend-schema cross-checking for custom nodes where frontend sockets are incomplete.
```

### Stage 25 - Layout and Graph Arrangement

Goal:

Make AI-built workflows readable to humans.

Checklist:

```text
[ ] Set node positions.
[ ] Arrange common graph blocks left-to-right.
[ ] Avoid node overlap.
[ ] Center canvas on created workflow.
[ ] Optionally group or label workflow sections.
```

### Stage 25B - Human-Readable Node Labeling

Goal:

Let the AI label workflow intent without hiding the real ComfyUI node class from
humans.

Checklist:

```text
[x] Preserve original node identity when applying AI labels.
[x] Default format: AI label + "__" + original ComfyUI node title/type.
[x] Allow explicit replace mode only when intentionally requested.
[ ] Add group/section labels for larger generated workflows.
```

### Stage 25C - Canvas Documentation Notes

Goal:

Use ComfyUI's built-in note/memo node style to leave readable documentation
directly on the workflow canvas.

Checklist:

```text
[x] Create single canvas note node when a registered note type exists.
[x] Store note text in widgets/properties best-effort.
[x] Create separate notes for human instructions, AI steps, models/sources, references, and open questions.
[x] Return human-intervention request if no note node type is available.
[ ] Append/update existing documentation notes instead of always creating new ones.
[ ] Include generated note layout in workflow templates.
```

### Stage 25D - Attempt Journal

Goal:

Record the full reasoning trail for each AI iteration so a new human or AI can
understand how the workflow reached its current state.

Checklist:

```text
[x] Record goal, output, observation, diagnosis, change, result, and next step.
[x] Keep browser-session structured attempt journal.
[x] Optionally mirror each attempt onto the canvas as a concise numbered timestamp note.
[x] Keep detailed subheaded fields in structured logs, not default canvas notes.
[ ] Persist attempt journal to external JSONL through MCP.
[ ] Auto-link attempt entries to prompt IDs and output files after real runs.
```

### Stage 26 - Composable Workflow Blocks

Goal:

Build reusable workflow blocks instead of one-off brittle templates.

Checklist:

```text
[~] Text-to-image base block.
[ ] Image-to-image base block.
[ ] Inpaint block.
[ ] ControlNet block.
[ ] Reference/IPAdapter block.
[ ] Video/AnimateDiff block.
[ ] Upscale/detail block.
[ ] Save/output block.
[ ] Block compatibility rules.
```

### Stage 27 - Model Selection Intelligence

Goal:

Let the AI pick valid local models.

Checklist:

```text
[ ] Discover available checkpoints, VAEs, LoRAs, ControlNets, upscale models.
[ ] Read model metadata where available.
[ ] Match user intent to model category.
[ ] Avoid selecting missing dropdown values.
[ ] Suggest substitutions.
[ ] Record selected model reasoning.
```

### Stage 27B - Model Acquisition

Goal:

Let an AI agent obtain missing model files when it has safe system access and a
trusted download source.

Checklist:

```text
[ ] Identify required model type and filename.
[ ] Search official/trusted sources when internet access is available.
[ ] Prefer official project pages, Hugging Face repositories, Civitai pages, or documented model cards.
[ ] Check license, file size, disk space, and expected folder.
[ ] Ask human for intervention for gated, login-only, ambiguous, untrusted, or license-sensitive downloads.
[ ] Download into the correct ComfyUI model folder.
[ ] Verify file exists and size is plausible.
[ ] Refresh/restart ComfyUI if needed.
[ ] Confirm model appears in backend/object_info dropdown options.
[ ] Continue workflow construction after verification.
```

This belongs mostly to the external AI agent/MCP/filesystem layer, not
`web/ai_core.js`, because browser graph code should not download large files.

### Stage 28 - Real Run and Output Collection

Goal:

Run workflows and collect outputs.

Checklist:

```text
[ ] Queue real workflow.
[ ] Watch progress.
[ ] Capture errors.
[ ] Read history by prompt ID.
[ ] Locate output files.
[ ] Return output metadata.
[ ] Support image and video outputs.
```

### Stage 29 - Multimodal Output Analysis Loop

Goal:

Help the AI inspect outputs and decide what to change.

Checklist:

```text
[ ] Provide output image/video paths to the AI model.
[ ] Sample video frames.
[ ] Compare output against user goal.
[ ] Compare output against reference images.
[ ] Diagnose visual artifacts.
[ ] Map likely causes to workflow/settings changes.
[ ] Record attempt evaluation.
```

### Stage 30 - Autonomous Iteration Controller

Goal:

Let the AI run controlled improvement loops.

Checklist:

```text
[ ] Define iteration budget.
[ ] Define success criteria.
[ ] Run workflow.
[ ] Analyze output.
[ ] Choose next edit.
[ ] Apply edit.
[ ] Repeat.
[ ] Stop with best output and attempt log.
```

### Stage 31 - Custom Node Authoring With Safety

Goal:

Allow advanced AI-created custom ComfyUI nodes only with rollback protection.

Checklist:

```text
[ ] Generate custom node in isolated active custom_nodes path.
[ ] Validate syntax.
[ ] Snapshot before install.
[ ] Restart/reload ComfyUI.
[ ] Verify node appears in object_info.
[ ] Use node in workflow.
[ ] Roll back on failure.
```

---

## 10. Logging Rules

Every meaningful change must be logged stage by stage.

Current log home:

```text
/Users/krishna/Desktop/ComfyAI/logs
```

Each log should record:

```text
stage
timestamp when useful
what was added
what was removed
what was modified
files touched
why the change was made
how to test it
actual test result
known limitations
commit hash if committed
```

For future autonomous workflow attempts, logs should also record:

```text
user goal
workflow version
node/settings changes
model selections
prompt ID
output paths
visual assessment
diagnosed problem
next action
stop reason
```

---

## 10A. Human Intervention Safeguard

The AI must not pretend that every action is possible.

If a task cannot be completed because there is no safe practical path through:

```text
window.comfyAI graph APIs
ComfyUI backend APIs
BrowserBridge keyboard/mouse/screenshot actions
local file/system tools
available model knowledge
available recovery/undo path
```

then the AI must stop and ask the human for help.

Examples:

```text
missing model file that cannot be downloaded automatically
ComfyUI UI dialog that the bridge cannot inspect or control safely
custom node install requiring a manual license/login step
ambiguous destructive operation with no reliable undo
workflow failure whose output/log evidence is unavailable
```

Expected response shape:

```json
{
  "ok": false,
  "needs_human_intervention": true,
  "error": {
    "code": "HUMAN_INTERVENTION_REQUIRED",
    "message": "What is blocked",
    "details": {}
  },
  "requested_help": "What the human should do"
}
```

---

## 11. Source Control Rule

Use isolated local source control only inside:

```text
/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector
```

Do not track the whole ComfyUI install.

Do not track the golden base folder.

Commit in small, understandable checkpoints after tested changes.

---

## 12. Near-Term Recommended Next Steps

Recommended order from the current project state:

```text
1. Finalize language choice for real MCP implementation.
2. Prefer TypeScript MCP unless a Python-specific requirement becomes stronger.
3. Add safety/snapshot/undo layer before more destructive graph operations.
4. Add new-workflow/clear-graph capability.
5. Add node-creation capability.
6. Add model discovery and dropdown-safe model selection.
7. Add real queue monitoring and output collection.
8. Add workflow block/template builder.
9. Add visual analysis and autonomous iteration loop.
```

This order protects the working environment while moving toward the final goal.

---

## 13. Current Resume Point

The frontend proof is working.

The next strategic decision is:

```text
Build the real MCP/browser bridge in TypeScript or Python.
```

Current recommendation:

```text
TypeScript for the MCP/browser-control layer.
Python only where it is naturally stronger for ComfyUI backend/local utilities.
```

After that decision, continue with:

```text
Stage 21 - Safety and Undo
Stage 23 - New Workflow and Clear Graph
Stage 24 - Node Creation API
```
