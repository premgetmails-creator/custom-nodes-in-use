import { app } from "../../../scripts/app.js";
import "./ai_core.js";

// ai_loader.js is the environment-specific part of the project.
//
// Its job is deliberately small:
// 1. Run inside ComfyUI's frontend extension system.
// 2. Import the reusable core file.
// 3. Pass ComfyUI's live `app` object into the core installer.
// 4. Keep `window.comfyAI` alive if the page or graph changes.
//
// The graph-control logic itself should stay in ai_core.js so the same core can
// later be reused by a browser extension, Playwright injection, or a WebSocket
// bridge without rewriting graph-reading and graph-editing behavior.

const LOADER_VERSION = "0.1.0";
const SOURCE = "comfy_extension";
const MONITOR_INTERVAL_MS = 2000;

// Keep state on `window` instead of only in module-local variables. Browser
// development can reload frontend modules in surprising ways, and this helps us
// avoid duplicate intervals and preserve useful install metadata for debugging.
const state = window.__comfyAIInjectorState ?? {
  installCount: 0,
  lastInstallReason: null,
  lastInstallResult: null,
  lastCheckTime: null,
  lastGraph: null,
  monitorId: null,
};

window.__comfyAIInjectorState = state;

// Small defensive helper used by status(). It should never throw because the
// status API is our basic health check when debugging the injector.
function getNodeCount() {
  try {
    return app?.graph?._nodes?.length ?? 0;
  } catch (_) {
    return 0;
  }
}

// Install or reinstall the reusable core into the page. The loader always calls
// the public installer (`window.installComfyAICore`) instead of constructing
// `window.comfyAI` itself. That boundary is important: loader = environment,
// core = graph-control brain.
function runInstall(reason) {
  if (typeof window.installComfyAICore !== "function") {
    state.lastInstallResult = {
      ok: false,
      action: "loaderInstallCore",
      error: {
        code: "CORE_INSTALLER_MISSING",
        message: "window.installComfyAICore is not available.",
        details: { reason },
      },
      suggested_fix: "Confirm ai_core.js loaded before ai_loader.js attempts installation.",
    };
    return state.lastInstallResult;
  }

  const result = window.installComfyAICore({
    app,
    LiteGraph: window.LiteGraph,
    source: SOURCE,
    logger: console,
    options: {
      loader_version: LOADER_VERSION,
    },
  });

  state.installCount += result?.ok ? 1 : 0;
  state.lastInstallReason = reason;
  state.lastInstallResult = result;
  state.lastGraph = app?.graph ?? null;

  return result;
}

// Public loader health check. This intentionally returns a plain object instead
// of throwing, because future MCP tools need predictable JSON-like output.
function status() {
  state.lastCheckTime = new Date().toISOString();

  return {
    ok: Boolean(window.comfyAI && app?.graph && app?.canvas),
    loader_version: LOADER_VERSION,
    core_version: window.comfyAI?.core_version ?? null,
    installed: Boolean(window.comfyAI),
    install_count: state.installCount,
    last_install_reason: state.lastInstallReason,
    last_install_result: state.lastInstallResult,
    source: SOURCE,
    graph_ready: Boolean(app?.graph),
    canvas_ready: Boolean(app?.canvas),
    node_count: getNodeCount(),
    last_check_time: state.lastCheckTime,
  };
}

// Watchdog loop. It currently handles two cases:
// - another script deletes/replaces `window.comfyAI`
// - ComfyUI swaps the graph object after a workflow/page/session change
//
// Later stages can expand this, but the loader should remain compact.
function monitor() {
  state.lastCheckTime = new Date().toISOString();

  if (!window.comfyAI) {
    runInstall("comfyAI_missing");
    return;
  }

  if (app?.graph && state.lastGraph && app.graph !== state.lastGraph) {
    runInstall("graph_changed");
  }
}

// Prevent duplicate intervals. This matters because repeated browser refreshes,
// hot reload behavior, or future manual reinjection should not create multiple
// watchdogs fighting each other.
function ensureMonitor() {
  if (state.monitorId != null) {
    return;
  }

  state.monitorId = window.setInterval(monitor, MONITOR_INTERVAL_MS);
}

// Public loader API. This is separate from `window.comfyAI`, which is owned by
// the reusable core. Use this object to inspect or manually reinstall the bridge
// itself.
window.comfyAIInjector = {
  version: LOADER_VERSION,
  status,
  reinstall(reason = "manual_reinstall") {
    return runInstall(reason);
  },
};

// Register with ComfyUI's frontend extension system. `setup()` runs after ComfyUI
// has loaded enough of the frontend for extensions to initialize. We still keep
// graph/canvas checks defensive because frontend timing can vary between ComfyUI
// versions.
app.registerExtension({
  name: "ComfyUI.AI.Control.Injector",

  async setup() {
    console.log("[ComfyAI] Loader extension setup started");
    runInstall("initial_setup");
    ensureMonitor();
    console.log("[ComfyAI] Loader extension setup complete", status());
  },
});

console.log("[ComfyAI] ai_loader.js loaded");
