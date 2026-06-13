"""ComfyAI MCP bridge implementation package.

This package intentionally uses the name `comfyai_mcp` instead of `mcp`.

Why:
    The official Model Context Protocol Python SDK also uses the top-level
    package name `mcp`. If this project used `mcp` as its own Python package, it
    would shadow the SDK and make future server imports brittle.
"""

