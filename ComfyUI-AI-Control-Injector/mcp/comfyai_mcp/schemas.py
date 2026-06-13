"""AI-facing MCP tool schemas for ComfyAI."""

from __future__ import annotations

from typing import Any


TOOL_CATALOG: list[dict[str, Any]] = [
    {
        "name": "comfy_ping",
        "window_api": "comfyAI.ping",
        "mutates": False,
        "description": "Check whether the ComfyAI browser core is installed and reachable.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "comfy_get_injector_status",
        "window_api": "comfyAIInjector.status",
        "mutates": False,
        "description": "Return loader/injector health, install count, graph readiness, and canvas readiness.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "comfy_list_nodes",
        "window_api": "comfyAI.getNodes",
        "mutates": False,
        "description": "List all nodes in the currently open browser workflow.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "comfy_get_node",
        "window_api": "comfyAI.getNode",
        "mutates": False,
        "description": "Read one node by ID.",
        "input_schema": {
            "type": "object",
            "properties": {"node_id": {"type": "number"}},
            "required": ["node_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_get_node_sockets",
        "window_api": "comfyAI.getNodeSockets",
        "mutates": False,
        "description": "Read input/output sockets for one node.",
        "input_schema": {
            "type": "object",
            "properties": {"node_id": {"type": "number"}},
            "required": ["node_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_get_connection_map",
        "window_api": "comfyAI.getConnectionMap",
        "mutates": False,
        "description": "Return current splines as source socket to target socket records.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "comfy_select_node",
        "window_api": "comfyAI.selectNode",
        "mutates": "canvas_selection_only",
        "description": "Visually select one node in the ComfyUI canvas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "number"},
                "center": {"type": "boolean"},
            },
            "required": ["node_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_set_widget_value",
        "window_api": "comfyAI.setWidgetValue",
        "mutates": True,
        "description": "Set one widget value by widget name or index.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "number"},
                "widget": {"type": ["string", "number"]},
                "value": {},
            },
            "required": ["node_id", "widget", "value"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_validate_connection",
        "window_api": "comfyAI.validateConnection",
        "mutates": False,
        "description": "Validate whether an output socket can connect to an input socket.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fromNodeId": {"type": "number"},
                "fromOutput": {"type": ["string", "number"]},
                "toNodeId": {"type": "number"},
                "toInput": {"type": ["string", "number"]},
                "replaceExisting": {"type": "boolean"},
                "force": {"type": "boolean"},
            },
            "required": ["fromNodeId", "fromOutput", "toNodeId", "toInput"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_connect_nodes",
        "window_api": "comfyAI.connectNodes",
        "mutates": True,
        "description": "Connect an output socket to an input socket and create a visible spline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fromNodeId": {"type": "number"},
                "fromOutput": {"type": ["string", "number"]},
                "toNodeId": {"type": "number"},
                "toInput": {"type": ["string", "number"]},
                "replaceExisting": {"type": "boolean"},
                "force": {"type": "boolean"},
            },
            "required": ["fromNodeId", "fromOutput", "toNodeId", "toInput"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_disconnect_input",
        "window_api": "comfyAI.disconnectInput",
        "mutates": True,
        "description": "Disconnect one input socket by name or index.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "number"},
                "input": {"type": ["string", "number"]},
            },
            "required": ["node_id", "input"],
            "additionalProperties": False,
        },
    },
    {
        "name": "comfy_prepare_current_prompt",
        "window_api": "comfyAI.backend.prepareCurrentPrompt",
        "mutates": False,
        "description": "Convert the current browser graph to executable API prompt data without queueing.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "comfy_queue_current_workflow_dry_run",
        "window_api": "comfyAI.backend.queueCurrentWorkflow",
        "mutates": False,
        "description": "Prepare the current workflow for queueing without running it.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
        "fixed_args": [{"dryRun": True}],
    },
]


def get_tool_by_name(name: str) -> dict[str, Any]:
    """Return one tool catalog entry by MCP tool name."""

    for tool in TOOL_CATALOG:
        if tool["name"] == name:
            return tool
    raise KeyError(f"Unknown ComfyAI MCP tool: {name}")

