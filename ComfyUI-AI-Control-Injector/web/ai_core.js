const CORE_VERSION = "0.1.0";

const COMMAND_CATALOG = [
  {
    name: "ping",
    category: "health",
    mutates: false,
    purpose: "Check that the reusable core is installed and the live graph/canvas can be reached.",
    when_to_use: "Use first after every browser refresh or before calling other commands.",
    example: "window.comfyAI.ping()",
  },
  {
    name: "getOperatingProtocol",
    category: "health",
    mutates: false,
    purpose: "Return the AI operating loop, logging discipline, safety rules, and human-intervention policy.",
    when_to_use: "Use at the start of an AI session to align behavior with the project goal.",
    example: "window.comfyAI.getOperatingProtocol()",
  },
  {
    name: "getWorkflow",
    category: "read_graph",
    mutates: false,
    purpose: "Return the full serialized workflow from the currently open browser graph.",
    when_to_use: "Use when an AI needs the complete current workflow without manual export.",
    example: "window.comfyAI.getWorkflow()",
  },
  {
    name: "getNodes",
    category: "read_graph",
    mutates: false,
    purpose: "List every current node with IDs, titles, widgets, sockets, position, and size.",
    when_to_use: "Use before any targeted operation so the AI can discover real node IDs.",
    example: "window.comfyAI.getNodes()",
  },
  {
    name: "getNode",
    category: "read_graph",
    mutates: false,
    purpose: "Read one node by ID, including widgets and sockets.",
    when_to_use: "Use after getNodes() when focusing on one node.",
    example: "window.comfyAI.getNode(7)",
  },
  {
    name: "getNodeWidgets",
    category: "read_widgets",
    mutates: false,
    purpose: "Read one node's widget names, indexes, values, dropdown options, and numeric/text metadata.",
    when_to_use: "Use before setWidgetValue() so the AI picks the correct widget name or index.",
    example: "window.comfyAI.getNodeWidgets(4)",
  },
  {
    name: "getSelectedNodeWidgets",
    category: "read_widgets",
    mutates: false,
    purpose: "Read widgets for nodes the human or AI has selected on the canvas.",
    when_to_use: "Use when a human selects a node and asks the AI to inspect its settings.",
    example: "window.comfyAI.getSelectedNodeWidgets()",
  },
  {
    name: "getNodeSockets",
    category: "read_sockets",
    mutates: false,
    purpose: "Read one node's input/output sockets, socket types, connected state, and link IDs.",
    when_to_use: "Use before validating, connecting, disconnecting, or auto-connecting nodes.",
    example: "window.comfyAI.getNodeSockets(7)",
  },
  {
    name: "getSelectedNodeSockets",
    category: "read_sockets",
    mutates: false,
    purpose: "Read sockets for currently selected canvas nodes.",
    when_to_use: "Use when the human selects nodes visually and the AI needs to understand possible connections.",
    example: "window.comfyAI.getSelectedNodeSockets()",
  },
  {
    name: "getConnectionMap",
    category: "read_connections",
    mutates: false,
    purpose: "Return all current splines as source node/output socket -> target node/input socket records.",
    when_to_use: "Use after connection edits to confirm the graph topology.",
    example: "window.comfyAI.getConnectionMap()",
  },
  {
    name: "getConnectedNodes",
    category: "read_connections",
    mutates: false,
    purpose: "Return direct upstream and downstream connections for one node.",
    when_to_use: "Use when diagnosing what feeds into or receives data from a node.",
    example: "window.comfyAI.getConnectedNodes(5)",
  },
  {
    name: "traceUpstream",
    category: "read_connections",
    mutates: false,
    purpose: "Recursively trace parent nodes feeding into a node.",
    when_to_use: "Use to understand required inputs and dependency chains.",
    example: "window.comfyAI.traceUpstream(7)",
  },
  {
    name: "traceDownstream",
    category: "read_connections",
    mutates: false,
    purpose: "Recursively trace child nodes receiving data from a node.",
    when_to_use: "Use to understand what a node affects downstream.",
    example: "window.comfyAI.traceDownstream(4)",
  },
  {
    name: "selectNode",
    category: "visual_navigation",
    mutates: "canvas_selection_only",
    purpose: "Select one node visually and center it by default.",
    when_to_use: "Use to point the human to a node or make selected-node commands target it.",
    example: "window.comfyAI.selectNode(7)",
  },
  {
    name: "selectNodes",
    category: "visual_navigation",
    mutates: "canvas_selection_only",
    purpose: "Select multiple nodes visually and center on the first by default.",
    when_to_use: "Use to show source/target nodes or a small repair area.",
    example: "window.comfyAI.selectNodes([5, 7])",
  },
  {
    name: "centerOnNode",
    category: "visual_navigation",
    mutates: "canvas_camera_only",
    purpose: "Move the canvas camera to a node without changing workflow data.",
    when_to_use: "Use when the AI wants the human to see a specific node.",
    example: "window.comfyAI.centerOnNode(7)",
  },
  {
    name: "setWidgetValue",
    category: "edit_widgets",
    mutates: true,
    purpose: "Change one widget value by widget index or exact widget name.",
    when_to_use: "Use after getNodeWidgets() confirms the correct widget and value type.",
    example: "window.comfyAI.setWidgetValue(4, 'ckpt_name', 'model.safetensors')",
  },
  {
    name: "batchSetWidgetValues",
    category: "edit_widgets",
    mutates: true,
    purpose: "Apply multiple widget updates and return per-update results.",
    when_to_use: "Use when changing several settings after inspecting them.",
    example: "window.comfyAI.batchSetWidgetValues([{ nodeId: 2, widget: 'steps', value: 30 }])",
  },
  {
    name: "validateConnection",
    category: "edit_connections",
    mutates: false,
    purpose: "Check if an output socket can safely connect to an input socket.",
    when_to_use: "Use before connectNodes() unless autoConnectNodes() is handling selection.",
    example: "window.comfyAI.validateConnection({ fromNodeId: 5, fromOutput: 'IMAGE', toNodeId: 7, toInput: 'images' })",
  },
  {
    name: "connectNodes",
    category: "edit_connections",
    mutates: true,
    purpose: "Create a visible spline from output socket to input socket.",
    when_to_use: "Use when source and target socket names or indexes are known.",
    example: "window.comfyAI.connectNodes({ fromNodeId: 5, fromOutput: 'IMAGE', toNodeId: 7, toInput: 'images', replaceExisting: true })",
  },
  {
    name: "connectInputToOutput",
    category: "edit_connections",
    mutates: true,
    purpose: "Same as connectNodes(), but accepts reverse wording from input to output.",
    when_to_use: "Use when a user says 'connect this input to that output'.",
    example: "window.comfyAI.connectInputToOutput({ inputNodeId: 7, input: 'images', outputNodeId: 5, output: 'IMAGE' })",
  },
  {
    name: "autoConnectNodes",
    category: "edit_connections",
    mutates: true,
    purpose: "Search both nodes and connect the best compatible output/input socket pair.",
    when_to_use: "Use when the AI knows two nodes should connect but does not know exact socket names.",
    example: "window.comfyAI.autoConnectNodes({ fromNodeId: 5, toNodeId: 7, replaceExisting: true })",
  },
  {
    name: "disconnectInput",
    category: "edit_connections",
    mutates: true,
    purpose: "Disconnect one target input socket.",
    when_to_use: "Use to remove whatever currently feeds a specific input.",
    example: "window.comfyAI.disconnectInput(7, 'images')",
  },
  {
    name: "disconnectOutput",
    category: "edit_connections",
    mutates: true,
    purpose: "Disconnect all links leaving one output socket.",
    when_to_use: "Use to stop one output from feeding downstream nodes.",
    example: "window.comfyAI.disconnectOutput(5, 'IMAGE')",
  },
  {
    name: "replaceConnection",
    category: "edit_connections",
    mutates: true,
    purpose: "Replace one target input's existing connection with a new source output.",
    when_to_use: "Use when rerouting a workflow while preserving the target input.",
    example: "window.comfyAI.replaceConnection({ toNodeId: 7, toInput: 'images', newFromNodeId: 5, newFromOutput: 'IMAGE' })",
  },
  {
    name: "backend.getObjectInfo",
    category: "backend_read",
    mutates: false,
    purpose: "Fetch ComfyUI backend node class definitions from /object_info.",
    when_to_use: "Use when an AI needs installed node schemas, required inputs, optional inputs, outputs, or categories.",
    example: "await window.comfyAI.backend.getObjectInfo()",
  },
  {
    name: "backend.getQueue",
    category: "backend_read",
    mutates: false,
    purpose: "Fetch current ComfyUI queue state from /queue.",
    when_to_use: "Use before queueing/running workflows or when checking whether work is already pending.",
    example: "await window.comfyAI.backend.getQueue()",
  },
  {
    name: "backend.getHistory",
    category: "backend_read",
    mutates: false,
    purpose: "Fetch ComfyUI generation history from /history.",
    when_to_use: "Use when an AI needs recent prompt/output metadata.",
    example: "await window.comfyAI.backend.getHistory()",
  },
  {
    name: "backend.getSystemStats",
    category: "backend_read",
    mutates: false,
    purpose: "Fetch backend system statistics from /system_stats.",
    when_to_use: "Use when an AI needs device/server status before running work.",
    example: "await window.comfyAI.backend.getSystemStats()",
  },
  {
    name: "backend.compareFrontendNodesWithObjectInfo",
    category: "backend_read",
    mutates: false,
    purpose: "Compare currently open frontend node types against backend /object_info definitions.",
    when_to_use: "Use to detect missing/unknown node types or confirm that current nodes are installed.",
    example: "await window.comfyAI.backend.compareFrontendNodesWithObjectInfo()",
  },
  {
    name: "backend.getDropdownDiagnostics",
    category: "backend_read",
    mutates: false,
    purpose: "Compare current frontend widget values with backend /object_info dropdown options where available.",
    when_to_use: "Use when an AI needs to diagnose missing model names, invalid dropdown choices, or stale widget selections.",
    example: "await window.comfyAI.backend.getDropdownDiagnostics()",
  },
  {
    name: "backend.prepareCurrentPrompt",
    category: "backend_execute",
    mutates: false,
    purpose: "Convert the current browser graph to executable prompt data without queueing it.",
    when_to_use: "Use before queueCurrentWorkflow() so an AI can inspect what will be sent to /prompt.",
    example: "await window.comfyAI.backend.prepareCurrentPrompt()",
  },
  {
    name: "backend.queueCurrentWorkflow",
    category: "backend_execute",
    mutates: true,
    purpose: "Queue the currently open browser workflow through the ComfyUI backend.",
    when_to_use: "Use only after inspection/validation when the AI intentionally wants to run the workflow.",
    example: "await window.comfyAI.backend.queueCurrentWorkflow()",
  },
  {
    name: "backend.getHistoryForPrompt",
    category: "backend_read",
    mutates: false,
    purpose: "Fetch history for one prompt ID.",
    when_to_use: "Use after queueCurrentWorkflow() returns a prompt_id.",
    example: "await window.comfyAI.backend.getHistoryForPrompt(promptId)",
  },
  {
    name: "backend.interrupt",
    category: "backend_execute",
    mutates: true,
    purpose: "Ask ComfyUI backend to interrupt current execution.",
    when_to_use: "Use when an AI must stop a running workflow.",
    example: "await window.comfyAI.backend.interrupt()",
  },
  {
    name: "backend.searchNodeDefinitions",
    category: "backend_read",
    mutates: false,
    purpose: "Search backend /object_info node definitions by class, display name, category, or input/output names.",
    when_to_use: "Use when planning which node type to create for a user goal.",
    example: "await window.comfyAI.backend.searchNodeDefinitions('checkpoint')",
  },
  {
    name: "backend.getNodeDefinition",
    category: "backend_read",
    mutates: false,
    purpose: "Return one backend node definition from /object_info.",
    when_to_use: "Use before createNode() and widget initialization.",
    example: "await window.comfyAI.backend.getNodeDefinition('CheckpointLoaderSimple')",
  },
  {
    name: "backend.getModelCatalog",
    category: "backend_read",
    mutates: false,
    purpose: "Extract model-like dropdown options from backend /object_info.",
    when_to_use: "Use when selecting checkpoints, VAEs, LoRAs, ControlNets, upscale models, or similar local model files.",
    example: "await window.comfyAI.backend.getModelCatalog()",
  },
  {
    name: "createSnapshot",
    category: "safety",
    mutates: false,
    purpose: "Save the current workflow graph in memory before risky edits.",
    when_to_use: "Use before manual experiments, clearing the graph, adding nodes, or batch edits.",
    example: "window.comfyAI.createSnapshot('before changing sampler settings')",
  },
  {
    name: "listSnapshots",
    category: "safety",
    mutates: false,
    purpose: "List in-memory workflow snapshots available for restore in this browser session.",
    when_to_use: "Use when deciding which recovery point to restore.",
    example: "window.comfyAI.listSnapshots()",
  },
  {
    name: "restoreSnapshot",
    category: "safety",
    mutates: true,
    purpose: "Restore the graph to a named snapshot ID.",
    when_to_use: "Use to recover from a bad edit after inspecting listSnapshots().",
    example: "window.comfyAI.restoreSnapshot('snap_1')",
  },
  {
    name: "undoLastEdit",
    category: "safety",
    mutates: true,
    purpose: "Restore the most recent automatic pre-edit snapshot.",
    when_to_use: "Use immediately after a graph edit produces an unwanted result.",
    example: "window.comfyAI.undoLastEdit()",
  },
  {
    name: "clearWorkflow",
    category: "workflow_edit",
    mutates: true,
    purpose: "Clear all nodes and links from the current live workflow after taking a snapshot.",
    when_to_use: "Use when the AI needs to start a new workflow from an empty canvas.",
    example: "window.comfyAI.clearWorkflow({ reason: 'start text-to-image workflow' })",
  },
  {
    name: "createNode",
    category: "workflow_edit",
    mutates: true,
    purpose: "Create one ComfyUI node by type/class name, position it, and optionally initialize widgets.",
    when_to_use: "Use after backend.getObjectInfo() confirms the desired node class exists.",
    example: "window.comfyAI.createNode({ type: 'CheckpointLoaderSimple', position: [100, 200] })",
  },
  {
    name: "removeNode",
    category: "workflow_edit",
    mutates: true,
    purpose: "Remove one node from the live graph after taking a snapshot.",
    when_to_use: "Use during troubleshooting when one node is likely causing a problem or is no longer needed.",
    example: "window.comfyAI.removeNode(12)",
  },
  {
    name: "getRegisteredNodeTypes",
    category: "read_graph",
    mutates: false,
    purpose: "List frontend/LiteGraph node types that can be created in the current browser session.",
    when_to_use: "Use before createNode() when the AI needs the exact frontend node type string.",
    example: "window.comfyAI.getRegisteredNodeTypes('Checkpoint')",
  },
  {
    name: "requestHumanIntervention",
    category: "safety",
    mutates: false,
    purpose: "Return a structured stop-and-ask response when no safe practical API/path exists.",
    when_to_use: "Use when the AI cannot safely complete a task with available graph, backend, browser, or file tools.",
    example: "window.comfyAI.requestHumanIntervention('Need the user to install a missing model file.')",
  },
  {
    name: "buildTextToImageWorkflow",
    category: "workflow_builder",
    mutates: true,
    purpose: "Build a basic text-to-image workflow from a clean graph using standard ComfyUI nodes.",
    when_to_use: "Use when a user asks to start a simple image generation workflow from scratch.",
    example: "window.comfyAI.buildTextToImageWorkflow({ positivePrompt: 'a cinematic portrait', checkpoint: 'model.safetensors' })",
  },
  {
    name: "getActionLog",
    category: "safety",
    mutates: false,
    purpose: "Return recent browser-core actions recorded for debugging and reproducibility.",
    when_to_use: "Use when the AI or human needs to inspect recent operations.",
    example: "window.comfyAI.getActionLog(50)",
  },
  {
    name: "getControlMode",
    category: "safety",
    mutates: false,
    purpose: "Read whether the browser core is in read_only, safe_edit, or full_control mode.",
    when_to_use: "Use before executing potentially destructive operations.",
    example: "window.comfyAI.getControlMode()",
  },
  {
    name: "setControlMode",
    category: "safety",
    mutates: true,
    purpose: "Set browser-core safety mode to read_only, safe_edit, or full_control.",
    when_to_use: "Use to gate AI actions based on user consent and task risk.",
    example: "window.comfyAI.setControlMode('safe_edit')",
  },
  {
    name: "createCanvasNote",
    category: "workflow_documentation",
    mutates: true,
    purpose: "Create a visible note/memo node on the ComfyUI canvas for human-readable workflow documentation.",
    when_to_use: "Use to leave instructions, AI step logs, model provenance, or references directly in the workflow.",
    example: "window.comfyAI.createCanvasNote({ title: 'AI Steps', text: 'Built text-to-image workflow...' })",
  },
  {
    name: "createRunDocumentationNotes",
    category: "workflow_documentation",
    mutates: true,
    purpose: "Create a set of note nodes for human instructions, AI steps, models, references, and open questions.",
    when_to_use: "Use after building or modifying a workflow so humans can understand how the AI got there.",
    example: "window.comfyAI.createRunDocumentationNotes({ steps: ['Created sampler'], models: ['checkpoint.safetensors'] })",
  },
  {
    name: "recordAttempt",
    category: "workflow_documentation",
    mutates: "optional_canvas_note",
    purpose: "Record one AI iteration attempt with observations, diagnosis, changes, outputs, and next steps.",
    when_to_use: "Use after each run/inspect/modify cycle so humans and future AI agents can understand the trail.",
    example: "window.comfyAI.recordAttempt({ goal: 'portrait', observation: 'hands distorted', change: 'increased negative prompt' })",
  },
  {
    name: "getAttemptJournal",
    category: "workflow_documentation",
    mutates: false,
    purpose: "Return the structured AI attempt journal for this browser session.",
    when_to_use: "Use to summarize how the AI reached the current workflow state.",
    example: "window.comfyAI.getAttemptJournal()",
  },
  {
    name: "backend.waitForPrompt",
    category: "backend_execute",
    mutates: false,
    purpose: "Poll queue/history until a queued prompt finishes, fails, or times out.",
    when_to_use: "Use after backend.queueCurrentWorkflow() returns a prompt_id.",
    example: "await window.comfyAI.backend.waitForPrompt(promptId)",
  },
  {
    name: "backend.getPromptOutputs",
    category: "backend_read",
    mutates: false,
    purpose: "Return output image/video metadata and view URLs for one prompt history record.",
    when_to_use: "Use after a prompt finishes so the AI can inspect generated outputs.",
    example: "await window.comfyAI.backend.getPromptOutputs(promptId)",
  },
  {
    name: "backend.runCurrentWorkflowAndWait",
    category: "backend_execute",
    mutates: true,
    purpose: "Queue the current workflow, wait for completion, and return output metadata.",
    when_to_use: "Use for an end-to-end run/test step after the AI has built or modified a workflow.",
    example: "await window.comfyAI.backend.runCurrentWorkflowAndWait({ timeoutMs: 300000 })",
  },
  {
    name: "backend.preflightCurrentWorkflow",
    category: "backend_read",
    mutates: false,
    purpose: "Run a combined readiness check before queueing the current workflow.",
    when_to_use: "Use before real execution to catch missing node types, invalid dropdowns, and prompt conversion errors.",
    example: "await window.comfyAI.backend.preflightCurrentWorkflow()",
  },
];

