"""ComfyUI Canvas Beautifier.

Layout-only frontend extension for arranging selected nodes or frames.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path

try:
    from aiohttp import web
except Exception:  # pragma: no cover - ComfyUI supplies this at runtime.
    web = None

try:
    from server import PromptServer
except Exception:  # pragma: no cover - ComfyUI supplies this at runtime.
    PromptServer = None


WEB_DIRECTORY = "./web"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]


EXTENSION_DIR = Path(__file__).resolve().parent
HISTORY_DIR = EXTENSION_DIR / "history"
HISTORY_FILE = HISTORY_DIR / "beautify_history.jsonl"
_history_lock = threading.Lock()


def _read_latest_record(workflow_title: str | None = None) -> dict | None:
    if not HISTORY_FILE.exists():
        return None

    latest = None
    with HISTORY_FILE.open("r", encoding="utf-8") as history:
        for line in history:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if workflow_title and record.get("workflowTitle") != workflow_title:
                continue
            latest = record
    return latest


def _read_records(workflow_title: str | None = None, limit: int = 50) -> list[dict]:
    if not HISTORY_FILE.exists():
        return []

    records: list[dict] = []
    with HISTORY_FILE.open("r", encoding="utf-8") as history:
        for line in history:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if workflow_title and record.get("workflowTitle") != workflow_title:
                continue
            records.append(record)

    if limit <= 0:
        return list(reversed(records))
    return list(reversed(records[-limit:]))


def _register_routes() -> None:
    if web is None or PromptServer is None or not hasattr(PromptServer, "instance"):
        return

    routes = PromptServer.instance.routes

    @routes.post("/canvas_beautifier/history/append")
    async def append_history(request):
        try:
            payload = await request.json()
        except Exception:
            return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

        if not isinstance(payload, dict):
            return web.json_response({"ok": False, "error": "Payload must be an object"}, status=400)

        record = {
            "serverTimestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            **payload,
        }

        HISTORY_DIR.mkdir(parents=True, exist_ok=True)
        with _history_lock:
            with HISTORY_FILE.open("a", encoding="utf-8") as history:
                history.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")

        return web.json_response({"ok": True, "path": str(HISTORY_FILE)})

    @routes.get("/canvas_beautifier/history/latest")
    async def latest_history(request):
        workflow_title = request.query.get("workflowTitle") or None
        with _history_lock:
            record = _read_latest_record(workflow_title)
        return web.json_response({"ok": True, "record": record})

    @routes.get("/canvas_beautifier/history/list")
    async def list_history(request):
        workflow_title = request.query.get("workflowTitle") or None
        try:
            limit = int(request.query.get("limit", "50"))
        except ValueError:
            limit = 50

        limit = max(1, min(limit, 250))
        with _history_lock:
            records = _read_records(workflow_title, limit)
        return web.json_response({"ok": True, "records": records})


try:
    _register_routes()
except Exception:
    logging.exception("ComfyUI-Canvas-Beautifier: failed to register history routes")
