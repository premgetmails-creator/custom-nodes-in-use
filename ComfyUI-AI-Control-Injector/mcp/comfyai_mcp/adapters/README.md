# Browser Backend Adapters

Adapters are the only files that should depend on a specific browser automation
library.

The rest of MCP should depend only on:

```python
from comfyai_mcp.browser_bridge import BrowserBridge
```

## Planned Adapters

- `playwright_bridge.py`
  - preferred first implementation
  - good Chrome support
  - supports broader browser options later

- `puppeteer_bridge.py`
  - possible future implementation
  - excellent Chrome-focused option
  - should expose the same `BrowserBridge` contract

## Hard Rule

Do not import Playwright or Puppeteer from MCP tool modules.

Tool modules should call:

```python
await bridge.evaluate_comfy_ai("getNodes")
```

The adapter decides how that becomes:

```js
page.evaluate(() => window.comfyAI.getNodes())
```