// ai_core.js is the reusable part of the project.
//
// This file should contain the actual browser-side graph-control API exposed as
// `window.comfyAI`. It should avoid depending on how it was loaded. Today the
// loader is a ComfyUI custom frontend extension, but later the same core should
// be usable from a browser extension, Playwright injection, or another local
// bridge.
//
// Important design rule:
// - Environment-specific loading, watchdogs, and app discovery belong in
//   ai_loader.js.
// - Workflow inspection and workflow editing functions belong here.

function nowIso() {
  return new Date().toISOString();
}

// All public commands should return predictable structured data. This success
// helper keeps the shape consistent for browser console users now and MCP tools
// later.
function createSuccess(action, summary, data = {}, warnings = []) {
  return {
    ok: true,
    action,
    summary,
    data,
    warnings,
  };
}

// Matching failure helper. Public commands should prefer returning this object
// instead of throwing, because an AI agent or MCP client needs stable error
// fields that can be inspected programmatically.
function createFailure(action, code, message, details = {}, suggestedFix = "") {
  return {
    ok: false,
    action,
    error: {
      code,
      message,
      details,
    },
    suggested_fix: suggestedFix,
  };
}

// Explicit stop-and-ask response for situations where the AI has no safe,
// practical route through the current APIs. This prevents fake confidence:
// future MCP tools can surface this as "human help needed" instead of blindly
// clicking, guessing, or mutating the graph.
function createHumanInterventionRequest(action, message, details = {}, requestedHelp = "") {
  return {
    ok: false,
    action,
    needs_human_intervention: true,
    error: {
      code: "HUMAN_INTERVENTION_REQUIRED",
      message,
      details,
    },
    requested_help: requestedHelp,
    suggested_fix: requestedHelp,
  };
}

function createActionLogger(options = {}) {
  const maxEntries = Number(options.maxActionLogEntries ?? options.max_action_log_entries ?? 200);
  const entries = [];
  let nextId = 1;

  function record(action, input = {}, result = null) {
    const entry = {
      id: nextId,
      at: nowIso(),
      action,
      input: safeClone(input),
      ok: result?.ok ?? null,
      summary: result?.summary ?? null,
      error_code: result?.error?.code ?? null,
      needs_human_intervention: result?.needs_human_intervention === true,
    };

    nextId += 1;
    entries.push(entry);
    while (entries.length > maxEntries) entries.shift();
    return entry;
  }

  function list(limit = 50) {
    const count = Math.max(1, Number(limit) || 50);
    return createSuccess("getActionLog", `Returned ${Math.min(count, entries.length)} action log entr${entries.length === 1 ? "y" : "ies"}.`, {
      entries: entries.slice(-count),
      count: entries.length,
      max_entries: maxEntries,
    });
  }

  return { record, list };
}

function createControlModeManager(options = {}) {
  let mode = options.controlMode ?? options.control_mode ?? "safe_edit";
  const allowedModes = new Set(["read_only", "safe_edit", "full_control"]);

  function setMode(nextMode) {
    if (!allowedModes.has(nextMode)) {
      return createFailure(
        "setControlMode",
        "INVALID_CONTROL_MODE",
        `Unknown control mode: ${nextMode}`,
        { allowed_modes: [...allowedModes] },
        "Use read_only, safe_edit, or full_control."
      );
    }
    mode = nextMode;
    return createSuccess("setControlMode", `Control mode set to ${mode}.`, { mode });
  }

  function getMode() {
    return createSuccess("getControlMode", `Current control mode is ${mode}.`, { mode });
  }

  function allow(action, risk = "edit") {
    if (mode === "read_only") {
      return createFailure(
        action,
        "CONTROL_MODE_READ_ONLY",
        `Action ${action} is blocked because control mode is read_only.`,
        { mode, risk },
        "Switch to safe_edit or full_control before mutating the workflow."
      );
    }
    if (risk === "destructive" && mode !== "full_control") {
      return createFailure(
        action,
        "CONTROL_MODE_REQUIRES_FULL_CONTROL",
        `Action ${action} requires full_control mode.`,
        { mode, risk },
        "Switch to full_control only when the human or agent intentionally allows destructive actions."
      );
    }
    return null;
  }

  return { setMode, getMode, allow };
}

function createAttemptJournal(options = {}) {
  const maxEntries = Number(options.maxAttemptEntries ?? options.max_attempt_entries ?? 100);
  const entries = [];
  let nextAttempt = 1;

  function normalizeAttempt(input = {}) {
    return {
      attempt_id: input.attemptId ?? input.attempt_id ?? `attempt_${nextAttempt}`,
      attempt_number: nextAttempt,
      recorded_at: nowIso(),
      goal: input.goal ?? null,
      workflow_state: safeClone(input.workflowState ?? input.workflow_state ?? null),
      output: safeClone(input.output ?? input.outputs ?? null),
      observation: input.observation ?? null,
      diagnosis: input.diagnosis ?? null,
      change: input.change ?? null,
      result: input.result ?? null,
      next_step: input.nextStep ?? input.next_step ?? null,
      models: safeClone(input.models ?? null),
      references: safeClone(input.references ?? null),
      human_intervention: safeClone(input.humanIntervention ?? input.human_intervention ?? null),
      raw: safeClone(input),
    };
  }

  function formatAttempt(entry) {
    const style = entry.raw?.canvasStyle ?? entry.raw?.canvas_style ?? "concise";
    if (style !== "detailed") {
      const bits = [
        entry.goal ? `Goal: ${entry.goal}` : null,
        entry.observation ? `Observed: ${entry.observation}` : null,
        entry.diagnosis ? `Diagnosis: ${entry.diagnosis}` : null,
        entry.change ? `Changed: ${entry.change}` : null,
        entry.result ? `Result: ${entry.result}` : null,
        entry.next_step ? `Next: ${entry.next_step}` : null,
      ].filter(Boolean);
      return `${entry.attempt_number}. ${entry.recorded_at}\n${bits.join(" ")}`;
    }

    const lines = [
      `# AI Attempt ${entry.attempt_number}`,
      "",
      `Recorded: ${entry.recorded_at}`,
    ];

    const fields = [
      ["Goal", entry.goal],
      ["Output", entry.output],
      ["Observation", entry.observation],
      ["Diagnosis", entry.diagnosis],
      ["Change", entry.change],
      ["Result", entry.result],
      ["Next Step", entry.next_step],
      ["Models", entry.models],
      ["References", entry.references],
      ["Human Intervention", entry.human_intervention],
    ];

    for (const [label, value] of fields) {
      if (value == null || value === "") continue;
      lines.push("", `## ${label}`);
      lines.push(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    }

    return lines.join("\n");
  }

  function record(input = {}) {
    const entry = normalizeAttempt(input);
    nextAttempt += 1;
    entries.push(entry);
    while (entries.length > maxEntries) entries.shift();
    return entry;
  }

  function list(limit = 100) {
    const count = Math.max(1, Number(limit) || 100);
    return createSuccess("getAttemptJournal", `Returned ${Math.min(count, entries.length)} attempt journal entr${entries.length === 1 ? "y" : "ies"}.`, {
      entries: entries.slice(-count),
      count: entries.length,
      max_entries: maxEntries,
    });
  }

  return { record, list, formatAttempt };
}

// ComfyUI and LiteGraph objects contain functions, circular references, canvas
// objects, and other values that are unsafe to return directly. This helper makes
// a JSON-safe copy when possible and returns a readable clone error when not.
function safeClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return {
      __comfyAI_clone_error: String(error?.message ?? error),
    };
  }
}

// Tiny health helper used by ping() and install status. It must never throw,
// because health checks should remain useful even if the graph is mid-load.
function safeNodeCount(app) {
  try {
    return app?.graph?._nodes?.length ?? 0;
  } catch (_) {
    return 0;
  }
}

// Shared readiness guard for graph-reading commands. If the graph is not ready,
// each command returns the same structured GRAPH_NOT_READY response.
function getGraphOrFailure(app, action) {
  if (!app?.graph) {
    return createFailure(
      action,
      "GRAPH_NOT_READY",
      "ComfyUI graph is not available yet.",
      {},
      "Wait for the ComfyUI canvas to finish loading, then try again."
    );
  }

  return app.graph;
}

// Widgets store their useful metadata in a few different places depending on
// node type and ComfyUI version. This helper gathers the common option fields
// into one predictable object without assuming every field exists.
function normalizeWidgetOptions(options) {
  const normalized = safeClone(options ?? {});
  const values = options?.values ?? options?.items ?? options?.choices ?? null;

  return {
    raw: normalized,
    values: Array.isArray(values) ? safeClone(values) : null,
    min: options?.min ?? null,
    max: options?.max ?? null,
    step: options?.step ?? null,
    round: options?.round ?? null,
    precision: options?.precision ?? null,
    multiline: Boolean(options?.multiline),
    placeholder: options?.placeholder ?? null,
  };
}

// Give AI callers a simple control hint so they do not have to reverse-engineer
// every ComfyUI widget type string. This is descriptive only; it does not limit
// what future editing commands may support.
function inferWidgetControl(widget) {
  const type = String(widget?.type ?? "").toLowerCase();
  const options = widget?.options ?? {};

  if (Array.isArray(options?.values) || Array.isArray(options?.items) || Array.isArray(options?.choices)) {
    return "dropdown";
  }

  if (type.includes("combo")) return "dropdown";
  if (type.includes("number") || type.includes("slider")) return "number";
  if (type.includes("toggle") || type.includes("boolean") || type.includes("checkbox")) return "boolean";
  if (options?.multiline) return "multiline_text";
  if (type.includes("text") || type.includes("string")) return "text";

  return type || "unknown";
}

// Convert a ComfyUI/LiteGraph widget into a stable JSON shape. Widget objects
// vary by node type, so the returned shape includes raw options plus normalized
// hints for dropdowns, numbers, booleans, strings, and multiline text.
function normalizeWidget(widget, index) {
  const options = normalizeWidgetOptions(widget?.options ?? {});
  const control = inferWidgetControl(widget);

  return {
    index,
    name: widget?.name ?? null,
    type: widget?.type ?? null,
    control,
    value: safeClone(widget?.value),
    options,
    dropdown_options: options.values,
    numeric: {
      min: options.min,
      max: options.max,
      step: options.step,
      round: options.round,
      precision: options.precision,
    },
    text: {
      multiline: options.multiline,
      placeholder: options.placeholder,
      length: typeof widget?.value === "string" ? widget.value.length : null,
    },
    has_callback: typeof widget?.callback === "function",
  };
}

// Convert an input socket into a stable JSON shape. `link` is the LiteGraph link
// ID connected to this input, or null/undefined when disconnected.
function normalizeInput(input, index) {
  return {
    index,
    name: input?.name ?? null,
    type: input?.type ?? null,
    normalized_types: splitSocketTypes(input?.type),
    semantic_types: inferSocketSemantic(input),
    label: input?.label ?? null,
    link: input?.link ?? null,
    connected: input?.link != null,
  };
}

// Add source-node details for a connected input socket. The base normalizeInput()
// shape stays compact, while this richer shape helps an AI understand where an
// input is currently receiving data from.
function normalizeInputWithConnection(graph, node, input, index) {
  const normalized = normalizeInput(input, index);
  const link = normalized.link != null ? normalizeLink(graph?.links?.[normalized.link]) : null;
  const sourceNode = link?.from_node_id != null ? getNodeById(graph, link.from_node_id) : null;
  const sourceOutput = sourceNode?.outputs?.[link?.from_output_index];

  return {
    ...normalized,
    connection: link
      ? {
          link_id: link.id,
          from_node_id: link.from_node_id,
          from_node_type: sourceNode?.type ?? null,
          from_node_title: sourceNode?.title ?? null,
          from_output_index: link.from_output_index,
          from_output_name: sourceOutput?.name ?? null,
          from_output_type: sourceOutput?.type ?? null,
          to_node_id: node?.id ?? null,
          to_input_index: index,
        }
      : null,
  };
}

// Convert an output socket into a stable JSON shape. Outputs can connect to many
// inputs, so they expose a list of link IDs rather than a single link.
function normalizeOutput(output, index) {
  const links = Array.isArray(output?.links) ? output.links : [];

  return {
    index,
    name: output?.name ?? null,
    type: output?.type ?? null,
    normalized_types: splitSocketTypes(output?.type),
    semantic_types: inferSocketSemantic(output),
    label: output?.label ?? null,
    links: safeClone(links),
    connected: links.length > 0,
  };
}

// Add target-node details for each connected output link. Outputs can fan out to
// multiple downstream inputs, so this returns a connection object per link ID.
function normalizeOutputWithConnections(graph, node, output, index) {
  const normalized = normalizeOutput(output, index);

  return {
    ...normalized,
    connections: normalized.links
      .map((linkId) => {
        const link = normalizeLink(graph?.links?.[linkId]);
        const targetNode = link?.to_node_id != null ? getNodeById(graph, link.to_node_id) : null;
        const targetInput = targetNode?.inputs?.[link?.to_input_index];

        if (!link) {
          return null;
        }

        return {
          link_id: link.id,
          from_node_id: node?.id ?? null,
          from_output_index: index,
          to_node_id: link.to_node_id,
          to_node_type: targetNode?.type ?? null,
          to_node_title: targetNode?.title ?? null,
          to_input_index: link.to_input_index,
          to_input_name: targetInput?.name ?? null,
          to_input_type: targetInput?.type ?? null,
        };
      })
      .filter(Boolean),
  };
}

// Normalize a live LiteGraph node. This is intentionally a compact but useful
// view of the node: identity, layout, widgets, sockets, flags, and properties.
// Later stages can add richer backend schema descriptions, but this shape is
// enough for the AI to inspect the current browser workflow.
function normalizeNode(node) {
  return {
    id: node?.id ?? null,
    type: node?.type ?? null,
    title: node?.title ?? null,
    mode: node?.mode ?? null,
    pos: safeClone(node?.pos ?? null),
    size: safeClone(node?.size ?? null),
    flags: safeClone(node?.flags ?? {}),
    properties: safeClone(node?.properties ?? {}),
    widgets: (node?.widgets ?? []).map(normalizeWidget),
    inputs: (node?.inputs ?? []).map(normalizeInput),
    outputs: (node?.outputs ?? []).map(normalizeOutput),
  };
}

// LiteGraph links may appear as live objects in the browser or as serialized
// arrays in exported workflow JSON. Supporting both now prevents fragile logic
// later when graph links are compared against serialized workflows.
function normalizeLink(link) {
  if (!link) {
    return null;
  }

  if (Array.isArray(link)) {
    return {
      id: link[0] ?? null,
      from_node_id: link[1] ?? null,
      from_output_index: link[2] ?? null,
      to_node_id: link[3] ?? null,
      to_input_index: link[4] ?? null,
      type: link[5] ?? null,
      raw: safeClone(link),
    };
  }

  if (typeof link === "object") {
    return {
      id: link.id ?? null,
      from_node_id: link.origin_id ?? null,
      from_output_index: link.origin_slot ?? null,
      to_node_id: link.target_id ?? null,
      to_input_index: link.target_slot ?? null,
      type: link.type ?? null,
      raw: safeClone(link),
    };
  }

  return {
    id: null,
    from_node_id: null,
    from_output_index: null,
    to_node_id: null,
    to_input_index: null,
    type: null,
    raw: safeClone(link),
  };
}

// Read the current graph's node list defensively. ComfyUI typically keeps nodes
// in `graph._nodes`, but this helper gives us one place to adapt if that changes.
function getGraphNodes(graph) {
  return Array.isArray(graph?._nodes) ? graph._nodes : [];
}

