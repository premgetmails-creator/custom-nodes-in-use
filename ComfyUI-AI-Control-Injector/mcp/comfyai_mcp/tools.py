"""Thin MCP tool dispatch for ComfyAI."""

from __future__ import annotations

from typing import Any

from .browser_bridge import BrowserBridge
from .schemas import get_tool_by_name


def _camel_tool_args(tool_name: str, arguments: dict[str, Any]) -> list[Any]:
    """Translate simple MCP argument objects into browser command arguments."""

    if tool_name == "comfy_get_node":
        return [arguments["node_id"]]
    if tool_name == "comfy_get_node_sockets":
        return [arguments["node_id"]]
    if tool_name == "comfy_select_node":
        return [arguments["node_id"], {"center": arguments.get("center", True)}]
    if tool_name == "comfy_set_widget_value":
        return [arguments["node_id"], arguments["widget"], arguments["value"]]
    if tool_name in {"comfy_validate_connection", "comfy_connect_nodes"}:
        return [arguments]
    if tool_name == "comfy_disconnect_input":
        return [arguments["node_id"], arguments["input"]]
    return []


async def call_tool(
    bridge: BrowserBridge,
    tool_name: str,
    arguments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Call one ComfyAI MCP tool through the browser bridge."""

    arguments = arguments or {}
    tool = get_tool_by_name(tool_name)
    fixed_args = tool.get("fixed_args")

    if fixed_args is not None:
        args = fixed_args
    else:
        args = _camel_tool_args(tool_name, arguments)

    window_api = tool["window_api"]

    if window_api.startswith("comfyAIInjector."):
        command = window_api.split(".", 1)[1]
        return await bridge.evaluate_comfy_ai_injector(command, *args)

    if window_api.startswith("comfyAI."):
        command = window_api.split(".", 1)[1]
        return await bridge.evaluate_comfy_ai(command, *args)

    raise ValueError(f"Unsupported window API target: {window_api}")

