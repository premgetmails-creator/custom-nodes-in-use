"""Browser bridge abstraction for ComfyAI MCP tools.

The browser bridge is the only MCP-side component that should know how to reach
the actual ComfyUI browser tab. A future implementation can use Playwright,
Puppeteer, Chrome remote debugging, an extension-native bridge, or a WebSocket
bridge.

Every graph operation should ultimately call the already-installed browser API:

    window.comfyAI.<command>(...)

This keeps the graph-control brain in `web/ai_core.js` and prevents MCP from
becoming a second, divergent implementation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class BrowserBridgeError(RuntimeError):
    """Raised when the MCP bridge cannot reach or execute in the browser."""


@dataclass(slots=True)
class BrowserCommand:
    """Provider-neutral description of one browser-side command call."""

    namespace: str
    command: str
    args: tuple[Any, ...] = field(default_factory=tuple)


@dataclass(slots=True)
class BrowserBridgeInfo:
    """Human/AI-readable metadata about the configured browser backend."""

    provider: str
    target_url: str | None = None
    mode: str = "unconfigured"
    notes: tuple[str, ...] = ()


class BrowserBridge(Protocol):
    """Protocol implemented by concrete browser-control backends."""

    def info(self) -> BrowserBridgeInfo:
        """Return provider metadata for debugging and AI self-awareness."""

    async def evaluate(self, command: BrowserCommand) -> dict[str, Any]:
        """Execute a provider-neutral browser command."""

    async def evaluate_comfy_ai(self, command: str, *args: Any) -> dict[str, Any]:
        """Call `window.comfyAI[command](...args)` in the ComfyUI page."""

    async def evaluate_comfy_ai_injector(self, command: str, *args: Any) -> dict[str, Any]:
        """Call `window.comfyAIInjector[command](...args)` in the ComfyUI page."""


@dataclass(slots=True)
class UnconfiguredBrowserBridge:
    """Placeholder bridge used until Playwright or another backend is wired."""

    reason: str = "No concrete browser backend is configured yet."

    def info(self) -> BrowserBridgeInfo:
        return BrowserBridgeInfo(
            provider="none",
            mode="unconfigured",
            notes=(self.reason,),
        )

    async def evaluate(self, command: BrowserCommand) -> dict[str, Any]:
        raise BrowserBridgeError(
            f"Cannot call window.{command.namespace}.{command.command}: {self.reason}"
        )

    async def evaluate_comfy_ai(self, command: str, *args: Any) -> dict[str, Any]:
        return await self.evaluate(BrowserCommand("comfyAI", command, args))

    async def evaluate_comfy_ai_injector(self, command: str, *args: Any) -> dict[str, Any]:
        return await self.evaluate(BrowserCommand("comfyAIInjector", command, args))