// Return normalized links regardless of whether LiteGraph stores them as an
// object map or an array. Public commands should not expose storage differences.
function getGraphLinks(graph) {
  const links = graph?.links ?? {};

  if (Array.isArray(links)) {
    return links.filter(Boolean).map(normalizeLink);
  }

  return Object.values(links).filter(Boolean).map(normalizeLink);
}

function getGraphSummary(graph) {
  return {
    node_count: getGraphNodes(graph).length,
    link_count: getGraphLinks(graph).length,
    last_node_id: graph?.last_node_id ?? null,
    last_link_id: graph?.last_link_id ?? null,
    groups_count: Array.isArray(graph?._groups) ? graph._groups.length : 0,
  };
}

// Prefer LiteGraph's built-in lookup when available, then fall back to scanning
// the current node list. This keeps getNode() usable across frontend variants.
function getNodeById(graph, nodeId) {
  const numericId = Number(nodeId);

  if (typeof graph?.getNodeById === "function") {
    return graph.getNodeById(numericId);
  }

  return getGraphNodes(graph).find((node) => Number(node.id) === numericId) ?? null;
}

// Dedicated widget response for a node. getNode() includes widgets too, but this
// narrower shape is convenient when an AI only wants settings and not sockets,
// links, or layout.
function getNodeWidgetsPayload(node) {
  const widgets = (node?.widgets ?? []).map(normalizeWidget);

  return {
    node_id: node?.id ?? null,
    node_type: node?.type ?? null,
    node_title: node?.title ?? null,
    widgets,
    count: widgets.length,
    has_widgets: widgets.length > 0,
  };
}

function findWidgetWithIndex(node, widgetNameOrIndex) {
  const widgets = node?.widgets ?? [];

  if (typeof widgetNameOrIndex === "number") {
    const widget = widgets[widgetNameOrIndex];

    return widget
      ? { widget, index: widgetNameOrIndex }
      : null;
  }

  const index = widgets.findIndex((widget) => widget?.name === widgetNameOrIndex);

  return index >= 0
    ? { widget: widgets[index], index }
    : null;
}

function callWidgetCallback(app, node, widget, value) {
  if (typeof widget?.callback !== "function") {
    return {
      called: false,
      error: null,
    };
  }

  try {
    widget.callback(value, app.canvas, node, app.canvas?.graph_mouse, {});

    return {
      called: true,
      error: null,
    };
  } catch (error) {
    return {
      called: true,
      error: String(error?.message ?? error),
    };
  }
}

function setWidgetValuePayload(app, graph, nodeId, widgetNameOrIndex, value) {
  const node = getNodeById(graph, nodeId);

  if (!node) {
    return createFailure(
      "setWidgetValue",
      "NODE_NOT_FOUND",
      `Node not found: ${nodeId}`,
      { node_id: nodeId },
      "Call window.comfyAI.getNodes() to see available node IDs."
    );
  }

  const found = findWidgetWithIndex(node, widgetNameOrIndex);

  if (!found) {
    return createFailure(
      "setWidgetValue",
      "WIDGET_NOT_FOUND",
      `Widget not found on node ${node.id}: ${widgetNameOrIndex}`,
      {
        node_id: node.id,
        widget: widgetNameOrIndex,
        available_widgets: (node.widgets ?? []).map((widget, index) => ({
          index,
          name: widget?.name ?? null,
          type: widget?.type ?? null,
        })),
      },
      "Call window.comfyAI.getNodeWidgets(nodeId) to see available widgets."
    );
  }

  const { widget, index } = found;
  const oldValue = safeClone(widget.value);
  widget.value = value;
  const callback = callWidgetCallback(app, node, widget, value);
  markCanvasDirty(app);

  return createSuccess("setWidgetValue", `Updated widget ${widget.name ?? index} on node ${node.id}.`, {
    node_id: node.id,
    node_type: node.type ?? null,
    node_title: node.title ?? null,
    widget_index: index,
    widget_name: widget.name ?? null,
    widget_type: widget.type ?? null,
    old_value: oldValue,
    new_value: safeClone(widget.value),
    callback,
  }, callback.error ? [`Widget callback reported an error: ${callback.error}`] : []);
}

// Dedicated socket payload for one node. Stage 5 needs a focused socket view
// that is easier to scan than the full getNode() payload.
function getNodeSocketsPayload(graph, node) {
  const inputs = (node?.inputs ?? []).map((input, index) =>
    normalizeInputWithConnection(graph, node, input, index)
  );
  const outputs = (node?.outputs ?? []).map((output, index) =>
    normalizeOutputWithConnections(graph, node, output, index)
  );

  return {
    node_id: node?.id ?? null,
    node_type: node?.type ?? null,
    node_title: node?.title ?? null,
    inputs,
    outputs,
    input_count: inputs.length,
    output_count: outputs.length,
  };
}

// Build a human/AI-friendly connection object from a raw LiteGraph link. The
// result names both endpoint nodes and both endpoint sockets, which is much
// easier for an AI to reason about than only numeric IDs.
function describeConnection(graph, rawLink) {
  const link = normalizeLink(rawLink);

  if (!link) {
    return null;
  }

  const sourceNode = link.from_node_id != null ? getNodeById(graph, link.from_node_id) : null;
  const targetNode = link.to_node_id != null ? getNodeById(graph, link.to_node_id) : null;
  const sourceOutput = sourceNode?.outputs?.[link.from_output_index];
  const targetInput = targetNode?.inputs?.[link.to_input_index];

  return {
    link_id: link.id,
    type: link.type ?? sourceOutput?.type ?? targetInput?.type ?? null,
    from: {
      node_id: link.from_node_id,
      node_type: sourceNode?.type ?? null,
      node_title: sourceNode?.title ?? null,
      output_index: link.from_output_index,
      output_name: sourceOutput?.name ?? null,
      output_type: sourceOutput?.type ?? null,
    },
    to: {
      node_id: link.to_node_id,
      node_type: targetNode?.type ?? null,
      node_title: targetNode?.title ?? null,
      input_index: link.to_input_index,
      input_name: targetInput?.name ?? null,
      input_type: targetInput?.type ?? null,
    },
    summary: `${sourceNode?.title ?? sourceNode?.type ?? link.from_node_id}.${sourceOutput?.name ?? link.from_output_index} -> ${targetNode?.title ?? targetNode?.type ?? link.to_node_id}.${targetInput?.name ?? link.to_input_index}`,
    raw: link.raw,
  };
}

function getConnectionMapPayload(graph) {
  const connections = getGraphLinks(graph)
    .map((link) => describeConnection(graph, link.raw ?? link))
    .filter(Boolean);

  return {
    connections,
    count: connections.length,
  };
}

function getConnectedNodesPayload(graph, node) {
  const nodeId = Number(node?.id);
  const connections = getConnectionMapPayload(graph).connections;
  const incoming = connections.filter((connection) => Number(connection.to.node_id) === nodeId);
  const outgoing = connections.filter((connection) => Number(connection.from.node_id) === nodeId);

  return {
    node_id: node?.id ?? null,
    node_type: node?.type ?? null,
    node_title: node?.title ?? null,
    incoming,
    outgoing,
    incoming_count: incoming.length,
    outgoing_count: outgoing.length,
    upstream_node_ids: [...new Set(incoming.map((connection) => connection.from.node_id))],
    downstream_node_ids: [...new Set(outgoing.map((connection) => connection.to.node_id))],
  };
}

function traceGraph(graph, startNode, direction) {
  const startNodeId = Number(startNode?.id);
  const connections = getConnectionMapPayload(graph).connections;
  const visited = new Set();
  const queue = [{ node_id: startNodeId, depth: 0, via: null }];
  const result = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current.node_id)) {
      continue;
    }

    visited.add(current.node_id);

    const node = getNodeById(graph, current.node_id);
    result.push({
      node_id: current.node_id,
      node_type: node?.type ?? null,
      node_title: node?.title ?? null,
      depth: current.depth,
      via: current.via,
    });

    const nextConnections =
      direction === "upstream"
        ? connections.filter((connection) => Number(connection.to.node_id) === current.node_id)
        : connections.filter((connection) => Number(connection.from.node_id) === current.node_id);

    for (const connection of nextConnections) {
      const nextNodeId =
        direction === "upstream"
          ? Number(connection.from.node_id)
          : Number(connection.to.node_id);

      if (!visited.has(nextNodeId)) {
        queue.push({
          node_id: nextNodeId,
          depth: current.depth + 1,
          via: connection,
        });
      }
    }
  }

  return {
    start_node_id: startNodeId,
    direction,
    nodes: result,
    count: result.length,
  };
}

function getCanvasOrFailure(app, action) {
  if (!app?.canvas) {
    return createFailure(
      action,
      "CANVAS_NOT_READY",
      "ComfyUI canvas is not available yet.",
      {},
      "Wait for the ComfyUI canvas to finish loading, then try again."
    );
  }

  return app.canvas;
}

function markCanvasDirty(app) {
  try {
    app?.graph?.setDirtyCanvas?.(true, true);
  } catch (_) {}

  try {
    app?.canvas?.setDirty?.(true, true);
  } catch (_) {}
}

function clearWorkflowPayload(app, graph) {
  const before = getGraphSummary(graph);
  let method = null;

  clearCanvasSelection(app?.canvas);

  if (typeof graph.clear === "function") {
    graph.clear();
    method = "graph.clear";
  } else if (typeof graph.configure === "function") {
    graph.configure({
      last_node_id: 0,
      last_link_id: 0,
      nodes: [],
      links: [],
      groups: [],
      config: {},
      extra: {},
      version: graph.version ?? 0,
    });
    method = "graph.configure_empty_workflow";
  } else {
    return createFailure(
      "clearWorkflow",
      "CLEAR_UNAVAILABLE",
      "Neither graph.clear() nor graph.configure() is available.",
      { graph_keys: Object.keys(graph ?? {}) },
      "Use the future BrowserBridge keyboard fallback: Command+A then Backspace."
    );
  }

  markCanvasDirty(app);

  const after = getGraphSummary(graph);

  return createSuccess("clearWorkflow", `Cleared ${before.node_count} node(s) and ${before.link_count} link(s).`, {
    method,
    before,
    after,
  });
}

function normalizePosition(position, fallback = [0, 0]) {
  if (Array.isArray(position) && position.length >= 2) {
    return [Number(position[0]) || 0, Number(position[1]) || 0];
  }

  if (position && typeof position === "object") {
    return [Number(position.x) || 0, Number(position.y) || 0];
  }

  return fallback;
}

function formatNodeTitle(node, requestedTitle, mode = "prefix_original") {
  const label = String(requestedTitle ?? "").trim();
  const original = String(node?.title ?? node?.type ?? "").trim();

  if (!label) return original;
  if (!original) return label;
  if (mode === "replace") return label;
  if (mode === "append_original") return `${label}__${original}`;
  if (mode === "prefix_original") return `${label}__${original}`;
  if (mode === "suffix_label") return `${original}__${label}`;

  return `${label}__${original}`;
}

function createNodeInstance(LiteGraph, type) {
  if (!type) {
    return {
      node: null,
      error: createFailure(
        "createNode",
        "NODE_TYPE_MISSING",
        "A node type/class name is required.",
        {},
        "Pass a ComfyUI node class such as 'CheckpointLoaderSimple'."
      ),
    };
  }

  if (typeof LiteGraph?.createNode !== "function") {
    return {
      node: null,
      error: createFailure(
        "createNode",
        "LITEGRAPH_CREATE_NODE_UNAVAILABLE",
        "LiteGraph.createNode() is not available.",
        { litegraph_available: Boolean(LiteGraph) },
        "Confirm the ComfyUI frontend LiteGraph object is available to the core installer."
      ),
    };
  }

  const node = LiteGraph.createNode(type);

  if (!node) {
    return {
      node: null,
      error: createFailure(
        "createNode",
        "NODE_TYPE_NOT_REGISTERED",
        `LiteGraph could not create node type: ${type}`,
        {
          requested_type: type,
          registered_type_count: Object.keys(LiteGraph?.registered_node_types ?? {}).length,
          close_registered_types: closestMatches(type, Object.keys(LiteGraph?.registered_node_types ?? {}), 10),
        },
        "Call backend.getObjectInfo() and use the exact node class/type name, or confirm the custom node loaded in the frontend."
      ),
    };
  }

  return { node, error: null };
}

function getRegisteredNodeTypesPayload(LiteGraph, search = "") {
  const registered = LiteGraph?.registered_node_types ?? {};
  const needle = normalizeSearchText(search);
  const types = Object.entries(registered)
    .map(([type, constructor]) => ({
      type,
      title: constructor?.title ?? constructor?.nodeData?.display_name ?? null,
      category: constructor?.category ?? constructor?.nodeData?.category ?? null,
    }))
    .filter((item) => {
      if (!needle) return true;
      return (
        normalizeSearchText(item.type).includes(needle) ||
        normalizeSearchText(item.title).includes(needle) ||
        normalizeSearchText(item.category).includes(needle)
      );
    })
    .sort((a, b) => String(a.type).localeCompare(String(b.type)));

  return {
    types,
    count: types.length,
    total_registered_count: Object.keys(registered).length,
    search: search || "",
    litegraph_available: Boolean(LiteGraph),
  };
}

function applyInitialWidgetValues(app, graph, node, widgetValues) {
  if (!widgetValues || typeof widgetValues !== "object") {
    return [];
  }

  const entries = Array.isArray(widgetValues)
    ? widgetValues.map((value, index) => [index, value])
    : Object.entries(widgetValues);

  return entries.map(([widget, value]) =>
    setWidgetValuePayload(app, graph, node.id, /^\d+$/.test(String(widget)) ? Number(widget) : widget, value)
  );
}

function createNodePayload(app, graph, LiteGraph, request = {}) {
  const type = request.type ?? request.nodeType ?? request.node_type ?? request.class_type;
  const { node, error } = createNodeInstance(LiteGraph, type);

  if (error) {
    return error;
  }

  const position = normalizePosition(request.position ?? request.pos, [0, 0]);
  node.pos = position;

  if (request.title != null) {
    node.title = formatNodeTitle(node, request.title, request.titleMode ?? request.title_mode);
  }

  if (typeof graph.add !== "function") {
    return createFailure(
      "createNode",
      "GRAPH_ADD_UNAVAILABLE",
      "ComfyUI graph.add() is not available.",
      { requested_type: type },
      "Confirm this ComfyUI frontend exposes LiteGraph graph.add()."
    );
  }

  graph.add(node);

  if (Array.isArray(request.size) && request.size.length >= 2) {
    node.size = [Number(request.size[0]) || node.size?.[0] || 0, Number(request.size[1]) || node.size?.[1] || 0];
  }

  const widgetResults = applyInitialWidgetValues(app, graph, node, request.widgets ?? request.widget_values);
  markCanvasDirty(app);

  return createSuccess("createNode", `Created node ${node.id} of type ${node.type}.`, {
    node: normalizeNode(node),
    sockets: getNodeSocketsPayload(graph, node),
    widgets: getNodeWidgetsPayload(node),
    widget_results: widgetResults,
    widget_success_count: widgetResults.filter((result) => result?.ok).length,
    widget_failure_count: widgetResults.filter((result) => !result?.ok).length,
  }, widgetResults.some((result) => !result?.ok) ? ["Some initial widget values could not be applied."] : []);
}

function setNoteTextBestEffort(app, graph, node, text) {
  const value = String(text ?? "");
  const widgetNames = ["text", "note", "content", "body", "Text", "Note"];
  const results = [];

  for (const name of widgetNames) {
    if ((node.widgets ?? []).some((widget) => normalizeSearchText(widget?.name) === normalizeSearchText(name))) {
      results.push(setWidgetValuePayload(app, graph, node.id, name, value));
    }
  }

  if (results.length === 0 && (node.widgets ?? []).length > 0) {
    const textWidgetIndex = (node.widgets ?? []).findIndex((widget) => {
      const control = inferWidgetControl(widget);
      return ["text", "multiline_text", "unknown"].includes(control);
    });
    if (textWidgetIndex >= 0) {
      results.push(setWidgetValuePayload(app, graph, node.id, textWidgetIndex, value));
    }
  }

  node.properties = node.properties ?? {};
  node.properties.text = value;
  node.properties.note = value;
  node.properties.comfy_ai_note = true;

  if ("text" in node) node.text = value;
  if ("value" in node) node.value = value;

  return results;
}

function createCanvasNotePayload(app, graph, LiteGraph, request = {}) {
  const title = request.title ?? request.heading ?? "ComfyAI Note";
  const text = request.text ?? request.body ?? request.content ?? "";
  const position = normalizePosition(request.position ?? request.pos, [0, 0]);
  const noteTypes = request.type
    ? [request.type]
    : ["Note", "MarkdownNote", "Markdown Note", "NoteNode", "PrimitiveNode"];

  const attempts = [];
  let createdResult = null;

  for (const type of noteTypes) {
    const result = createNodePayload(app, graph, LiteGraph, {
      type,
      position,
      title,
      titleMode: request.titleMode ?? request.title_mode ?? "prefix_original",
      size: request.size ?? [360, 220],
    });
    attempts.push({ type, ok: result.ok, error: result.error ?? null });
    if (result.ok) {
      createdResult = result;
      break;
    }
  }

  if (!createdResult) {
    return createHumanInterventionRequest(
      "createCanvasNote",
      "Could not create a canvas note node because no known note node type was available.",
      { attempts },
      "Please create a ComfyUI Note node manually or tell the AI the exact note node type registered in this ComfyUI build."
    );
  }

  const node = getNodeById(graph, createdResult.data.node.id);
  const textResults = node ? setNoteTextBestEffort(app, graph, node, text) : [];
  if (node && request.color) node.color = request.color;
  if (node && request.bgcolor) node.bgcolor = request.bgcolor;
  markCanvasDirty(app);

  return createSuccess("createCanvasNote", `Created canvas note ${createdResult.data.node.id}.`, {
    node: node ? normalizeNode(node) : createdResult.data.node,
    note_type_attempts: attempts,
    text_results: textResults,
    text_applied_best_effort: true,
    text,
  }, textResults.some((result) => !result?.ok) ? ["Some note text widget updates failed; text was also stored in node properties."] : []);
}

