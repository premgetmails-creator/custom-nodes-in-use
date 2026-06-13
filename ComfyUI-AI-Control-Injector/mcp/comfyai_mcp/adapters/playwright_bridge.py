"""Playwright browser bridge adapter scaffold."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..browser_bridge import BrowserBridgeInfo, BrowserCommand, BrowserBridgeError


@dataclass(slots=True)
class PlaywrightBrowserBridge:
    """Placeholder Playwright adapter."""

    target_url: str = "http://127.0.0.1:8188"

    def info(self) -> BrowserBridgeInfo:
        return BrowserBridgeInfo(
            provider="playwright",
            target_url=self.target_url,
            mode="scaffold",
            notes=("Playwright adapter scaffold exists; page wiring pending.",),
        )

    async def evaluate(self, command: BrowserCommand) -> dict[str, Any]:
        raise BrowserBridgeError(
            "Playwright adapter is scaffolded but not wired to a browser page yet."
        )

    async def evaluate_comfy_ai(self, command: str, *args: Any) -> dict[str, Any]:
        return await self.evaluate(BrowserCommand("comfyAI", command, args))

    async def evaluate_comfy_ai_injector(self, command: str, *args: Any) -> dict[str, Any]:
        return await self.evaluate(BrowserCommand("comfyAIInjector", command, args))

