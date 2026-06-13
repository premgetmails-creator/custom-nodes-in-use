# Conversation Project Log

This is a concise project-history log of the conversation that shaped the
ComfyUI AI Control Injector.

It is not a verbatim transcript. It records the important requirements,
decisions, implementation stages, tests, and design changes.

## Starting Context

The user provided the original source-of-truth plan:

```text
/Users/krishna/Downloads/ComfyUI_Local_AI_Control_Reusable_Core_MCP_Zero_Progress_Master_Plan.md
```

The active ComfyUI install is:

```text
/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI
```

The golden base copy must not be touched:

```text
/Users/krishna/Desktop/ComfyAI/base
```

The project work is isolated in:

```text
/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/custom_nodes/ComfyUI-AI-Control-Injector
```

## Original Goal

Build a local-first ComfyUI control system where an AI can inspect and modify
the currently open browser workflow without manual JSON export/import.

Original desired loop:

```text
AI Agent
-> MCP Tool
-> Browser Bridge
-> window.comfyAI
-> Live ComfyUI canvas
-> inspect / select / connect / disconnect / edit / validate / run
```

## Early Implementation And Verification

The project began as a ComfyUI custom frontend extension:

```text
web/ai_loader.js
web/ai_core.js
```

`ai_loader.js` is the ComfyUI-specific loader/watchdog.

`ai_core.js` is the reusable browser-side graph-control API that exposes:

```text
window.comfyAI
```

The user verified in Chrome DevTools:

```javascript
window.comfyAIInjector.status()
window.comfyAI.ping()
```

Both worked.

The user then verified live graph reading and connection control:

```javascript
window.comfyAI.getNodes()
window.comfyAI.getNodeSockets(5)
window.comfyAI.getNodeSockets(7)
window.comfyAI.validateConnection(...)
window.comfyAI.connectNodes(...)
window.comfyAI.getConnectionMap()
window.comfyAI.disconnectInput(7, "images")
```

The visible spline appeared and disappeared on the ComfyUI canvas as expected.

## Source Control Decision

The user asked for local source control that tracks only the injector folder,
not the whole ComfyUI install.

An isolated Git repo was created inside:

```text
custom_nodes/ComfyUI-AI-Control-Injector
```

The base environment remains untouched.

## Design Direction Clarified

The user clarified the final objective:

The AI should eventually be able to:

```text
1. Understand a user's image/video goal.
2. Start a new ComfyUI workflow.
3. Add and configure nodes.
4. Select and download/verify models when appropriate.
5. Connect compatible sockets.
6. Queue the workflow.
7. Inspect generated images/videos.
8. Diagnose artifacts.
9. Modify prompts/settings/nodes/models.
10. Iterate until the desired output is reached.
11. Ask the human for help when no safe practical path exists.
```

This reframed the project from a graph editor into an autonomous ComfyUI
creative operator.

## Python vs TypeScript MCP Discussion

The user asked whether the MCP layer should be Python or TypeScript.

Decision:

```text
TypeScript is currently preferred for MCP/browser control.
Python remains useful for backend/local utilities.
```

Reason:

ComfyAI's active control surface is the live browser page:

```text
window.comfyAI
Playwright/Puppeteer
Chrome shortcuts
screenshots
canvas inspection
```

Blender MCP being Python makes sense because Blender's native control surface is
Python. ComfyAI's browser-control layer is naturally TypeScript-friendly.

## Browser Control vs Graph API Discussion

The user asked whether pure cursor/keyboard computer-use control would be better
than coding through the Graph API.

Decision:

Use a hybrid architecture:

```text
Graph API first
Browser/keyboard control as fallback
```

Reason:

Graph API gives structured truth:

```text
node IDs
socket types
widget values
links
validation
undo/snapshots
machine-readable results
```

Browser control is still needed for:

```text
Command+Shift+R
Command+A
Backspace
click/type/drag
screenshots
UI-only actions
```

## Living Master Plan

A consolidated plan was created:

```text
LIVING_MASTER_PLAN.md
```

It combines:

```text
original master plan
completed status
new decisions
final autonomous operator vision
future stages
```

## Major Capabilities Added

### Safety And Undo

Added:

```javascript
createSnapshot()
listSnapshots()
restoreSnapshot()
undoLastEdit()
```

Mutating graph commands now create automatic pre-edit snapshots.

### Clear Workflow

Added:

```javascript
clearWorkflow()
```

This clears the graph safely after snapshotting.

### Node Creation

Added:

```javascript
createNode()
getRegisteredNodeTypes()
```

This allows the AI to create nodes by type and discover frontend-registered
node types.

### Backend Schema And Model Awareness

Added:

```javascript
backend.searchNodeDefinitions()
backend.getNodeDefinition()
backend.getModelCatalog()
```

These help the AI search installed node definitions and discover model-like
dropdown options.

### Text-To-Image Workflow Builder

Added:

```javascript
buildTextToImageWorkflow()
```

It builds a basic workflow:

```text
CheckpointLoaderSimple
CLIPTextEncode positive
CLIPTextEncode negative
EmptyLatentImage
KSampler
VAEDecode
SaveImage
```

### Queue/Run Helpers

Added:

```javascript
backend.waitForPrompt()
backend.getPromptOutputs()
backend.runCurrentWorkflowAndWait()
backend.preflightCurrentWorkflow()
```

Real generation was not run because the user is on a CPU-only MacBook Air test
setup.

### Human Intervention Safeguard

Added:

```javascript
requestHumanIntervention()
```