function formatNoteSection(title, value) {
  if (Array.isArray(value)) {
    return [`# ${title}`, "", ...value.map((item) => `- ${item}`)].join("\n");
  }
  if (value && typeof value === "object") {
    return [`# ${title}`, "", JSON.stringify(value, null, 2)].join("\n");
  }
  return [`# ${title}`, "", String(value ?? "")].join("\n");
}

function createRunDocumentationNotesPayload(app, graph, LiteGraph, request = {}) {
  const base = normalizePosition(request.position ?? request.pos, [-520, -120]);
  const gapY = Number(request.gapY ?? request.gap_y ?? 260);
  const sections = [
    ["Human Instructions", request.humanInstructions ?? request.human_instructions],
    ["AI Steps With Timestamps", request.steps],
    ["Models And Sources", request.models],
    ["References", request.references],
    ["Open Questions / Human Intervention", request.openQuestions ?? request.open_questions],
  ].filter(([, value]) => value != null && !(Array.isArray(value) && value.length === 0));

  const results = sections.map(([title, value], index) =>
    createCanvasNotePayload(app, graph, LiteGraph, {
      title,
      text: formatNoteSection(title, value),
      position: [base[0], base[1] + index * gapY],
      color: request.color,
      bgcolor: request.bgcolor,
    })
  );

  return createSuccess("createRunDocumentationNotes", `Created ${results.filter((result) => result.ok).length} documentation note(s).`, {
    results,
    success_count: results.filter((result) => result.ok).length,
    failure_count: results.filter((result) => !result.ok).length,
  }, results.some((result) => !result.ok) ? ["Some documentation notes could not be created."] : []);
}

function firstFailure(results) {
  return results.find((result) => result?.ok === false) ?? null;
}

function buildTextToImageWorkflowPayload(app, graph, LiteGraph, request = {}) {
  const positivePrompt = request.positivePrompt ?? request.positive_prompt ?? request.prompt ?? "";
  const negativePrompt = request.negativePrompt ?? request.negative_prompt ?? "";
  const checkpoint = request.checkpoint ?? request.ckpt_name ?? null;
  const width = Number(request.width ?? 512);
  const height = Number(request.height ?? 512);
  const batchSize = Number(request.batchSize ?? request.batch_size ?? 1);
  const steps = Number(request.steps ?? 20);
  const cfg = Number(request.cfg ?? 7);
  const samplerName = request.samplerName ?? request.sampler_name ?? "euler";
  const scheduler = request.scheduler ?? "normal";
  const denoise = Number(request.denoise ?? 1);
  const seed = Number(request.seed ?? Math.floor(Math.random() * 1000000000000000));
  const filenamePrefix = request.filenamePrefix ?? request.filename_prefix ?? "ComfyAI";

  const clearResult = clearWorkflowPayload(app, graph);
  if (!clearResult.ok) return clearResult;

  const created = {};
  const nodeResults = [];

  function make(key, type, position, title, widgets = {}) {
    const result = createNodePayload(app, graph, LiteGraph, { type, position, title, widgets });
    nodeResults.push(result);
    if (result.ok) created[key] = result.data.node;
    return result;
  }

  make("checkpoint", "CheckpointLoaderSimple", [0, 80], "Load Checkpoint", checkpoint ? { ckpt_name: checkpoint } : {});
  make("positive", "CLIPTextEncode", [320, 0], "Positive Prompt", { text: positivePrompt });
  make("negative", "CLIPTextEncode", [320, 180], "Negative Prompt", { text: negativePrompt });
  make("latent", "EmptyLatentImage", [320, 360], "Empty Latent", {
    width,
    height,
    batch_size: batchSize,
  });
  make("sampler", "KSampler", [680, 160], "Sampler", {
    seed,
    steps,
    cfg,
    sampler_name: samplerName,
    scheduler,
    denoise,
  });
  make("decode", "VAEDecode", [1020, 170], "VAE Decode");
  make("save", "SaveImage", [1320, 170], "Save Image", {
    filename_prefix: filenamePrefix,
  });

  const nodeFailure = firstFailure(nodeResults);
  if (nodeFailure) {
    return createFailure(
      "buildTextToImageWorkflow",
      "NODE_CREATION_FAILED",
      "One or more nodes could not be created.",
      { node_results: nodeResults },
      "Call getRegisteredNodeTypes() and backend.searchNodeDefinitions() to confirm exact node type names."
    );
  }

  const connections = [
    ["checkpoint", "MODEL", "sampler", "model"],
    ["checkpoint", "CLIP", "positive", "clip"],
    ["checkpoint", "CLIP", "negative", "clip"],
    ["checkpoint", "VAE", "decode", "vae"],
    ["positive", "CONDITIONING", "sampler", "positive"],
    ["negative", "CONDITIONING", "sampler", "negative"],
    ["latent", "LATENT", "sampler", "latent_image"],
    ["sampler", "LATENT", "decode", "samples"],
    ["decode", "IMAGE", "save", "images"],
  ];

  const connectionResults = connections.map(([fromKey, fromOutput, toKey, toInput]) =>
    connectNodesPayload(app, graph, {
      fromNodeId: created[fromKey].id,
      fromOutput,
      toNodeId: created[toKey].id,
      toInput,
      replaceExisting: true,
    })
  );

  const connectionFailure = firstFailure(connectionResults);
  if (connectionFailure) {
    return createFailure(
      "buildTextToImageWorkflow",
      "CONNECTION_FAILED",
      "One or more standard text-to-image connections failed.",
      {
        node_results: nodeResults,
        connection_results: connectionResults,
      },
      "Inspect getNodeSockets() for the created nodes; this ComfyUI version or custom node may use different socket names."
    );
  }

  markCanvasDirty(app);

  return createSuccess("buildTextToImageWorkflow", "Built a basic text-to-image workflow.", {
    parameters: {
      positive_prompt: positivePrompt,
      negative_prompt: negativePrompt,
      checkpoint,
      width,
      height,
      batch_size: batchSize,
      steps,
      cfg,
      sampler_name: samplerName,
      scheduler,
      denoise,
      seed,
      filename_prefix: filenamePrefix,
    },
    nodes: created,
    node_results: nodeResults,
    connection_results: connectionResults,
    graph: getGraphSummary(graph),
    connection_map: getConnectionMapPayload(graph),
  });
}

// Browser-session safety net for graph edits. Snapshots are intentionally kept
// in memory for now: they are fast, do not touch workflow files, and give an AI
// a reliable "go back one edit" tool before stronger editing commands arrive.
function createSnapshotManager(app, options = {}) {
  const maxSnapshots = Number(options.maxSnapshots ?? options.max_snapshots ?? 50);
  const snapshots = [];
  let nextSnapshotNumber = 1;

  function summarizeWorkflow(workflow) {
    const nodes = workflow?.nodes ?? [];
    const links = workflow?.links ?? [];

    return {
      node_count: Array.isArray(nodes) ? nodes.length : 0,
      link_count: Array.isArray(links) ? links.length : 0,
      last_node_id: workflow?.last_node_id ?? null,
      last_link_id: workflow?.last_link_id ?? null,
    };
  }

  function create(reason = "manual", metadata = {}) {
    const graph = getGraphOrFailure(app, "createSnapshot");
    if (graph?.ok === false) return graph;

    if (typeof graph.serialize !== "function") {
      return createFailure(
        "createSnapshot",
        "SERIALIZE_UNAVAILABLE",
        "ComfyUI graph.serialize() is not available.",
        {},
        "Snapshots require a LiteGraph-compatible graph serializer."
      );
    }

    const workflow = safeClone(graph.serialize());
    const snapshot = {
      id: `snap_${nextSnapshotNumber}`,
      number: nextSnapshotNumber,
      reason: String(reason || "manual"),
      created_at: nowIso(),
      summary: summarizeWorkflow(workflow),
      metadata: safeClone(metadata ?? {}),
      workflow,
    };

    nextSnapshotNumber += 1;
    snapshots.push(snapshot);

    while (snapshots.length > maxSnapshots) {
      snapshots.shift();
    }

    return createSuccess("createSnapshot", `Created snapshot ${snapshot.id}.`, {
      snapshot: {
        id: snapshot.id,
        number: snapshot.number,
        reason: snapshot.reason,
        created_at: snapshot.created_at,
        summary: snapshot.summary,
        metadata: snapshot.metadata,
      },
      retained_count: snapshots.length,
      max_snapshots: maxSnapshots,
    });
  }

  function list() {
    return createSuccess("listSnapshots", `Found ${snapshots.length} snapshot(s).`, {
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        number: snapshot.number,
        reason: snapshot.reason,
        created_at: snapshot.created_at,
        summary: snapshot.summary,
        metadata: snapshot.metadata,
      })),
      count: snapshots.length,
      max_snapshots: maxSnapshots,
    });
  }

  function restore(snapshotId, action = "restoreSnapshot") {
    const graph = getGraphOrFailure(app, action);
    if (graph?.ok === false) return graph;

    const snapshot =
      snapshotId == null
        ? snapshots[snapshots.length - 1]
        : snapshots.find((item) => item.id === snapshotId || item.number === Number(snapshotId));

    if (!snapshot) {
      return createFailure(
        action,
        "SNAPSHOT_NOT_FOUND",
        `Snapshot not found: ${snapshotId ?? "(latest)"}`,
        { snapshot_id: snapshotId, available_snapshot_ids: snapshots.map((item) => item.id) },
        "Call window.comfyAI.listSnapshots() to see available snapshots."
      );
    }

    if (typeof graph.configure !== "function") {
      return createFailure(
        action,
        "CONFIGURE_UNAVAILABLE",
        "ComfyUI graph.configure() is not available.",
        {},
        "This ComfyUI frontend does not expose the LiteGraph restore API expected by snapshots."
      );
    }

    const before = create(`automatic_before_${action}`, {
      requested_restore_snapshot_id: snapshot.id,
      automatic: true,
    });

    if (!before.ok) {
      return before;
    }

    try {
      graph.configure(safeClone(snapshot.workflow));
      markCanvasDirty(app);

      return createSuccess(action, `Restored snapshot ${snapshot.id}.`, {
        restored_snapshot: {
          id: snapshot.id,
          number: snapshot.number,
          reason: snapshot.reason,
          created_at: snapshot.created_at,
          summary: snapshot.summary,
          metadata: snapshot.metadata,
        },
        rollback_snapshot: before.data.snapshot,
      });
    } catch (error) {
      return createFailure(
        action,
        "SNAPSHOT_RESTORE_FAILED",
        `Failed to restore snapshot ${snapshot.id}.`,
        {
          snapshot_id: snapshot.id,
          message: String(error?.message ?? error),
        },
        "Use listSnapshots() and try restoring an earlier snapshot, or refresh ComfyUI if the graph is inconsistent."
      );
    }
  }

  function latestAutomaticPreEdit() {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      if (snapshots[index]?.metadata?.automatic_pre_edit === true) {
        return snapshots[index];
      }
    }

    return null;
  }

  function undoLastEdit() {
    const snapshot = latestAutomaticPreEdit();

    if (!snapshot) {
      return createFailure(
        "undoLastEdit",
        "NO_PRE_EDIT_SNAPSHOT",
        "No automatic pre-edit snapshot is available.",
        {},
        "Call createSnapshot() manually before experimenting, or make an edit with automatic snapshots enabled."
      );
    }

    return restore(snapshot.id, "undoLastEdit");
  }

  function beforeEdit(action, details = {}) {
    return create(`before_${action}`, {
      automatic_pre_edit: true,
      action,
      details: safeClone(details ?? {}),
    });
  }

  return {
    create,
    list,
    restore,
    undoLastEdit,
    beforeEdit,
  };
}

function getSelectedNodesPayload(canvas) {
  const nodes = Object.values(canvas?.selected_nodes ?? {}).map(normalizeNode);

  return {
    nodes,
    node_ids: nodes.map((node) => node.id),
    count: nodes.length,
  };
}

function clearCanvasSelection(canvas) {
  if (!canvas) {
    return;
  }

  if (typeof canvas?.deselectAllNodes === "function") {
    canvas.deselectAllNodes();
  }

  for (const node of Object.values(canvas?.selected_nodes ?? {})) {
    node.selected = false;
  }

  canvas.selected_nodes = {};
}

function selectNodeObjects(app, nodes) {
  const canvas = app.canvas;

  clearCanvasSelection(canvas);

  for (const node of nodes) {
    node.selected = true;
    canvas.selected_nodes[node.id] = node;
  }

  canvas.node_dragged = null;
  canvas.node_over = nodes[0] ?? null;
  markCanvasDirty(app);

  return getSelectedNodesPayload(canvas);
}

