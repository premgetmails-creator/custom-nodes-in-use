export type ToolSpec = {
  name: string;
  description: string;
  command?: string;
  bridgeAction?: "hardRefresh" | "pressShortcut" | "viewportScreenshot" | "healthCheck" | "listOutputMedia" | "extractVideoFrames" | "nodeKnowledgeRefresh" | "nodeKnowledgeStatus" | "nodeKnowledgeSearch" | "evaluateComfyAICommand";
  inputSchema?: Record<string, unknown>;
};

const NO_ARGS_SCHEMA = { type: "object", properties: {}, additionalProperties: false };

const oneArgSchema = (item: Record<string, unknown>) => ({
  type: "object",
  properties: {
    args: { type: "array", minItems: 1, maxItems: 1, items: [item] },
  },
  required: ["args"],
  additionalProperties: false,
});

const argsSchema = (items: Record<string, unknown>[], minItems = items.length, maxItems = items.length) => ({
  type: "object",
  properties: {
    args: { type: "array", minItems, maxItems, items },
  },
  required: ["args"],
  additionalProperties: false,
});

const NODE_ID_SCHEMA = { type: "number" };
const STRING_SCHEMA = { type: "string" };
const OBJECT_SCHEMA = { type: "object", additionalProperties: true };

export const TOOL_CATALOG: ToolSpec[] = [
  {
    name: "comfy_ping",
    description: "Check whether window.comfyAI is installed.",
    command: "ping",
    inputSchema: NO_ARGS_SCHEMA,
  },
  { name: "comfy_get_command_catalog", description: "Return the browser-side ComfyAI command catalog.", command: "getCommandCatalog", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_help", description: "Return concise browser-side ComfyAI help.", command: "help", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_operating_protocol", description: "Return the ComfyAI agent operating protocol.", command: "getOperatingProtocol" },
  { name: "comfy_get_workflow", description: "Serialize the full currently-open workflow from the live ComfyUI graph.", command: "getWorkflow" },
  { name: "comfy_list_nodes", description: "List nodes in the live graph.", command: "getNodes" },
  { name: "comfy_get_node", description: "Read one node by ID. Args: [nodeId].", command: "getNode", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  { name: "comfy_get_links", description: "Read raw graph links from the live graph.", command: "getLinks", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_graph_info", description: "Get live graph counts and metadata.", command: "getGraphInfo" },
  { name: "comfy_get_canvas_state", description: "Read current canvas viewport, scale, and selection state.", command: "getCanvasState", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_node_widgets", description: "Read widget names, values, options, and constraints for one node. Args: [nodeId].", command: "getNodeWidgets" },
  { name: "comfy_get_node_sockets", description: "Read input/output sockets and live link state for one node. Args: [nodeId].", command: "getNodeSockets" },
  { name: "comfy_get_connection_map", description: "Read all current graph links as source-to-target connection records.", command: "getConnectionMap" },
  { name: "comfy_get_connected_nodes", description: "Read nodes directly connected to one node. Args: [nodeId].", command: "getConnectedNodes", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  { name: "comfy_trace_upstream", description: "Trace upstream graph dependencies for one node. Args: [nodeId].", command: "traceUpstream", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  { name: "comfy_trace_downstream", description: "Trace downstream graph consumers for one node. Args: [nodeId].", command: "traceDownstream", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  { name: "comfy_get_selected_nodes", description: "Read currently selected graph nodes.", command: "getSelectedNodes", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_selected_node_widgets", description: "Read widgets for the current selected node(s).", command: "getSelectedNodeWidgets", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_selected_node_sockets", description: "Read sockets for the current selected node(s).", command: "getSelectedNodeSockets", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_control_mode", description: "Read current browser-core safety mode.", command: "getControlMode" },
  {
    name: "comfy_set_control_mode",
    description: "Set browser-core safety mode.",
    command: "setControlMode",
    inputSchema: {
      type: "object",
      properties: { args: { type: "array", minItems: 1, maxItems: 1, items: [{ type: "string", enum: ["read_only", "safe_edit", "full_control"] }] } },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "comfy_create_snapshot", description: "Create a graph snapshot before risky edits. Args: [reason, metadata?].", command: "createSnapshot", inputSchema: argsSchema([STRING_SCHEMA, OBJECT_SCHEMA], 1, 2) },
  { name: "comfy_list_snapshots", description: "List graph snapshots available for restore.", command: "listSnapshots", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_restore_snapshot", description: "Restore a previous graph snapshot. Args: [snapshotId].", command: "restoreSnapshot", inputSchema: oneArgSchema(STRING_SCHEMA) },
  { name: "comfy_undo_last_edit", description: "Undo the last browser-core edit when an automatic snapshot exists.", command: "undoLastEdit", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_request_human_intervention", description: "Record and surface that the agent needs human help. Args: [message].", command: "requestHumanIntervention", inputSchema: oneArgSchema(STRING_SCHEMA) },
  {
    name: "comfy_clear_workflow",
    description: "Clear the live workflow with snapshot protection. Requires args: [{ confirm: true, reason: string }].",
    command: "clearWorkflow",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: [{
            type: "object",
            properties: { confirm: { const: true }, reason: { type: "string" } },
            required: ["confirm"],
            additionalProperties: true,
          }],
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "comfy_get_registered_node_types", description: "List node types registered in the ComfyUI frontend.", command: "getRegisteredNodeTypes", inputSchema: NO_ARGS_SCHEMA },
  {
    name: "comfy_create_node",
    description: "Create one node in the live graph.",
    command: "createNode",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: [{
            type: "object",
            properties: {
              type: { type: "string" },
              nodeType: { type: "string" },
              position: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
              title: { type: "string" },
              titleMode: { type: "string" },
              widgets: { type: "object", additionalProperties: true },
            },
            additionalProperties: true,
          }],
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  {
    name: "comfy_remove_node",
    description: "Remove one node from the live graph with snapshot protection. Args: [nodeId].",
    command: "removeNode",
    inputSchema: {
      type: "object",
      properties: {
        args: { type: "array", minItems: 1, maxItems: 1, items: [{ type: "number" }] },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "comfy_select_node", description: "Select one node on the canvas. Args: [nodeId, options?].", command: "selectNode", inputSchema: argsSchema([NODE_ID_SCHEMA, OBJECT_SCHEMA], 1, 2) },
  {
    name: "comfy_select_nodes",
    description: "Select multiple nodes on the canvas. Args: [[nodeIds], options?].",
    command: "selectNodes",
    inputSchema: argsSchema([{ type: "array", items: NODE_ID_SCHEMA }, OBJECT_SCHEMA], 1, 2),
  },
  { name: "comfy_deselect_all", description: "Clear current canvas node selection.", command: "deselectAll", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_center_on_node", description: "Center the browser canvas on a node. Args: [nodeId].", command: "centerOnNode", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  {
    name: "comfy_connect_nodes",
    description: "Connect two node sockets.",
    command: "connectNodes",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: [{
            type: "object",
            properties: {
              fromNodeId: { type: "number" },
              fromOutput: {},
              toNodeId: { type: "number" },
              toInput: {},
              replaceExisting: { type: "boolean" },
            },
            required: ["fromNodeId", "fromOutput", "toNodeId", "toInput"],
            additionalProperties: true,
          }],
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "comfy_validate_connection", description: "Validate whether two sockets can connect before editing. Args: [connectionRequest].", command: "validateConnection", inputSchema: oneArgSchema(OBJECT_SCHEMA) },
  { name: "comfy_connect_input_to_output", description: "Connect an input to a compatible existing output by request object. Args: [request].", command: "connectInputToOutput", inputSchema: oneArgSchema(OBJECT_SCHEMA) },
  { name: "comfy_auto_connect_nodes", description: "Ask the browser core to auto-connect compatible sockets between nodes. Args: [request].", command: "autoConnectNodes", inputSchema: oneArgSchema(OBJECT_SCHEMA) },
  { name: "comfy_replace_connection", description: "Replace an existing graph connection. Args: [request].", command: "replaceConnection", inputSchema: oneArgSchema(OBJECT_SCHEMA) },
  { name: "comfy_disconnect_input", description: "Disconnect one node input. Args: [nodeId, inputNameOrIndex].", command: "disconnectInput", inputSchema: argsSchema([NODE_ID_SCHEMA, {}]) },
  { name: "comfy_disconnect_output", description: "Disconnect one node output. Args: [nodeId, outputNameOrIndex].", command: "disconnectOutput", inputSchema: argsSchema([NODE_ID_SCHEMA, {}]) },
  { name: "comfy_disconnect_all_inputs", description: "Disconnect all inputs on one node. Args: [nodeId].", command: "disconnectAllInputs", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  { name: "comfy_disconnect_all_outputs", description: "Disconnect all outputs on one node. Args: [nodeId].", command: "disconnectAllOutputs", inputSchema: oneArgSchema(NODE_ID_SCHEMA) },
  {
    name: "comfy_set_widget_value",
    description: "Set one widget value. Args: [nodeId, widgetNameOrIndex, value].",
    command: "setWidgetValue",
    inputSchema: argsSchema([NODE_ID_SCHEMA, {}, {}]),
  },
  { name: "comfy_batch_set_widget_values", description: "Set multiple widget values in one browser-core call. Args: [updates].", command: "batchSetWidgetValues", inputSchema: oneArgSchema({ type: "array", items: OBJECT_SCHEMA }) },
  {
    name: "comfy_build_text_to_image",
    description: "Build a basic text-to-image workflow.",
    command: "buildTextToImageWorkflow",
  },
  { name: "comfy_create_canvas_note", description: "Create a visible canvas documentation note.", command: "createCanvasNote" },
  { name: "comfy_create_run_documentation_notes", description: "Create structured canvas notes for instructions, steps, models, references, and open questions.", command: "createRunDocumentationNotes" },
  { name: "comfy_record_attempt", description: "Record one AI iteration attempt, optionally mirrored as a canvas note.", command: "recordAttempt" },
  { name: "comfy_get_attempt_journal", description: "Return the structured AI attempt journal.", command: "getAttemptJournal" },
  { name: "comfy_get_action_log", description: "Return recent browser-core actions.", command: "getActionLog" },
  { name: "comfy_backend_get_object_info", description: "Fetch ComfyUI backend /object_info through the browser page.", command: "backend.getObjectInfo", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_backend_get_queue", description: "Fetch ComfyUI backend queue state through the browser page.", command: "backend.getQueue", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_backend_get_history", description: "Fetch ComfyUI backend history through the browser page.", command: "backend.getHistory", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_backend_get_system_stats", description: "Fetch ComfyUI backend system stats through the browser page.", command: "backend.getSystemStats", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_compare_frontend_nodes_with_object_info", description: "Compare current frontend node types against backend /object_info.", command: "backend.compareFrontendNodesWithObjectInfo", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_get_dropdown_diagnostics", description: "Inspect current workflow dropdown widgets against backend model/file options.", command: "backend.getDropdownDiagnostics", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_prepare_current_prompt", description: "Prepare executable API prompt from the current browser workflow without queueing.", command: "backend.prepareCurrentPrompt", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_queue_current_workflow", description: "Queue or dry-run the current workflow.", command: "backend.queueCurrentWorkflow" },
  { name: "comfy_preflight_current_workflow", description: "Run combined readiness checks before real queue execution.", command: "backend.preflightCurrentWorkflow" },
  { name: "comfy_run_current_workflow_and_wait", description: "Queue current workflow, wait for completion, and return outputs.", command: "backend.runCurrentWorkflowAndWait" },
  { name: "comfy_wait_for_prompt", description: "Wait for a prompt to finish.", command: "backend.waitForPrompt" },
  { name: "comfy_get_prompt_outputs", description: "Get generated output metadata for a prompt.", command: "backend.getPromptOutputs" },
  { name: "comfy_get_history_for_prompt", description: "Fetch backend history for one prompt. Args: [promptId].", command: "backend.getHistoryForPrompt", inputSchema: oneArgSchema(STRING_SCHEMA) },
  { name: "comfy_interrupt", description: "Interrupt the current ComfyUI backend run.", command: "backend.interrupt", inputSchema: NO_ARGS_SCHEMA },
  { name: "comfy_search_node_definitions", description: "Search backend node definitions.", command: "backend.searchNodeDefinitions" },
  { name: "comfy_get_node_definition", description: "Fetch one backend node definition by class/type. Args: [type].", command: "backend.getNodeDefinition", inputSchema: oneArgSchema(STRING_SCHEMA) },
  { name: "comfy_get_model_catalog", description: "List model-like dropdown options.", command: "backend.getModelCatalog" },
  {
    name: "comfy_call_command",
    description: "Guarded escape hatch: call any existing window.comfyAI command path with args. Prefer named tools when available.",
    bridgeAction: "evaluateComfyAICommand",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: [{
            type: "object",
            properties: {
              command: { type: "string" },
              args: { type: "array", items: {} },
            },
            required: ["command"],
            additionalProperties: false,
          }],
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "node_knowledge_status", description: "Show the compact MCP node knowledge cache status and last refresh result.", bridgeAction: "nodeKnowledgeStatus", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "node_knowledge_refresh", description: "Fetch live ComfyUI /object_info and update the compact node knowledge cache with added/removed/changed classes.", bridgeAction: "nodeKnowledgeRefresh", inputSchema: { type: "object", properties: { args: { type: "array", maxItems: 1, items: [{ type: "object", properties: { reason: { type: "string" } }, additionalProperties: false }] } }, additionalProperties: false } },
  { name: "node_knowledge_search", description: "Search the compact cached node knowledge by class, display name, category, inputs, or outputs.", bridgeAction: "nodeKnowledgeSearch", inputSchema: { type: "object", properties: { args: { type: "array", minItems: 1, maxItems: 2, items: [{ type: "string" }, { type: "object", properties: { limit: { type: "number" } }, additionalProperties: false }] } }, required: ["args"], additionalProperties: false } },
  {
    name: "media_list_output_files",
    description: "List recent image/video files from the active ComfyUI output folder.",
    bridgeAction: "listOutputMedia",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          maxItems: 1,
          items: [{ type: "object", properties: { limit: { type: "number" }, outputDir: { type: "string" } }, additionalProperties: false }],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "media_extract_video_frames",
    description: "Extract representative frames from an output video and return them as MCP image/png content for visual artifact analysis.",
    bridgeAction: "extractVideoFrames",
    inputSchema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: [{ type: "object", properties: { path: { type: "string" }, count: { type: "number" } }, required: ["path"], additionalProperties: false }],
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "browser_health_check", description: "Check browser bridge, ComfyAI core, graph readiness, and screenshot readiness.", bridgeAction: "healthCheck", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "browser_hard_refresh", description: "Hard refresh the ComfyUI browser page, equivalent to Command+Shift+R on macOS.", bridgeAction: "hardRefresh" },
  {
    name: "browser_press_shortcut",
    description: "Press a keyboard shortcut in the ComfyUI browser page. Args: [[\"Meta\", \"Shift\", \"R\"]].",
    bridgeAction: "pressShortcut",
    inputSchema: {
      type: "object",
      properties: { args: { type: "array", minItems: 1, maxItems: 1, items: [{ type: "array", items: { type: "string" } }] } },
      required: ["args"],
      additionalProperties: false,
    },
  },
  { name: "browser_take_viewport_screenshot", description: "Capture the currently visible ComfyUI viewport. ComfyUI is an infinite canvas, so this is not a full graph screenshot.", bridgeAction: "viewportScreenshot", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
];
