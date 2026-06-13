# Change Log

## 2026-05-08

### Initial local injector scaffold and core install

- Added frontend-only ComfyUI custom node package.
- Added `WEB_DIRECTORY = "./web"` with no Python nodes.
- Added Stage 1 loader in `web/ai_loader.js`.
- Added Stage 2 reusable core installer in `web/ai_core.js`.
- Added `window.comfyAIInjector.status()`.
- Added `window.installComfyAICore(...)`.
- Added `window.comfyAI.ping()`.
- Added injector-local Git tracking.
- Browser verified `window.comfyAIInjector.status()` returns `ok: true`.
- Browser verified `window.comfyAI.ping()` returns `ok: true`.

### Stage 3 basic graph reading

- Added read-only `window.comfyAI.getWorkflow()`.
- Added read-only `window.comfyAI.getNodes()`.
- Added read-only `window.comfyAI.getNode(nodeId)`.
- Added read-only `window.comfyAI.getLinks()`.
- Added read-only `window.comfyAI.getGraphInfo()`.
- Added read-only `window.comfyAI.getCanvasState()`.
- Added normalized node, widget, socket, and link output shapes.
- Browser verified these APIs update as nodes and graph connections change.
- Added detailed maintainability comments across the Python entrypoint, loader,
  and reusable core.

### Stage 4 widget reading

- Enhanced widget metadata returned by node-reading APIs.
- Added normalized dropdown option metadata.
- Added normalized numeric metadata for min, max, step, round, and precision.
- Added text metadata for multiline state, placeholder, and string length.
- Added `window.comfyAI.getNodeWidgets(nodeId)`.
- Added `window.comfyAI.getSelectedNodeWidgets()`.

### Stage 5 socket reading

- Added enriched input socket connection metadata.
- Added enriched output socket connection metadata.
- Added `window.comfyAI.getNodeSockets(nodeId)`.
- Added `window.comfyAI.getSelectedNodeSockets()`.

### Stage 6 spline/link reading

- Added semantic connection map records.
- Added `window.comfyAI.getConnectionMap()`.
- Added `window.comfyAI.getConnectedNodes(nodeId)`.
- Added `window.comfyAI.traceUpstream(nodeId)`.
- Added `window.comfyAI.traceDownstream(nodeId)`.

### Stage 7 canvas selection and navigation

- Added `window.comfyAI.getSelectedNodes()`.
- Added `window.comfyAI.deselectAll()`.
- Added `window.comfyAI.centerOnNode(nodeId)`.
- Added `window.comfyAI.selectNode(nodeId, options)`.
- Added `window.comfyAI.selectNodes(nodeIds, options)`.

### Stage 8 safe widget editing

- Added widget lookup by index or exact name.
- Added `window.comfyAI.setWidgetValue(nodeId, widgetNameOrIndex, value)`.
- Added `window.comfyAI.batchSetWidgetValues(updates)`.
- Added old/new value reporting for widget edits.
- Added widget callback reporting.

### Stage 9-13 connection control

- Added `window.comfyAI.validateConnection(request)`.
- Added `window.comfyAI.connectNodes(request)`.
- Added `window.comfyAI.connectInputToOutput(request)`.
- Added `window.comfyAI.autoConnectNodes(request)`.
- Added `window.comfyAI.disconnectInput(nodeId, inputNameOrIndex)`.
- Added `window.comfyAI.disconnectOutput(nodeId, outputNameOrIndex)`.
- Added `window.comfyAI.disconnectAllInputs(nodeId)`.
- Added `window.comfyAI.disconnectAllOutputs(nodeId)`.
- Browser verified visible spline creation and removal with
  `VAEDecode.IMAGE -> SaveImage.images`.

### Stage 14 replace connection

- Added `window.comfyAI.replaceConnection(request)`.
- Returns old link details and new link details.

### AI usability guidance

- Added `AI_USAGE.md`.
- Added browser-accessible command catalog.
- Added `window.comfyAI.getCommandCatalog()`.
- Added `window.comfyAI.help()`.
- Documented that the primary user is an AI model, with manual DevTools usage
  only as a temporary test harness.

### Stage 16 backend API read integration

- Added `window.comfyAI.backend.getObjectInfo()`.
- Added `window.comfyAI.backend.getQueue()`.
- Added `window.comfyAI.backend.getHistory()`.
- Added `window.comfyAI.backend.getSystemStats()`.
- Added `window.comfyAI.backend.compareFrontendNodesWithObjectInfo()`.
- Browser verified object info and frontend/backend node comparison.

### Stage 17 model/file discovery

- Added `window.comfyAI.backend.getDropdownDiagnostics()`.
- Added static dropdown comparison against backend `/object_info` where
  available.
- Added closest-match suggestions for invalid dropdown values.
- Browser verified dropdown diagnostics.

### Stage 18 queue current workflow

- Added `window.comfyAI.backend.prepareCurrentPrompt()`.
- Added `window.comfyAI.backend.queueCurrentWorkflow(options)`.
- Added dry-run support for queue preflight.
- Added `window.comfyAI.backend.getHistoryForPrompt(promptId)`.
- Added `window.comfyAI.backend.interrupt()`.

### Stage 19 MCP bridge scaffold

- Added `mcp/README.md`.
- Added MCP browser bridge protocol.
- Added MCP tool catalog schemas.
- Added MCP tool dispatcher.
- Added placeholder MCP server entrypoint.
- Kept MCP thin: graph logic remains in `window.comfyAI`.

### Stage 19 browser backend abstraction

- Added provider-neutral browser command and backend info types.
- Added Playwright adapter scaffold.
- Added Puppeteer adapter scaffold.
- Documented that MCP tools must depend only on `BrowserBridge`.

### Modularity audit and public-doc preparation

- Added `ARCHITECTURE.md`.
- Added `CAPABILITIES.md`.
- Expanded `README.md`.
- Documented that `web/ai_core.js` should eventually be split into smaller
  browser-native modules without changing the public `window.comfyAI` API.

### Stage 19 MCP packaging refactor

- Moved MCP implementation package to `mcp/comfyai_mcp/`.
- Removed top-level `mcp/__init__.py` package marker.
- Avoided shadowing the future official MCP SDK package named `mcp`.
- Browser verified prompt preparation and queue dry run.