function centerCanvasOnNode(app, node) {
  const canvas = app.canvas;

  if (!canvas?.ds || !canvas?.canvas || !node?.pos || !node?.size) {
    return false;
  }

  const nodeCenterX = Number(node.pos[0]) + Number(node.size[0]) / 2;
  const nodeCenterY = Number(node.pos[1]) + Number(node.size[1]) / 2;
  const scale = canvas.ds.scale || 1;

  canvas.ds.offset[0] = canvas.canvas.width / 2 / scale - nodeCenterX;
  canvas.ds.offset[1] = canvas.canvas.height / 2 / scale - nodeCenterY;
  markCanvasDirty(app);

  return true;
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function socketMatches(socket, wanted) {
  const search = normalizeSearchText(wanted);

  return (
    normalizeSearchText(socket?.name) === search ||
    normalizeSearchText(socket?.label) === search ||
    normalizeSearchText(socket?.type) === search
  );
}

function findInputIndex(node, inputNameOrIndex) {
  if (typeof inputNameOrIndex === "number") {
    return node?.inputs?.[inputNameOrIndex] ? inputNameOrIndex : -1;
  }

  return (node?.inputs ?? []).findIndex((input) => socketMatches(input, inputNameOrIndex));
}

function findOutputIndex(node, outputNameOrIndex) {
  if (typeof outputNameOrIndex === "number") {
    return node?.outputs?.[outputNameOrIndex] ? outputNameOrIndex : -1;
  }

  return (node?.outputs ?? []).findIndex((output) => socketMatches(output, outputNameOrIndex));
}

function normalizeSocketType(type) {
  return String(type ?? "").trim().toUpperCase();
}

function splitSocketTypes(type) {
  return normalizeSocketType(type)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferSocketSemantic(socket) {
  const types = splitSocketTypes(socket?.type);
  const text = normalizeSearchText(`${socket?.name ?? ""} ${socket?.label ?? ""} ${socket?.type ?? ""}`);
  const semanticTypes = [];

  for (const type of types) {
    if (type === "*" || type === "ANY") semanticTypes.push("any");
    else if (type.includes("LATENT")) semanticTypes.push("latent");
    else if (type.includes("IMAGE")) semanticTypes.push("image");
    else if (type.includes("MASK")) semanticTypes.push("mask");
    else if (type.includes("MODEL")) semanticTypes.push("model");
    else if (type.includes("CLIP")) semanticTypes.push("clip");
    else if (type.includes("VAE")) semanticTypes.push("vae");
    else if (type.includes("CONDITIONING")) semanticTypes.push("conditioning");
    else if (type.includes("CONTROL_NET") || type.includes("CONTROLNET")) semanticTypes.push("controlnet");
    else if (type.includes("STRING")) semanticTypes.push("string");
    else if (type.includes("INT") || type.includes("FLOAT") || type.includes("NUMBER")) semanticTypes.push("number");
    else if (type.includes("BOOLEAN")) semanticTypes.push("boolean");
    else semanticTypes.push(type.toLowerCase());
  }

  if (text.includes("latent")) semanticTypes.push("latent");
  if (text.includes("image")) semanticTypes.push("image");
  if (text.includes("mask")) semanticTypes.push("mask");
  if (text.includes("model")) semanticTypes.push("model");
  if (text.includes("clip")) semanticTypes.push("clip");
  if (text.includes("vae")) semanticTypes.push("vae");
  if (text.includes("conditioning") || text.includes("cond")) semanticTypes.push("conditioning");

  return [...new Set(semanticTypes)];
}

function normalizeSocketSemantic(socket) {
  return {
    raw_type: socket?.type ?? null,
    normalized_types: splitSocketTypes(socket?.type),
    semantic_types: inferSocketSemantic(socket),
    name_quality: socket?.name ? "named" : "unnamed",
    label_quality: socket?.label ? "labeled" : "unlabeled",
  };
}

function socketTypesCompatible(outputType, inputType) {
  const outType = normalizeSocketType(outputType);
  const inType = normalizeSocketType(inputType);

  if (!outType || !inType) return true;
  if (outType === "*" || inType === "*") return true;
  if (outType === inType) return true;

  const outputTypes = splitSocketTypes(outType);
  const inputTypes = splitSocketTypes(inType);

  return outputTypes.some((type) => inputTypes.includes(type));
}

function explainSocketCompatibility(output, input) {
  const compatible = socketTypesCompatible(output?.type, input?.type);
  const outputTypes = splitSocketTypes(output?.type);
  const inputTypes = splitSocketTypes(input?.type);
  const sharedTypes = outputTypes.filter((type) => inputTypes.includes(type));
  const outputSemantic = inferSocketSemantic(output);
  const inputSemantic = inferSocketSemantic(input);
  const sharedSemantic = outputSemantic.filter((type) => inputSemantic.includes(type));

  let reason = "unknown";
  if (!output?.type || !input?.type) reason = "missing_type_treated_as_compatible";
  else if (outputTypes.includes("*") || inputTypes.includes("*")) reason = "wildcard_type";
  else if (sharedTypes.length > 0) reason = "exact_or_union_type_match";
  else if (compatible) reason = "compatible_by_socket_rule";
  else reason = "type_mismatch";

  return {
    compatible,
    reason,
    output: normalizeSocketSemantic(output),
    input: normalizeSocketSemantic(input),
    shared_types: sharedTypes,
    shared_semantic_types: sharedSemantic,
    name_match: normalizeSearchText(output?.name) === normalizeSearchText(input?.name),
    label_match: normalizeSearchText(output?.label) === normalizeSearchText(input?.label),
  };
}

function validateConnectionPayload(graph, request = {}) {
  const fromNode = getNodeById(graph, request.fromNodeId ?? request.from_node_id);
  const toNode = getNodeById(graph, request.toNodeId ?? request.to_node_id);
  const problems = [];
  const warnings = [];

  if (!fromNode) {
    problems.push({
      code: "FROM_NODE_NOT_FOUND",
      message: `Source node not found: ${request.fromNodeId ?? request.from_node_id}`,
    });
  }

  if (!toNode) {
    problems.push({
      code: "TO_NODE_NOT_FOUND",
      message: `Target node not found: ${request.toNodeId ?? request.to_node_id}`,
    });
  }

  const fromOutputIndex = fromNode ? findOutputIndex(fromNode, request.fromOutput ?? request.from_output) : -1;
  const toInputIndex = toNode ? findInputIndex(toNode, request.toInput ?? request.to_input) : -1;
  const output = fromOutputIndex >= 0 ? fromNode.outputs[fromOutputIndex] : null;
  const input = toInputIndex >= 0 ? toNode.inputs[toInputIndex] : null;

  if (fromNode && fromOutputIndex < 0) {
    problems.push({
      code: "OUTPUT_SOCKET_NOT_FOUND",
      message: `Output socket not found on node ${fromNode.id}: ${request.fromOutput ?? request.from_output}`,
    });
  }

  if (toNode && toInputIndex < 0) {
    problems.push({
      code: "INPUT_SOCKET_NOT_FOUND",
      message: `Input socket not found on node ${toNode.id}: ${request.toInput ?? request.to_input}`,
    });
  }

  if (output && input && !socketTypesCompatible(output.type, input.type) && request.force !== true) {
    const compatibility = explainSocketCompatibility(output, input);
    problems.push({
      code: "SOCKET_TYPE_MISMATCH",
      message: `Output type ${output.type} is not compatible with input type ${input.type}.`,
      details: {
        output_type: output.type ?? null,
        input_type: input.type ?? null,
        compatibility,
      },
    });
  }

  if (input?.link != null && request.replaceExisting !== true && request.replace_existing !== true) {
    problems.push({
      code: "INPUT_ALREADY_CONNECTED",
      message: `Target input ${input.name ?? toInputIndex} is already connected.`,
      details: {
        existing_link_id: input.link,
      },
    });
  }

  if (output && input && !socketTypesCompatible(output.type, input.type) && request.force === true) {
    warnings.push("Socket types do not match, but force=true allows the connection.");
  }

  return {
    valid: problems.length === 0,
    problems,
    warnings,
    from_node: fromNode ? normalizeNode(fromNode) : null,
    to_node: toNode ? normalizeNode(toNode) : null,
    from_output_index: fromOutputIndex,
    to_input_index: toInputIndex,
    from_output: output ? normalizeOutput(output, fromOutputIndex) : null,
    to_input: input ? normalizeInput(input, toInputIndex) : null,
    compatibility: output && input ? explainSocketCompatibility(output, input) : null,
  };
}

function disconnectInputPayload(app, graph, nodeId, inputNameOrIndex) {
  const node = getNodeById(graph, nodeId);

  if (!node) {
    return createFailure(
      "disconnectInput",
      "NODE_NOT_FOUND",
      `Node not found: ${nodeId}`,
      { node_id: nodeId },
      "Call window.comfyAI.getNodes() to see available node IDs."
    );
  }

  const inputIndex = findInputIndex(node, inputNameOrIndex);

  if (inputIndex < 0) {
    return createFailure(
      "disconnectInput",
      "INPUT_SOCKET_NOT_FOUND",
      `Input socket not found on node ${node.id}: ${inputNameOrIndex}`,
      { node_id: node.id, input: inputNameOrIndex },
      "Call window.comfyAI.getNodeSockets(nodeId) to see available inputs."
    );
  }

  const input = node.inputs[inputIndex];
  const oldLinkId = input?.link ?? null;

  if (oldLinkId != null && typeof node.disconnectInput === "function") {
    node.disconnectInput(inputIndex);
  }

  markCanvasDirty(app);

  return createSuccess(
    "disconnectInput",
    oldLinkId == null
      ? `Input ${input.name ?? inputIndex} was already disconnected.`
      : `Disconnected input ${input.name ?? inputIndex} on node ${node.id}.`,
    {
      node_id: node.id,
      input_index: inputIndex,
      input_name: input?.name ?? null,
      old_link_id: oldLinkId,
    }
  );
}

function disconnectOutputPayload(app, graph, nodeId, outputNameOrIndex) {
  const node = getNodeById(graph, nodeId);

  if (!node) {
    return createFailure(
      "disconnectOutput",
      "NODE_NOT_FOUND",
      `Node not found: ${nodeId}`,
      { node_id: nodeId },
      "Call window.comfyAI.getNodes() to see available node IDs."
    );
  }

  const outputIndex = findOutputIndex(node, outputNameOrIndex);

  if (outputIndex < 0) {
    return createFailure(
      "disconnectOutput",
      "OUTPUT_SOCKET_NOT_FOUND",
      `Output socket not found on node ${node.id}: ${outputNameOrIndex}`,
      { node_id: node.id, output: outputNameOrIndex },
      "Call window.comfyAI.getNodeSockets(nodeId) to see available outputs."
    );
  }

  const output = node.outputs[outputIndex];
  const oldLinkIds = [...(output?.links ?? [])];

  for (const linkId of oldLinkIds) {
    const link = normalizeLink(graph?.links?.[linkId]);
    const targetNode = link?.to_node_id != null ? getNodeById(graph, link.to_node_id) : null;

    if (targetNode && typeof targetNode.disconnectInput === "function") {
      targetNode.disconnectInput(link.to_input_index);
    }
  }

  markCanvasDirty(app);

  return createSuccess("disconnectOutput", `Disconnected ${oldLinkIds.length} link(s) from output ${output.name ?? outputIndex} on node ${node.id}.`, {
    node_id: node.id,
    output_index: outputIndex,
    output_name: output?.name ?? null,
    old_link_ids: oldLinkIds,
  });
}

function connectNodesPayload(app, graph, request = {}) {
  const replaceExisting = request.replaceExisting === true || request.replace_existing === true;
  const validation = validateConnectionPayload(graph, { ...request, replaceExisting });

  if (!validation.valid) {
    return createFailure(
      "connectNodes",
      "CONNECTION_VALIDATION_FAILED",
      "Connection validation failed.",
      validation,
      "Fix the reported problems, or use replaceExisting=true/force=true only when appropriate."
    );
  }

  if (replaceExisting && validation.to_input?.link != null) {
    const disconnectResult = disconnectInputPayload(
      app,
      graph,
      request.toNodeId ?? request.to_node_id,
      validation.to_input_index
    );

    if (!disconnectResult.ok) {
      return disconnectResult;
    }
  }

  const fromNode = getNodeById(graph, request.fromNodeId ?? request.from_node_id);
  const toNode = getNodeById(graph, request.toNodeId ?? request.to_node_id);

  if (typeof fromNode?.connect !== "function") {
    return createFailure(
      "connectNodes",
      "CONNECT_UNAVAILABLE",
      "Source node does not expose LiteGraph connect().",
      { from_node_id: fromNode?.id ?? null },
      "Confirm this ComfyUI frontend uses LiteGraph-compatible nodes."
    );
  }

  fromNode.connect(validation.from_output_index, toNode, validation.to_input_index);
  markCanvasDirty(app);

  const createdLinkId = toNode.inputs?.[validation.to_input_index]?.link ?? null;
  const createdLink = createdLinkId != null ? describeConnection(graph, graph.links?.[createdLinkId]) : null;

  return createSuccess("connectNodes", `Connected node ${fromNode.id} to node ${toNode.id}.`, {
    created_link_id: createdLinkId,
    connection: createdLink,
    validation,
  }, validation.warnings);
}

function replaceConnectionPayload(app, graph, request = {}) {
  const toNodeId = request.toNodeId ?? request.to_node_id;
  const toInput = request.toInput ?? request.to_input;
  const newFromNodeId = request.newFromNodeId ?? request.new_from_node_id ?? request.fromNodeId ?? request.from_node_id;
  const newFromOutput = request.newFromOutput ?? request.new_from_output ?? request.fromOutput ?? request.from_output;
  const toNode = getNodeById(graph, toNodeId);

  if (!toNode) {
    return createFailure(
      "replaceConnection",
      "NODE_NOT_FOUND",
      `Target node not found: ${toNodeId}`,
      { to_node_id: toNodeId },
      "Call window.comfyAI.getNodes() to see available node IDs."
    );
  }

  const inputIndex = findInputIndex(toNode, toInput);

  if (inputIndex < 0) {
    return createFailure(
      "replaceConnection",
      "INPUT_SOCKET_NOT_FOUND",
      `Input socket not found on node ${toNode.id}: ${toInput}`,
      { to_node_id: toNode.id, to_input: toInput },
      "Call window.comfyAI.getNodeSockets(nodeId) to see available inputs."
    );
  }

  const oldLinkId = toNode.inputs?.[inputIndex]?.link ?? null;
  const oldConnection = oldLinkId != null ? describeConnection(graph, graph.links?.[oldLinkId]) : null;

  const connectResult = connectNodesPayload(app, graph, {
    fromNodeId: newFromNodeId,
    fromOutput: newFromOutput,
    toNodeId,
    toInput: inputIndex,
    replaceExisting: true,
    force: request.force,
  });

  if (!connectResult.ok) {
    return connectResult;
  }

  return createSuccess("replaceConnection", `Replaced connection on node ${toNode.id} input ${toNode.inputs[inputIndex]?.name ?? inputIndex}.`, {
    old_link_id: oldLinkId,
    old_connection: oldConnection,
    new_link_id: connectResult.data.created_link_id,
    new_connection: connectResult.data.connection,
    connect_result: connectResult,
  }, connectResult.warnings ?? []);
}

function autoConnectCandidates(fromNode, toNode, replaceExisting = false, preferredType = null) {
  const candidates = [];
  const preferred = normalizeSocketType(preferredType);

  for (let outputIndex = 0; outputIndex < (fromNode?.outputs ?? []).length; outputIndex += 1) {
    const output = fromNode.outputs[outputIndex];

    for (let inputIndex = 0; inputIndex < (toNode?.inputs ?? []).length; inputIndex += 1) {
      const input = toNode.inputs[inputIndex];

      if (input?.link != null && !replaceExisting) {
        continue;
      }

      const compatibility = explainSocketCompatibility(output, input);

      if (!compatibility.compatible) {
        continue;
      }

      let score = 0;
      if (compatibility.shared_types.length > 0) score += 120;
      if (compatibility.shared_semantic_types.length > 0) score += 40;
      if (normalizeSocketType(output?.type) === normalizeSocketType(input?.type)) score += 30;
      if (normalizeSearchText(output?.name) === normalizeSearchText(input?.name)) score += 10;
      if (preferred && normalizeSocketType(output?.type) === preferred) score += 10;

      candidates.push({
        score,
        fromOutput: outputIndex,
        toInput: inputIndex,
        from_output: normalizeOutput(output, outputIndex),
        to_input: normalizeInput(input, inputIndex),
        compatibility,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

async function fetchBackendJson(path, action) {
  try {
    const response = await fetch(path, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch (error) {
      return createFailure(
        action,
        "BACKEND_RESPONSE_NOT_JSON",
        `Backend response from ${path} was not valid JSON.`,
        {
          path,
          status: response.status,
          status_text: response.statusText,
          body_preview: text.slice(0, 500),
          parse_error: String(error?.message ?? error),
        },
        "Confirm this endpoint returns JSON in the current ComfyUI version."
      );
    }

    if (!response.ok) {
      return createFailure(
        action,
        "BACKEND_HTTP_ERROR",
        `Backend request to ${path} failed with HTTP ${response.status}.`,
        {
          path,
          status: response.status,
          status_text: response.statusText,
          response: json,
        },
        "Confirm the ComfyUI backend endpoint exists and is reachable from the browser page."
      );
    }

    return createSuccess(action, `Fetched ${path}.`, {
      path,
      status: response.status,
      response: json,
    });
  } catch (error) {
    return createFailure(
      action,
      "BACKEND_FETCH_FAILED",
      `Failed to fetch ${path}.`,
      {
        path,
        message: String(error?.message ?? error),
      },
      "Confirm ComfyUI is running and the browser page is loaded from the same server."
    );
  }
}

async function postBackendJson(path, action, body = {}) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch (error) {
      return createFailure(
        action,
        "BACKEND_RESPONSE_NOT_JSON",
        `Backend response from ${path} was not valid JSON.`,
        {
          path,
          status: response.status,
          status_text: response.statusText,
          body_preview: text.slice(0, 500),
          parse_error: String(error?.message ?? error),
        },
        "Confirm this endpoint returns JSON in the current ComfyUI version."
      );
    }

    if (!response.ok) {
      return createFailure(
        action,
        "BACKEND_HTTP_ERROR",
        `Backend request to ${path} failed with HTTP ${response.status}.`,
        {
          path,
          status: response.status,
          status_text: response.statusText,
          response: json,
        },
        "Inspect error.details.response for ComfyUI validation errors."
      );
    }

    return createSuccess(action, `Posted ${path}.`, {
      path,
      status: response.status,
      response: json,
    });
  } catch (error) {
    return createFailure(
      action,
      "BACKEND_POST_FAILED",
      `Failed to post ${path}.`,
      {
        path,
        message: String(error?.message ?? error),
      },
      "Confirm ComfyUI is running and the browser page is loaded from the same server."
    );
  }
}

async function buildCurrentPromptPayload(app) {
  if (typeof app?.graphToPrompt !== "function") {
    return createFailure(
      "backend.prepareCurrentPrompt",
      "GRAPH_TO_PROMPT_UNAVAILABLE",
      "ComfyUI frontend app.graphToPrompt() is not available.",
      {
        app_keys: Object.keys(app ?? {}).filter((key) => key.toLowerCase().includes("prompt")),
      },
      "Use the current ComfyUI frontend conversion API if it has changed, or add a version-specific adapter."
    );
  }

  try {
    const converted = await app.graphToPrompt();
    const prompt = converted?.output ?? converted?.prompt ?? null;
    const workflow = converted?.workflow ?? app?.graph?.serialize?.() ?? null;

    if (!prompt) {
      return createFailure(
        "backend.prepareCurrentPrompt",
        "PROMPT_CONVERSION_EMPTY",
        "ComfyUI graphToPrompt() did not return executable prompt data.",
        { converted: safeClone(converted) },
        "Inspect the converted payload and confirm the current workflow can be converted to API format."
      );
    }

    return createSuccess("backend.prepareCurrentPrompt", "Prepared executable prompt from current workflow.", {
      prompt: safeClone(prompt),
      workflow: safeClone(workflow),
      raw: safeClone(converted),
    });
  } catch (error) {
    return createFailure(
      "backend.prepareCurrentPrompt",
      "GRAPH_TO_PROMPT_FAILED",
      "ComfyUI graphToPrompt() failed.",
      {
        message: String(error?.message ?? error),
      },
      "Check the current workflow for invalid/missing nodes or frontend conversion errors."
    );
  }
}

function summarizeObjectInfo(objectInfo) {
  const entries = Object.entries(objectInfo ?? {});

  return {
    node_class_count: entries.length,
    node_classes: entries.map(([type, info]) => ({
      type,
      display_name: info?.display_name ?? null,
      category: info?.category ?? null,
      output: safeClone(info?.output ?? null),
      output_name: safeClone(info?.output_name ?? null),
      required_inputs: Object.keys(info?.input?.required ?? {}),
      optional_inputs: Object.keys(info?.input?.optional ?? {}),
      hidden_inputs: Object.keys(info?.input?.hidden ?? {}),
    })),
  };
}

function summarizeNodeDefinition(type, info) {
  const required = info?.input?.required ?? {};
  const optional = info?.input?.optional ?? {};
  const hidden = info?.input?.hidden ?? {};

  return {
    type,
    display_name: info?.display_name ?? null,
    category: info?.category ?? null,
    description: info?.description ?? null,
    output: safeClone(info?.output ?? null),
    output_name: safeClone(info?.output_name ?? null),
    output_is_list: safeClone(info?.output_is_list ?? null),
    required_inputs: Object.keys(required),
    optional_inputs: Object.keys(optional),
    hidden_inputs: Object.keys(hidden),
    raw: safeClone(info),
  };
}

function inputDefinitionToSearchText(name, def) {
  return [
    name,
    Array.isArray(def) ? def[1]?.tooltip : null,
    Array.isArray(def) ? def[1]?.default : null,
    safeClone(def),
  ]
    .filter((value) => value != null)
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
    .join(" ");
}

function searchObjectInfo(objectInfo, query = "", limit = 50) {
  const needle = normalizeSearchText(query);
  const entries = Object.entries(objectInfo ?? {});
  const results = [];

  for (const [type, info] of entries) {
    const required = info?.input?.required ?? {};
    const optional = info?.input?.optional ?? {};
    const hidden = info?.input?.hidden ?? {};
    const inputText = [
      ...Object.entries(required),
      ...Object.entries(optional),
      ...Object.entries(hidden),
    ]
      .map(([name, def]) => inputDefinitionToSearchText(name, def))
      .join(" ");

    const haystack = normalizeSearchText([
      type,
      info?.display_name,
      info?.category,
      info?.description,
      inputText,
      safeClone(info?.output ?? null),
      safeClone(info?.output_name ?? null),
    ].join(" "));

    if (!needle || haystack.includes(needle)) {
      results.push(summarizeNodeDefinition(type, info));
    }
  }

  return results
    .sort((a, b) => String(a.type).localeCompare(String(b.type)))
    .slice(0, Math.max(1, Number(limit) || 50));
}

function inferModelCategory(inputName, nodeType, nodeCategory) {
  const text = normalizeSearchText(`${inputName} ${nodeType} ${nodeCategory}`);

  if (text.includes("checkpoint") || text.includes("ckpt")) return "checkpoints";
  if (text.includes("vae")) return "vaes";
  if (text.includes("lora")) return "loras";
  if (text.includes("controlnet") || text.includes("control_net")) return "controlnets";
  if (text.includes("upscale")) return "upscale_models";
  if (text.includes("clip")) return "clip_models";
  if (text.includes("unet")) return "unet_models";
  if (text.includes("diffusion")) return "diffusion_models";
  if (text.includes("embedding")) return "embeddings";

  return null;
}

function extractDropdownOptionsFromDefinition(def) {
  if (Array.isArray(def?.[0])) return def[0];
  if (Array.isArray(def) && def.every((item) => typeof item === "string")) return def;
  return null;
}

function buildModelCatalog(objectInfo) {
  const categories = {};
  const sources = [];

  for (const [nodeType, info] of Object.entries(objectInfo ?? {})) {
    const sections = {
      required: info?.input?.required ?? {},
      optional: info?.input?.optional ?? {},
      hidden: info?.input?.hidden ?? {},
    };

    for (const [section, inputs] of Object.entries(sections)) {
      for (const [inputName, def] of Object.entries(inputs)) {
        const options = extractDropdownOptionsFromDefinition(def);
        const category = inferModelCategory(inputName, nodeType, info?.category);

        if (!category || !Array.isArray(options) || options.length === 0) {
          continue;
        }

        if (!categories[category]) {
          categories[category] = new Set();
        }

        for (const option of options) {
          categories[category].add(option);
        }

        sources.push({
          category,
          node_type: nodeType,
          node_display_name: info?.display_name ?? null,
          node_category: info?.category ?? null,
          section,
          input_name: inputName,
          option_count: options.length,
        });
      }
    }
  }

  const catalog = Object.fromEntries(
    Object.entries(categories).map(([category, values]) => [
      category,
      [...values].sort((a, b) => String(a).localeCompare(String(b))),
    ])
  );

  return {
    catalog,
    categories: Object.keys(catalog).sort(),
    counts: Object.fromEntries(Object.entries(catalog).map(([category, values]) => [category, values.length])),
    sources,
  };
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractPromptHistoryRecord(historyResponse, promptId) {
  const history = historyResponse?.data?.response ?? historyResponse ?? {};
  return history?.[promptId] ?? null;
}

function buildViewUrl(file = {}) {
  const params = new URLSearchParams();
  if (file.filename != null) params.set("filename", file.filename);
  if (file.subfolder != null) params.set("subfolder", file.subfolder);
  if (file.type != null) params.set("type", file.type);
  return `/view?${params.toString()}`;
}

function extractOutputsFromHistoryRecord(record) {
  const outputs = [];

  for (const [nodeId, nodeOutput] of Object.entries(record?.outputs ?? {})) {
    for (const kind of ["images", "gifs", "videos", "audio"]) {
      for (const file of nodeOutput?.[kind] ?? []) {
        outputs.push({
          node_id: nodeId,
          kind,
          filename: file.filename ?? null,
          subfolder: file.subfolder ?? "",
          type: file.type ?? "output",
          format: file.format ?? null,
          view_url: buildViewUrl(file),
          raw: safeClone(file),
        });
      }
    }
  }

  return outputs;
}

function levenshteinDistance(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[left.length][right.length];
}

function closestMatches(value, options, limit = 5) {
  const wanted = String(value ?? "").toLowerCase();

  return [...(options ?? [])]
    .map((option) => ({
      value: option,
      distance: levenshteinDistance(wanted, String(option ?? "").toLowerCase()),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function extractBackendWidgetOptions(objectInfo, nodeType, widgetName) {
  const input = objectInfo?.[nodeType]?.input ?? {};
  const sections = ["required", "optional", "hidden"];

  for (const section of sections) {
    const def = input?.[section]?.[widgetName];

    if (!def) continue;

    if (Array.isArray(def?.[0])) {
      return {
        source: `object_info.${nodeType}.input.${section}.${widgetName}`,
        options: def[0],
        raw: safeClone(def),
      };
    }

    if (Array.isArray(def)) {
      return {
        source: `object_info.${nodeType}.input.${section}.${widgetName}`,
        options: def,
        raw: safeClone(def),
      };
    }
  }

  return {
    source: null,
    options: null,
    raw: null,
  };
}

// Public installer called by the environment-specific loader. It receives the
// live ComfyUI frontend `app` object and creates `window.comfyAI`.
function installComfyAICore(config = {}) {
  const {
    app,
    LiteGraph = window.LiteGraph,
    source = "unknown",
    logger = console,
    options = {},
  } = config;

  if (!app) {
    return createFailure(
      "installComfyAICore",
      "APP_MISSING",
      "ComfyUI app was not provided to the core installer.",
      { source },
      "Call window.installComfyAICore({ app, source }) after the ComfyUI frontend app is available."
    );
  }

  const previousInstallCount = window.comfyAI?._install_count ?? 0;
  const installedAt = nowIso();
  const snapshotManager = createSnapshotManager(app, options?.snapshots ?? options);
  const actionLogger = createActionLogger(options?.actionLog ?? options?.action_log ?? options);
  const controlMode = createControlModeManager(options);
  const attemptJournal = createAttemptJournal(options?.attemptJournal ?? options?.attempt_journal ?? options);

  // This object is the browser-side command API. Keep the methods small,
  // structured, and predictable. Every method should be safe to call from the
  // DevTools console and eventually from an MCP bridge.
  const comfyAI = {
    version: CORE_VERSION,
    core_version: CORE_VERSION,
    source,
    options,
    _app: app,
    _LiteGraph: LiteGraph,
    _installed_at: installedAt,
    _install_count: previousInstallCount + 1,

    // Basic health check used after every reload. This should be the first
    // command to test before using more specific graph APIs.
    ping() {
      return createSuccess("ping", "ComfyAI core is installed and reachable.", {
        core_version: CORE_VERSION,
        source,
        installed_at: installedAt,
        install_count: comfyAI._install_count,
        graph_ready: Boolean(app?.graph),
        canvas_ready: Boolean(app?.canvas),
        node_count: safeNodeCount(app),
        checked_at: nowIso(),
      });
    },

    // Return the command catalog that teaches an AI model what tools exist,
    // whether each tool mutates the graph, when to use it, and an example call.
    getCommandCatalog() {
      return createSuccess("getCommandCatalog", "Returned ComfyAI command catalog.", {
        commands: safeClone(COMMAND_CATALOG),
        count: COMMAND_CATALOG.length,
      });
    },

    getActionLog(limit = 50) {
      return actionLogger.list(limit);
    },

    getAttemptJournal(limit = 100) {
      return attemptJournal.list(limit);
    },

    getOperatingProtocol() {
      return createSuccess("getOperatingProtocol", "Returned ComfyAI agent operating protocol.", {
        primary_loop: [
          "Understand the user's goal.",
          "Inspect the current graph and backend capabilities.",
          "Set the correct control mode.",
          "Snapshot before edits.",
          "Build or modify the workflow.",
          "Preflight before running.",
          "Queue or dry-run.",
          "Collect outputs.",
          "Visually analyze outputs.",
          "Record the attempt.",
          "Decide the next edit.",
          "Repeat until success, budget limit, or human intervention.",
        ],
        logging: {
          detailed_machine_trail: ["MCP JSONL log", "getActionLog()", "getAttemptJournal()"],
          canvas_trail: "Concise note nodes only: number, timestamp, and short paragraph.",
        },
        safety_modes: ["read_only", "safe_edit", "full_control"],
        human_intervention_triggers: [
          "No safe API/browser/file path exists.",
          "Model source is ambiguous or gated.",
          "License/download choice needs approval.",
          "Disk/time/cost risk is high.",
          "Visual evidence is unavailable.",
          "Destructive action has no reliable recovery path.",
        ],
        socket_strategy: [
          "Prefer raw socket type.",
          "Use normalized union types.",
          "Use inferred semantic types.",
          "Use backend schema when available.",
          "Treat socket names as weak hints only.",
        ],
        node_label_strategy: "Preserve original ComfyUI node identity, e.g. Video Sampler__KSampler (Advanced).",
      });
    },

    getControlMode() {
      return controlMode.getMode();
    },

    setControlMode(mode) {
      const result = controlMode.setMode(mode);
      actionLogger.record("setControlMode", { mode }, result);
      return result;
    },

    // Friendly alias for AI and human operators. `help()` is intentionally
    // browser-console obvious, while getCommandCatalog() is more formal for MCP.
    help() {
      return createSuccess("help", "Returned ComfyAI usage guidance.", {
        operating_rules: [
          "Start with ping() and getNodes().",
          "Inspect nodes, widgets, sockets, and current connections before editing.",
          "Create or verify a snapshot before risky edits.",
          "Validate before connecting sockets.",
          "Use replaceExisting=true only when intentionally replacing an occupied input.",
          "Use force=true only for deliberate debugging of type mismatches.",
          "After every edit, call a read command to confirm the result.",
          "If no safe practical API, browser action, file path, or recovery path exists, stop and ask the human for help.",
        ],
        recommended_flow: [
          "ping()",
          "getNodes()",
          "getNodeWidgets(nodeId) and getNodeSockets(nodeId)",
          "getConnectionMap()",
          "createSnapshot('reason') before risky changes",
          "validateConnection(...)",
          "connectNodes(...) or autoConnectNodes(...)",
          "getConnectionMap() to verify",
          "undoLastEdit() if the edit was wrong",
        ],
        commands: safeClone(COMMAND_CATALOG),
      });
    },

    createSnapshot(reason = "manual", metadata = {}) {
      return snapshotManager.create(reason, metadata);
    },

    listSnapshots() {
      return snapshotManager.list();
    },

    restoreSnapshot(snapshotId) {
      return snapshotManager.restore(snapshotId, "restoreSnapshot");
    },

    undoLastEdit() {
      return snapshotManager.undoLastEdit();
    },

    clearWorkflow(options = {}) {
      const graph = getGraphOrFailure(app, "clearWorkflow");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("clearWorkflow", "destructive");
      if (modeBlocked) return modeBlocked;

      if (options.confirm !== true) {
        return {
          ok: false,
          action: "clearWorkflow",
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: "Refusing to clear workflow without explicit confirmation.",
            details: {
              required: { confirm: true },
              received: options,
            },
          },
          suggested_fix: "Call clearWorkflow({ confirm: true, reason: '...' }) only when you intentionally want to clear the graph.",
        };
      }

      const reason = options.reason ?? options.snapshotReason ?? options.snapshot_reason ?? "before_clearWorkflow";
      const snapshot = snapshotManager.beforeEdit("clearWorkflow", { reason });
      if (!snapshot.ok) return snapshot;

      const result = clearWorkflowPayload(app, graph);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("clearWorkflow", options, result);
      return result;
    },

    createNode(request = {}) {
      const graph = getGraphOrFailure(app, "createNode");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("createNode", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("createNode", request);
      if (!snapshot.ok) return snapshot;

      const result = createNodePayload(app, graph, LiteGraph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("createNode", request, result);
      return result;
    },

    removeNode(nodeId) {
      const graph = getGraphOrFailure(app, "removeNode");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("removeNode", "edit");
      if (modeBlocked) return modeBlocked;

      const node = getNodeById(graph, nodeId);
      if (!node) {
        return createFailure(
          "removeNode",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs before removing a node."
        );
      }

      const snapshot = snapshotManager.beforeEdit("removeNode", {
        node_id: node.id,
        node_type: node.type,
        node_title: node.title,
      });
      if (!snapshot.ok) return snapshot;

      try {
        graph.remove(node);
        markCanvasDirty(app);
      } catch (error) {
        return createFailure(
          "removeNode",
          "REMOVE_NODE_FAILED",
          error?.message ?? "ComfyUI failed to remove the node.",
          { node_id: node.id, node_type: node.type, node_title: node.title },
          "Use undoLastEdit() if the graph is left in an unexpected state."
        );
      }

      const result = createSuccess("removeNode", `Removed node ${node.id}.`, {
        node_id: node.id,
        node_type: node.type,
        node_title: node.title,
        pre_edit_snapshot: snapshot.data.snapshot,
      });
      actionLogger.record("removeNode", { nodeId }, result);
      return result;
    },

    createCanvasNote(request = {}) {
      const graph = getGraphOrFailure(app, "createCanvasNote");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("createCanvasNote", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("createCanvasNote", request);
      if (!snapshot.ok) return snapshot;

      const result = createCanvasNotePayload(app, graph, LiteGraph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("createCanvasNote", request, result);
      return result;
    },

    createRunDocumentationNotes(request = {}) {
      const graph = getGraphOrFailure(app, "createRunDocumentationNotes");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("createRunDocumentationNotes", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("createRunDocumentationNotes", request);
      if (!snapshot.ok) return snapshot;

      const result = createRunDocumentationNotesPayload(app, graph, LiteGraph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("createRunDocumentationNotes", request, result);
      return result;
    },

    recordAttempt(request = {}) {
      const entry = attemptJournal.record(request);
      const shouldCreateNote = request.createCanvasNote === true || request.create_canvas_note === true;
      let noteResult = null;

      if (shouldCreateNote) {
        const graph = getGraphOrFailure(app, "recordAttempt");
        if (graph?.ok === false) return graph;
        const modeBlocked = controlMode.allow("recordAttempt", "edit");
        if (modeBlocked) return modeBlocked;

        noteResult = createCanvasNotePayload(app, graph, LiteGraph, {
          title: `AI Attempt ${entry.attempt_number}`,
          text: attemptJournal.formatAttempt(entry),
          position: request.notePosition ?? request.note_position ?? [-520, 120 + entry.attempt_number * 260],
        });
      }

      const result = createSuccess("recordAttempt", `Recorded AI attempt ${entry.attempt_number}.`, {
        entry,
        note_result: noteResult,
      }, noteResult && !noteResult.ok ? ["Attempt was recorded, but canvas note creation failed."] : []);
      actionLogger.record("recordAttempt", request, result);
      return result;
    },

    getRegisteredNodeTypes(search = "") {
      const payload = getRegisteredNodeTypesPayload(LiteGraph, search);

      if (!payload.litegraph_available) {
        return createFailure(
          "getRegisteredNodeTypes",
          "LITEGRAPH_MISSING",
          "LiteGraph is not available in this core install.",
          {},
          "Use backend.getObjectInfo() as a fallback, or reinstall the core with LiteGraph provided."
        );
      }

      return createSuccess("getRegisteredNodeTypes", `Found ${payload.count} registered node type(s).`, payload);
    },

    requestHumanIntervention(message, details = {}, requestedHelp = "") {
      const result = createHumanInterventionRequest(
        "requestHumanIntervention",
        message || "Human intervention is required.",
        details,
        requestedHelp || message || "Please help with the blocked step, then ask the AI to continue."
      );
      actionLogger.record("requestHumanIntervention", { message, details, requestedHelp }, result);
      return result;
    },

    buildTextToImageWorkflow(request = {}) {
      const graph = getGraphOrFailure(app, "buildTextToImageWorkflow");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("buildTextToImageWorkflow", "destructive");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("buildTextToImageWorkflow", request);
      if (!snapshot.ok) return snapshot;

      const result = buildTextToImageWorkflowPayload(app, graph, LiteGraph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("buildTextToImageWorkflow", request, result);
      return result;
    },

    // Return the full current workflow directly from the live browser graph.
    // This avoids the manual export -> edit JSON -> re-import loop.
    getWorkflow() {
      const graph = getGraphOrFailure(app, "getWorkflow");
      if (graph?.ok === false) return graph;

      if (typeof graph.serialize !== "function") {
        return createFailure(
          "getWorkflow",
          "SERIALIZE_UNAVAILABLE",
          "ComfyUI graph.serialize() is not available.",
          {},
          "Confirm this ComfyUI frontend exposes a LiteGraph-compatible graph."
        );
      }

      return createSuccess("getWorkflow", "Current workflow serialized.", {
        workflow: safeClone(graph.serialize()),
      });
    },

    // Return all current nodes in a simplified, AI-readable format. This is the
    // main "what is on the canvas right now?" command.
    getNodes() {
      const graph = getGraphOrFailure(app, "getNodes");
      if (graph?.ok === false) return graph;

      const nodes = getGraphNodes(graph).map(normalizeNode);

      return createSuccess("getNodes", `Found ${nodes.length} node(s).`, {
        nodes,
        count: nodes.length,
      });
    },

    // Return one node by numeric ID. This is useful after getNodes() tells the AI
    // which IDs exist.
    getNode(nodeId) {
      const graph = getGraphOrFailure(app, "getNode");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "getNode",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      return createSuccess("getNode", `Found node ${node.id}.`, {
        node: normalizeNode(node),
      });
    },

    // Return only the widgets/settings for one node. This satisfies Stage 4's
    // explicit widget-reading goal while keeping the broader getNode() command
    // intact for full node inspection.
    getNodeWidgets(nodeId) {
      const graph = getGraphOrFailure(app, "getNodeWidgets");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "getNodeWidgets",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = getNodeWidgetsPayload(node);

      return createSuccess(
        "getNodeWidgets",
        payload.has_widgets
          ? `Found ${payload.count} widget(s) on node ${node.id}.`
          : `Node ${node.id} has no widgets.`,
        payload
      );
    },

    // Return widget/settings data for every currently selected node. This is
    // useful in the browser-console workflow: click a node, then ask the bridge
    // what settings that selected node exposes.
    getSelectedNodeWidgets() {
      const canvas = app?.canvas;

      if (!canvas) {
        return createFailure(
          "getSelectedNodeWidgets",
          "CANVAS_NOT_READY",
          "ComfyUI canvas is not available yet.",
          {},
          "Wait for the ComfyUI canvas to finish loading, then try again."
        );
      }

      const nodes = Object.values(canvas.selected_nodes ?? {});
      const selected = nodes.map(getNodeWidgetsPayload);

      return createSuccess(
        "getSelectedNodeWidgets",
        `Found ${selected.length} selected node(s).`,
        {
          selected,
          count: selected.length,
        }
      );
    },

    // Return focused socket information for one node, including whether inputs
    // and outputs are connected and which link IDs are involved.
    getNodeSockets(nodeId) {
      const graph = getGraphOrFailure(app, "getNodeSockets");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "getNodeSockets",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = getNodeSocketsPayload(graph, node);

      return createSuccess(
        "getNodeSockets",
        `Found ${payload.input_count} input socket(s) and ${payload.output_count} output socket(s) on node ${node.id}.`,
        payload
      );
    },

    // Return socket information for currently selected nodes. This supports the
    // quick human workflow: select a node visually, then ask the AI bridge what
    // can connect to or from it.
    getSelectedNodeSockets() {
      const graph = getGraphOrFailure(app, "getSelectedNodeSockets");
      if (graph?.ok === false) return graph;

      const canvas = app?.canvas;

      if (!canvas) {
        return createFailure(
          "getSelectedNodeSockets",
          "CANVAS_NOT_READY",
          "ComfyUI canvas is not available yet.",
          {},
          "Wait for the ComfyUI canvas to finish loading, then try again."
        );
      }

      const selected = Object.values(canvas.selected_nodes ?? {}).map((node) =>
        getNodeSocketsPayload(graph, node)
      );

      return createSuccess(
        "getSelectedNodeSockets",
        `Found socket data for ${selected.length} selected node(s).`,
        {
          selected,
          count: selected.length,
        }
      );
    },

    // Return every current spline/link as a source socket -> target socket map.
    // This is the first command that turns raw links into semantic connections.
    getConnectionMap() {
      const graph = getGraphOrFailure(app, "getConnectionMap");
      if (graph?.ok === false) return graph;

      const payload = getConnectionMapPayload(graph);

      return createSuccess(
        "getConnectionMap",
        `Found ${payload.count} connection(s).`,
        payload
      );
    },

    // Return direct parents and children of one node. Upstream/downstream trace
    // commands below expand this recursively.
    getConnectedNodes(nodeId) {
      const graph = getGraphOrFailure(app, "getConnectedNodes");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "getConnectedNodes",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = getConnectedNodesPayload(graph, node);

      return createSuccess(
        "getConnectedNodes",
        `Found ${payload.incoming_count} incoming and ${payload.outgoing_count} outgoing connection(s) for node ${node.id}.`,
        payload
      );
    },

    // Recursively walk parent nodes feeding into the selected start node.
    traceUpstream(nodeId) {
      const graph = getGraphOrFailure(app, "traceUpstream");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "traceUpstream",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = traceGraph(graph, node, "upstream");

      return createSuccess(
        "traceUpstream",
        `Traced ${payload.count} upstream node(s), including the start node.`,
        payload
      );
    },

    // Recursively walk child nodes that receive data from the selected start
    // node.
    traceDownstream(nodeId) {
      const graph = getGraphOrFailure(app, "traceDownstream");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "traceDownstream",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = traceGraph(graph, node, "downstream");

      return createSuccess(
        "traceDownstream",
        `Traced ${payload.count} downstream node(s), including the start node.`,
        payload
      );
    },

    // Return existing LiteGraph links/splines. Stage 3 only reads them; later
    // stages will build connection maps and editing commands on top.
    getLinks() {
      const graph = getGraphOrFailure(app, "getLinks");
      if (graph?.ok === false) return graph;

      const links = getGraphLinks(graph);

      return createSuccess("getLinks", `Found ${links.length} link(s).`, {
        links,
        count: links.length,
      });
    },

    // Return graph-level metadata for quick diagnostics: counts, last IDs, graph
    // version-ish fields, extra metadata, and group count.
    getGraphInfo() {
      const graph = getGraphOrFailure(app, "getGraphInfo");
      if (graph?.ok === false) return graph;

      const nodes = getGraphNodes(graph);
      const links = getGraphLinks(graph);

      return createSuccess("getGraphInfo", "Current graph summary returned.", {
        node_count: nodes.length,
        link_count: links.length,
        last_node_id: graph.last_node_id ?? null,
        last_link_id: graph.last_link_id ?? null,
        graph_version: graph.version ?? null,
        revision: graph._version ?? null,
        extra: safeClone(graph.extra ?? {}),
        groups_count: Array.isArray(graph._groups) ? graph._groups.length : 0,
      });
    },

    // Return canvas camera/selection information. This is read-only in Stage 3;
    // Stage 7 will add selection and navigation commands.
    getCanvasState() {
      const canvas = app?.canvas;

      if (!canvas) {
        return createFailure(
          "getCanvasState",
          "CANVAS_NOT_READY",
          "ComfyUI canvas is not available yet.",
          {},
          "Wait for the ComfyUI canvas to finish loading, then try again."
        );
      }

      return createSuccess("getCanvasState", "Current canvas state returned.", {
        scale: canvas.ds?.scale ?? null,
        offset: safeClone(canvas.ds?.offset ?? null),
        selected_node_ids: Object.values(canvas.selected_nodes ?? {}).map((node) => node.id),
        selected_count: Object.keys(canvas.selected_nodes ?? {}).length,
        canvas_width: canvas.canvas?.width ?? null,
        canvas_height: canvas.canvas?.height ?? null,
      });
    },

    getSelectedNodes() {
      const canvas = getCanvasOrFailure(app, "getSelectedNodes");
      if (canvas?.ok === false) return canvas;

      const payload = getSelectedNodesPayload(canvas);

      return createSuccess(
        "getSelectedNodes",
        `Found ${payload.count} selected node(s).`,
        payload
      );
    },

    deselectAll() {
      const canvas = getCanvasOrFailure(app, "deselectAll");
      if (canvas?.ok === false) return canvas;

      clearCanvasSelection(canvas);
      markCanvasDirty(app);

      return createSuccess("deselectAll", "Deselected all nodes.", {
        selected_count: 0,
      });
    },

    centerOnNode(nodeId) {
      const graph = getGraphOrFailure(app, "centerOnNode");
      if (graph?.ok === false) return graph;

      const canvas = getCanvasOrFailure(app, "centerOnNode");
      if (canvas?.ok === false) return canvas;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "centerOnNode",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const centered = centerCanvasOnNode(app, node);

      return createSuccess("centerOnNode", `Centered canvas on node ${node.id}.`, {
        node: normalizeNode(node),
        centered,
        canvas_state: {
          scale: canvas.ds?.scale ?? null,
          offset: safeClone(canvas.ds?.offset ?? null),
        },
      });
    },

    selectNode(nodeId, options = {}) {
      const graph = getGraphOrFailure(app, "selectNode");
      if (graph?.ok === false) return graph;

      const canvas = getCanvasOrFailure(app, "selectNode");
      if (canvas?.ok === false) return canvas;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "selectNode",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = selectNodeObjects(app, [node]);
      const shouldCenter = options?.center !== false;
      const centered = shouldCenter ? centerCanvasOnNode(app, node) : false;

      return createSuccess("selectNode", `Selected node ${node.id}.`, {
        ...payload,
        centered,
      });
    },

    selectNodes(nodeIds, options = {}) {
      const graph = getGraphOrFailure(app, "selectNodes");
      if (graph?.ok === false) return graph;

      const canvas = getCanvasOrFailure(app, "selectNodes");
      if (canvas?.ok === false) return canvas;

      if (!Array.isArray(nodeIds)) {
        return createFailure(
          "selectNodes",
          "INVALID_NODE_IDS",
          "selectNodes expects an array of node IDs.",
          { node_ids: nodeIds },
          "Call window.comfyAI.selectNodes([1, 2, 3])."
        );
      }

      const missing = [];
      const nodes = [];

      for (const nodeId of nodeIds) {
        const node = getNodeById(graph, nodeId);

        if (node) {
          nodes.push(node);
        } else {
          missing.push(nodeId);
        }
      }

      if (missing.length > 0) {
        return createFailure(
          "selectNodes",
          "NODE_NOT_FOUND",
          "One or more node IDs were not found.",
          { missing_node_ids: missing },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const payload = selectNodeObjects(app, nodes);
      const shouldCenter = options?.center !== false;
      const centered = shouldCenter && nodes.length > 0 ? centerCanvasOnNode(app, nodes[0]) : false;

      return createSuccess("selectNodes", `Selected ${nodes.length} node(s).`, {
        ...payload,
        centered,
      });
    },

    setWidgetValue(nodeId, widgetNameOrIndex, value) {
      const graph = getGraphOrFailure(app, "setWidgetValue");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("setWidgetValue", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("setWidgetValue", { nodeId, widgetNameOrIndex });
      if (!snapshot.ok) return snapshot;

      const result = setWidgetValuePayload(app, graph, nodeId, widgetNameOrIndex, value);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("setWidgetValue", { nodeId, widgetNameOrIndex, value }, result);
      return result;
    },

    batchSetWidgetValues(updates) {
      const graph = getGraphOrFailure(app, "batchSetWidgetValues");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("batchSetWidgetValues", "edit");
      if (modeBlocked) return modeBlocked;

      if (!Array.isArray(updates)) {
        return createFailure(
          "batchSetWidgetValues",
          "INVALID_UPDATES",
          "batchSetWidgetValues expects an array of update objects.",
          { updates },
          "Use [{ nodeId, widget, value }] or [{ node_id, widget, value }]."
        );
      }

      const snapshot = snapshotManager.beforeEdit("batchSetWidgetValues", { update_count: updates.length });
      if (!snapshot.ok) return snapshot;

      const results = updates.map((update) => {
        const nodeId = update?.nodeId ?? update?.node_id;
        const widget = update?.widget ?? update?.widgetNameOrIndex ?? update?.widget_name_or_index;

        return setWidgetValuePayload(app, graph, nodeId, widget, update?.value);
      });

      const failures = results.filter((result) => !result?.ok);

      const result = createSuccess(
        "batchSetWidgetValues",
        `Applied ${results.length - failures.length} widget update(s); ${failures.length} failed.`,
        {
          results,
          success_count: results.length - failures.length,
          failure_count: failures.length,
          pre_edit_snapshot: snapshot.data.snapshot,
        },
        failures.length > 0 ? ["Some widget updates failed. Inspect data.results for details."] : []
      );
      actionLogger.record("batchSetWidgetValues", { update_count: updates.length }, result);
      return result;
    },

    validateConnection(request = {}) {
      const graph = getGraphOrFailure(app, "validateConnection");
      if (graph?.ok === false) return graph;

      const validation = validateConnectionPayload(graph, request);

      if (!validation.valid) {
        return createFailure(
          "validateConnection",
          "CONNECTION_INVALID",
          "Connection is not valid.",
          validation,
          "Inspect error.details.problems for the exact issue."
        );
      }

      return createSuccess("validateConnection", "Connection is valid.", validation, validation.warnings);
    },

    connectNodes(request = {}) {
      const graph = getGraphOrFailure(app, "connectNodes");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("connectNodes", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("connectNodes", request);
      if (!snapshot.ok) return snapshot;

      const result = connectNodesPayload(app, graph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("connectNodes", request, result);
      return result;
    },

    connectInputToOutput(request = {}) {
      const graph = getGraphOrFailure(app, "connectInputToOutput");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("connectInputToOutput", "edit");
      if (modeBlocked) return modeBlocked;

      const normalizedRequest = {
        fromNodeId: request.outputNodeId ?? request.output_node_id,
        fromOutput: request.output,
        toNodeId: request.inputNodeId ?? request.input_node_id,
        toInput: request.input,
        replaceExisting: request.replaceExisting ?? request.replace_existing,
        force: request.force,
      };
      const snapshot = snapshotManager.beforeEdit("connectInputToOutput", normalizedRequest);
      if (!snapshot.ok) return snapshot;

      const result = connectNodesPayload(app, graph, normalizedRequest);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("connectInputToOutput", normalizedRequest, result);
      return result;
    },

    autoConnectNodes(request = {}) {
      const graph = getGraphOrFailure(app, "autoConnectNodes");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("autoConnectNodes", "edit");
      if (modeBlocked) return modeBlocked;

      const fromNode = getNodeById(graph, request.fromNodeId ?? request.from_node_id);
      const toNode = getNodeById(graph, request.toNodeId ?? request.to_node_id);

      if (!fromNode || !toNode) {
        return createFailure(
          "autoConnectNodes",
          "NODE_NOT_FOUND",
          "Source or target node was not found.",
          {
            from_node_id: request.fromNodeId ?? request.from_node_id,
            to_node_id: request.toNodeId ?? request.to_node_id,
            from_found: Boolean(fromNode),
            to_found: Boolean(toNode),
          },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const replaceExisting = request.replaceExisting === true || request.replace_existing === true;
      const candidates = autoConnectCandidates(fromNode, toNode, replaceExisting, request.preferredType ?? request.preferred_type);
      const best = candidates[0] ?? null;

      if (!best) {
        return createFailure(
          "autoConnectNodes",
          "NO_COMPATIBLE_SOCKET_PAIR",
          "No compatible output/input socket pair was found.",
          {
            from_node: normalizeNode(fromNode),
            to_node: normalizeNode(toNode),
            candidates,
          },
          "Inspect window.comfyAI.getNodeSockets() for both nodes and connect explicitly if needed."
        );
      }

      const normalizedRequest = {
        fromNodeId: fromNode.id,
        fromOutput: best.fromOutput,
        toNodeId: toNode.id,
        toInput: best.toInput,
        replaceExisting,
        force: request.force,
      };
      const snapshot = snapshotManager.beforeEdit("autoConnectNodes", normalizedRequest);
      if (!snapshot.ok) return snapshot;

      const result = connectNodesPayload(app, graph, normalizedRequest);

      if (result.ok) {
        result.data.candidates = candidates;
        result.data.selected_candidate = best;
        result.data.pre_edit_snapshot = snapshot.data.snapshot;
      }

      actionLogger.record("autoConnectNodes", request, result);
      return result;
    },

    disconnectInput(nodeId, inputNameOrIndex) {
      const graph = getGraphOrFailure(app, "disconnectInput");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("disconnectInput", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("disconnectInput", { nodeId, inputNameOrIndex });
      if (!snapshot.ok) return snapshot;

      const result = disconnectInputPayload(app, graph, nodeId, inputNameOrIndex);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("disconnectInput", { nodeId, inputNameOrIndex }, result);
      return result;
    },

    disconnectOutput(nodeId, outputNameOrIndex) {
      const graph = getGraphOrFailure(app, "disconnectOutput");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("disconnectOutput", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("disconnectOutput", { nodeId, outputNameOrIndex });
      if (!snapshot.ok) return snapshot;

      const result = disconnectOutputPayload(app, graph, nodeId, outputNameOrIndex);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("disconnectOutput", { nodeId, outputNameOrIndex }, result);
      return result;
    },

    disconnectAllInputs(nodeId) {
      const graph = getGraphOrFailure(app, "disconnectAllInputs");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "disconnectAllInputs",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const snapshot = snapshotManager.beforeEdit("disconnectAllInputs", { nodeId });
      if (!snapshot.ok) return snapshot;

      const results = (node.inputs ?? []).map((input, index) =>
        disconnectInputPayload(app, graph, node.id, index)
      );

      return createSuccess("disconnectAllInputs", `Processed ${results.length} input socket(s).`, {
        node_id: node.id,
        results,
        old_link_ids: results.map((result) => result?.data?.old_link_id).filter((linkId) => linkId != null),
        pre_edit_snapshot: snapshot.data.snapshot,
      });
    },

    disconnectAllOutputs(nodeId) {
      const graph = getGraphOrFailure(app, "disconnectAllOutputs");
      if (graph?.ok === false) return graph;

      const node = getNodeById(graph, nodeId);

      if (!node) {
        return createFailure(
          "disconnectAllOutputs",
          "NODE_NOT_FOUND",
          `Node not found: ${nodeId}`,
          { node_id: nodeId },
          "Call window.comfyAI.getNodes() to see available node IDs."
        );
      }

      const snapshot = snapshotManager.beforeEdit("disconnectAllOutputs", { nodeId });
      if (!snapshot.ok) return snapshot;

      const results = (node.outputs ?? []).map((output, index) =>
        disconnectOutputPayload(app, graph, node.id, index)
      );

      return createSuccess("disconnectAllOutputs", `Processed ${results.length} output socket(s).`, {
        node_id: node.id,
        results,
        old_link_ids: results.flatMap((result) => result?.data?.old_link_ids ?? []),
        pre_edit_snapshot: snapshot.data.snapshot,
      });
    },

    replaceConnection(request = {}) {
      const graph = getGraphOrFailure(app, "replaceConnection");
      if (graph?.ok === false) return graph;
      const modeBlocked = controlMode.allow("replaceConnection", "edit");
      if (modeBlocked) return modeBlocked;

      const snapshot = snapshotManager.beforeEdit("replaceConnection", request);
      if (!snapshot.ok) return snapshot;

      const result = replaceConnectionPayload(app, graph, request);
      if (result.ok) result.data.pre_edit_snapshot = snapshot.data.snapshot;
      actionLogger.record("replaceConnection", request, result);
      return result;
    },

    backend: {
      async getObjectInfo() {
        const result = await fetchBackendJson("/object_info", "backend.getObjectInfo");

        if (!result.ok) {
          return result;
        }

        return createSuccess("backend.getObjectInfo", "Fetched backend object info.", {
          object_info: result.data.response,
          summary: summarizeObjectInfo(result.data.response),
        });
      },

      async getQueue() {
        return fetchBackendJson("/queue", "backend.getQueue");
      },

      async getHistory() {
        return fetchBackendJson("/history", "backend.getHistory");
      },

      async getSystemStats() {
        return fetchBackendJson("/system_stats", "backend.getSystemStats");
      },

      async compareFrontendNodesWithObjectInfo() {
        const graph = getGraphOrFailure(app, "backend.compareFrontendNodesWithObjectInfo");
        if (graph?.ok === false) return graph;

        const objectInfoResult = await fetchBackendJson(
          "/object_info",
          "backend.compareFrontendNodesWithObjectInfo"
        );

        if (!objectInfoResult.ok) {
          return objectInfoResult;
        }

        const objectInfo = objectInfoResult.data.response ?? {};
        const frontendNodes = getGraphNodes(graph).map(normalizeNode);
        const backendTypes = new Set(Object.keys(objectInfo));
        const frontendTypes = [...new Set(frontendNodes.map((node) => node.type).filter(Boolean))];
        const known = frontendTypes.filter((type) => backendTypes.has(type));
        const missing = frontendTypes.filter((type) => !backendTypes.has(type));

        return createSuccess(
          "backend.compareFrontendNodesWithObjectInfo",
          `Compared ${frontendTypes.length} frontend node type(s) against ${backendTypes.size} backend node definition(s).`,
          {
            frontend_node_count: frontendNodes.length,
            frontend_type_count: frontendTypes.length,
            backend_type_count: backendTypes.size,
            known_types: known,
            missing_types: missing,
            nodes: frontendNodes.map((node) => ({
              id: node.id,
              type: node.type,
              title: node.title,
              known_to_backend: backendTypes.has(node.type),
              backend: objectInfo[node.type]
                ? {
                    display_name: objectInfo[node.type]?.display_name ?? null,
                    category: objectInfo[node.type]?.category ?? null,
                    output: safeClone(objectInfo[node.type]?.output ?? null),
                    output_name: safeClone(objectInfo[node.type]?.output_name ?? null),
                  }
                : null,
            })),
          },
          missing.length > 0
            ? ["Some frontend node types were not found in backend /object_info."]
            : []
        );
      },

      async getDropdownDiagnostics() {
        const graph = getGraphOrFailure(app, "backend.getDropdownDiagnostics");
        if (graph?.ok === false) return graph;

        const objectInfoResult = await fetchBackendJson(
          "/object_info",
          "backend.getDropdownDiagnostics"
        );

        if (!objectInfoResult.ok) {
          return objectInfoResult;
        }

        const objectInfo = objectInfoResult.data.response ?? {};
        const diagnostics = [];

        for (const node of getGraphNodes(graph)) {
          for (const widget of node.widgets ?? []) {
            const widgetInfo = normalizeWidget(widget, diagnostics.length);
            const backendOptions = extractBackendWidgetOptions(objectInfo, node.type, widget.name);
            const options = widgetInfo.dropdown_options ?? backendOptions.options;
            const hasOptions = Array.isArray(options) && options.length > 0;
            const currentValue = widget.value;
            const currentInOptions = hasOptions ? options.includes(currentValue) : null;

            diagnostics.push({
              node_id: node.id,
              node_type: node.type,
              node_title: node.title,
              widget_name: widget.name ?? null,
              widget_type: widget.type ?? null,
              control: widgetInfo.control,
              value: safeClone(currentValue),
              frontend_options: widgetInfo.dropdown_options,
              backend_options_source: backendOptions.source,
              backend_options: backendOptions.options,
              has_options: hasOptions,
              value_in_options: currentInOptions,
              closest_matches:
                hasOptions && currentValue != null && currentInOptions === false
                  ? closestMatches(currentValue, options)
                  : [],
            });
          }
        }

        const invalid = diagnostics.filter((item) =>
          item.control === "dropdown" &&
          item.value_in_options === false
        );

        return createSuccess(
          "backend.getDropdownDiagnostics",
          `Checked ${diagnostics.length} widget(s); found ${invalid.length} invalid dropdown value(s).`,
          {
            diagnostics,
            invalid,
            count: diagnostics.length,
            invalid_count: invalid.length,
          },
          invalid.length > 0
            ? ["Some widget values were not present in available dropdown options."]
            : []
        );
      },

      async searchNodeDefinitions(query = "", options = {}) {
        const objectInfoResult = await fetchBackendJson(
          "/object_info",
          "backend.searchNodeDefinitions"
        );

        if (!objectInfoResult.ok) {
          return objectInfoResult;
        }

        const objectInfo = objectInfoResult.data.response ?? {};
        const limit = options.limit ?? options.max_results ?? 50;
        const matches = searchObjectInfo(objectInfo, query, limit);

        return createSuccess(
          "backend.searchNodeDefinitions",
          `Found ${matches.length} backend node definition match(es).`,
          {
            query,
            matches,
            count: matches.length,
            backend_type_count: Object.keys(objectInfo).length,
          }
        );
      },

      async getNodeDefinition(type) {
        if (!type) {
          return createFailure(
            "backend.getNodeDefinition",
            "NODE_TYPE_MISSING",
            "A node type/class name is required.",
            {},
            "Pass a node class such as 'CheckpointLoaderSimple'."
          );
        }

        const objectInfoResult = await fetchBackendJson(
          "/object_info",
          "backend.getNodeDefinition"
        );

        if (!objectInfoResult.ok) {
          return objectInfoResult;
        }

        const objectInfo = objectInfoResult.data.response ?? {};
        const definition = objectInfo[type];

        if (!definition) {
          return createFailure(
            "backend.getNodeDefinition",
            "NODE_DEFINITION_NOT_FOUND",
            `Backend node definition not found: ${type}`,
            {
              requested_type: type,
              closest_matches: closestMatches(type, Object.keys(objectInfo), 10),
            },
            "Call backend.searchNodeDefinitions(query) to discover installed backend node classes."
          );
        }

        return createSuccess("backend.getNodeDefinition", `Returned backend definition for ${type}.`, {
          definition: summarizeNodeDefinition(type, definition),
        });
      },

      async getModelCatalog() {
        const objectInfoResult = await fetchBackendJson(
          "/object_info",
          "backend.getModelCatalog"
        );

        if (!objectInfoResult.ok) {
          return objectInfoResult;
        }

        const objectInfo = objectInfoResult.data.response ?? {};
        const catalog = buildModelCatalog(objectInfo);

        return createSuccess(
          "backend.getModelCatalog",
          `Extracted ${catalog.categories.length} model option categor${catalog.categories.length === 1 ? "y" : "ies"} from backend node definitions.`,
          {
            ...catalog,
            backend_type_count: Object.keys(objectInfo).length,
          }
        );
      },

      async preflightCurrentWorkflow() {
        const graph = getGraphOrFailure(app, "backend.preflightCurrentWorkflow");
        if (graph?.ok === false) return graph;

        const graphSummary = getGraphSummary(graph);
        const compareResult = await window.comfyAI.backend.compareFrontendNodesWithObjectInfo();
        const dropdownResult = await this.getDropdownDiagnostics();
        const promptResult = await buildCurrentPromptPayload(app);

        const problems = [];
        const warnings = [];

        if (!compareResult.ok) problems.push({ source: "compareFrontendNodesWithObjectInfo", result: compareResult });
        if (!dropdownResult.ok) problems.push({ source: "getDropdownDiagnostics", result: dropdownResult });
        if (!promptResult.ok) problems.push({ source: "prepareCurrentPrompt", result: promptResult });

        const missingTypes = compareResult.ok ? compareResult.data.missing_types ?? [] : [];
        const invalidDropdowns = dropdownResult.ok ? dropdownResult.data.invalid ?? [] : [];

        if (missingTypes.length > 0) {
          problems.push({ source: "object_info", code: "MISSING_NODE_TYPES", missing_types: missingTypes });
        }

        if (invalidDropdowns.length > 0) {
          warnings.push(`${invalidDropdowns.length} dropdown value(s) are not present in backend options.`);
        }

        const ready = problems.length === 0;

        return createSuccess(
          "backend.preflightCurrentWorkflow",
          ready ? "Workflow preflight passed." : "Workflow preflight found blocking problem(s).",
          {
            ready,
            graph: graphSummary,
            problems,
            warnings,
            compare_frontend_nodes: compareResult,
            dropdown_diagnostics: dropdownResult,
            prompt_preparation: promptResult,
          },
          warnings
        );
      },

      async prepareCurrentPrompt() {
        return buildCurrentPromptPayload(app);
      },

      async queueCurrentWorkflow(options = {}) {
        const prepared = await buildCurrentPromptPayload(app);

        if (!prepared.ok) {
          return prepared;
        }

        if (options.dryRun === true || options.dry_run === true) {
          return createSuccess("backend.queueCurrentWorkflow", "Dry run prepared current workflow without queueing.", {
            prepared: prepared.data,
          });
        }

        const body = {
          prompt: prepared.data.prompt,
          extra_data: {
            extra_pnginfo: {
              workflow: prepared.data.workflow,
            },
          },
        };

        if (options.clientId || options.client_id) {
          body.client_id = options.clientId ?? options.client_id;
        }

        if (options.promptId || options.prompt_id) {
          body.prompt_id = options.promptId ?? options.prompt_id;
        }

        const result = await postBackendJson("/prompt", "backend.queueCurrentWorkflow", body);

        if (!result.ok) {
          return result;
        }

        return createSuccess("backend.queueCurrentWorkflow", "Queued current workflow.", {
          prompt_id: result.data.response?.prompt_id ?? null,
          number: result.data.response?.number ?? null,
          node_errors: safeClone(result.data.response?.node_errors ?? {}),
          response: result.data.response,
        });
      },

      async getHistoryForPrompt(promptId) {
        if (!promptId) {
          return createFailure(
            "backend.getHistoryForPrompt",
            "PROMPT_ID_MISSING",
            "A prompt ID is required.",
            {},
            "Pass the prompt_id returned by backend.queueCurrentWorkflow()."
          );
        }

        return fetchBackendJson(`/history/${encodeURIComponent(promptId)}`, "backend.getHistoryForPrompt");
      },

      async waitForPrompt(promptId, options = {}) {
        if (!promptId) {
          return createFailure(
            "backend.waitForPrompt",
            "PROMPT_ID_MISSING",
            "A prompt ID is required.",
            {},
            "Pass the prompt_id returned by backend.queueCurrentWorkflow()."
          );
        }

        const timeoutMs = Number(options.timeoutMs ?? options.timeout_ms ?? 120000);
        const intervalMs = Number(options.intervalMs ?? options.interval_ms ?? 1000);
        const startedAt = Date.now();
        const checks = [];

        while (Date.now() - startedAt <= timeoutMs) {
          const historyResult = await fetchBackendJson(`/history/${encodeURIComponent(promptId)}`, "backend.waitForPrompt");
          if (!historyResult.ok) return historyResult;

          const record = extractPromptHistoryRecord(historyResult, promptId);
          if (record) {
            const outputs = extractOutputsFromHistoryRecord(record);
            return createSuccess("backend.waitForPrompt", `Prompt ${promptId} finished.`, {
              prompt_id: promptId,
              status: record.status ?? null,
              history: record,
              outputs,
              output_count: outputs.length,
              elapsed_ms: Date.now() - startedAt,
              checks,
            });
          }

          const queueResult = await fetchBackendJson("/queue", "backend.waitForPrompt");
          if (!queueResult.ok) return queueResult;

          checks.push({
            checked_at: nowIso(),
            elapsed_ms: Date.now() - startedAt,
            queue: safeClone(queueResult.data.response),
          });

          await sleep(intervalMs);
        }

        return createFailure(
          "backend.waitForPrompt",
          "PROMPT_WAIT_TIMEOUT",
          `Timed out waiting for prompt ${promptId}.`,
          {
            prompt_id: promptId,
            timeout_ms: timeoutMs,
            checks,
          },
          "Increase timeoutMs, inspect backend.getQueue(), or use backend.interrupt() if the run is stuck."
        );
      },

      async getPromptOutputs(promptId) {
        if (!promptId) {
          return createFailure(
            "backend.getPromptOutputs",
            "PROMPT_ID_MISSING",
            "A prompt ID is required.",
            {},
            "Pass the prompt_id returned by backend.queueCurrentWorkflow()."
          );
        }

        const historyResult = await fetchBackendJson(`/history/${encodeURIComponent(promptId)}`, "backend.getPromptOutputs");
        if (!historyResult.ok) return historyResult;

        const record = extractPromptHistoryRecord(historyResult, promptId);
        if (!record) {
          return createFailure(
            "backend.getPromptOutputs",
            "PROMPT_HISTORY_NOT_FOUND",
            `No history record was found for prompt ${promptId}.`,
            { prompt_id: promptId, history_response: historyResult.data.response },
            "Use backend.waitForPrompt(promptId) until the prompt finishes."
          );
        }

        const outputs = extractOutputsFromHistoryRecord(record);
        return createSuccess("backend.getPromptOutputs", `Found ${outputs.length} output file(s) for prompt ${promptId}.`, {
          prompt_id: promptId,
          outputs,
          output_count: outputs.length,
          history: record,
        });
      },

      async runCurrentWorkflowAndWait(options = {}) {
        const queueResult = await this.queueCurrentWorkflow(options);

        if (!queueResult.ok) {
          return queueResult;
        }

        const promptId = queueResult.data.prompt_id;

        if (!promptId) {
          return createFailure(
            "backend.runCurrentWorkflowAndWait",
            "PROMPT_ID_MISSING_FROM_QUEUE_RESPONSE",
            "The workflow was queued but no prompt_id was returned.",
            { queue_result: queueResult },
            "Inspect the queue response and ComfyUI backend behavior."
          );
        }

        const waitResult = await this.waitForPrompt(promptId, options);

        if (!waitResult.ok) {
          return createFailure(
            "backend.runCurrentWorkflowAndWait",
            "PROMPT_RUN_DID_NOT_COMPLETE",
            "Queued workflow did not complete successfully within the requested wait.",
            {
              queue_result: queueResult,
              wait_result: waitResult,
            },
            waitResult.suggested_fix ?? "Inspect backend queue/history."
          );
        }

        return createSuccess("backend.runCurrentWorkflowAndWait", `Workflow completed for prompt ${promptId}.`, {
          prompt_id: promptId,
          queue_result: queueResult,
          wait_result: waitResult,
          outputs: waitResult.data.outputs,
          output_count: waitResult.data.output_count,
        });
      },

      async interrupt() {
        return postBackendJson("/interrupt", "backend.interrupt", {});
      },
    },
  };

  // Expose the command API in the page context where DevTools, Playwright, and
  // future bridge code can call it.
  window.comfyAI = comfyAI;

  logger?.log?.("[ComfyAI] Core installed", {
    core_version: CORE_VERSION,
    source,
    install_count: comfyAI._install_count,
  });

  return createSuccess("installComfyAICore", "ComfyAI core installed.", {
    core_version: CORE_VERSION,
    source,
    install_count: comfyAI._install_count,
    graph_ready: Boolean(app?.graph),
    canvas_ready: Boolean(app?.canvas),
    node_count: safeNodeCount(app),
    installed_at: installedAt,
  });
}

// The loader imports this file and then calls this installer. Exposing the
// installer on window keeps the core usable by future non-ComfyUI loaders too.
window.installComfyAICore = installComfyAICore;

console.log("[ComfyAI] ai_core.js loaded");