The AI must stop and ask the human when:

```text
no safe API/browser/file path exists
model source is ambiguous or gated
license/download choice needs approval
disk/time/cost risk is high
visual evidence is unavailable
destructive action has no reliable recovery path
```

### Socket Semantic Robustness

The user noted that community nodes may have unclear socket names.

Added strategy:

```text
prefer raw socket type
normalize union socket types
infer semantic socket categories
use backend schema when possible
treat socket names only as weak hints
```

Socket outputs now include:

```text
raw type
normalized types
semantic types
compatibility explanations
```

### Human-Readable Node Labels

The user requested that AI labels preserve original node identity.

Default style:

```text
AI Label__Original ComfyUI Node
```

Example:

```text
Video Sampler__KSampler (Advanced)
Load Main Model__CheckpointLoaderSimple
```

### Control Modes

Added:

```javascript
getControlMode()
setControlMode()
```

Modes:

```text
read_only
safe_edit
full_control
```

Destructive rebuild actions require `full_control`.

### Action Log

Added:

```javascript
getActionLog()
```

This records compact browser-session actions.

### Canvas Documentation Notes

The user requested using ComfyUI note/memo nodes as human-readable workflow
documentation.

Added:

```javascript
createCanvasNote()
createRunDocumentationNotes()
```

Use cases:

```text
human instructions
AI steps
models and directories
download links
references
open questions
human intervention requests
```

### Attempt Journal

The user refined the log requirement:

Canvas notes should be concise, while detailed structured records should live in
logs/journals.

Added:

```javascript
recordAttempt()
getAttemptJournal()
```

Canvas attempt notes are concise by default:

```text
1. timestamp
Goal... Observed... Diagnosis... Changed... Result... Next...
```

Detailed fields remain in the structured journal.

### Agent Operating Protocol

Added:

```text
AGENT_OPERATING_PROTOCOL.md
```

Also exposed in the browser:

```javascript
getOperatingProtocol()
```

It defines:

```text
primary autonomous loop
machine log vs canvas note distinction
safety modes
human intervention triggers
socket strategy
node label strategy
```

## MCP TypeScript Scaffold

Created:

```text
mcp-ts/
```

Includes:

```text
package.json
tsconfig.json
src/browserBridge.ts
src/playwrightBridge.ts
src/toolCatalog.ts
src/server.ts
src/jsonlLogger.ts
```

The MCP layer remains thin:

```text
MCP tool
-> BrowserBridge
-> page.evaluate()
-> window.comfyAI
-> live ComfyUI graph
```

Browser-native MCP tools were scaffolded:

```text
browser_hard_refresh
browser_press_shortcut
```

For actions like:

```text
Command+Shift+R
Command+A
Backspace
```

MCP JSONL logging scaffold added:

```text
/Users/krishna/Desktop/ComfyAI/logs/comfyai_mcp_actions.jsonl
```

## Model Acquisition Strategy

The user noted that an AI such as Codex or Claude could:

```text
search the internet
find required model
cd to correct ComfyUI folder
download with wget/curl
verify model appears
continue
```

Recorded future model acquisition strategy:

```text
identify required model
search trusted sources
check license/file size/disk space
download to correct ComfyUI model folder
verify file
refresh/restart ComfyUI if needed
confirm dropdown/object_info availability
ask human for gated/ambiguous/license-sensitive cases
```

## UX Model

The user defined the intended UX:

```text
Human chats with AI
Human observes ComfyUI graph in another window
AI works on the graph live
Chat reports progress, blockers, and human intervention requests
Canvas contains concise documentation notes
Detailed logs remain in structured files/journals
```

This became a core design principle.

## Verification Status

Verified by user in Chrome:

```text
injector status
core ping
node listing
socket reading
connection validation
connect/disconnect visible spline
backend object_info
backend dropdown diagnostics
prompt preparation
queue dry-run
```

Not yet verified in Chrome:

```text
new snapshot/undo commands
clearWorkflow
createNode
buildTextToImageWorkflow
canvas notes
attempt journal notes
control modes
MCP TypeScript bridge
real generation queue execution
```

## Recent Git Checkpoints

Important commits include:

```text
89fdffb Add living master plan
d7e64f5 Add graph safety and node creation primitives
2fffe6a Add backend schema discovery safeguards
6d1039c Add text to image builder and prompt outputs
53d4003 Scaffold TypeScript MCP bridge
85527ba Add run and wait backend helper
1b218fa Add socket semantic matching
2b51855 Add browser action log
18aab87 Add preflight and node label preservation
1584796 Add MCP browser native tools
173c820 Add browser control modes
7de9ebd Add canvas documentation notes
8c37d19 Expose concise attempt journal tools
70cf05c Add MCP JSONL action logger
2863503 Expose safety and run tools in MCP catalog
0a5627f Add agent operating protocol
f994ad5 Expose operating protocol command
```

## Current Next Step

The next meaningful step is browser verification after hard refresh:

```javascript
window.comfyAI.getOperatingProtocol()
window.comfyAI.setControlMode("full_control")
window.comfyAI.buildTextToImageWorkflow({
  positivePrompt: "a cinematic portrait in soft window light",
  negativePrompt: "blurry, distorted",
  width: 512,
  height: 512
})
window.comfyAI.getConnectionMap()
await window.comfyAI.backend.preflightCurrentWorkflow()
await window.comfyAI.backend.queueCurrentWorkflow({ dryRun: true })
```

Real generation should remain optional because the current test machine is
CPU-only.

