import fs from "node:fs";
import path from "node:path";

type NodeSummary = {
  class: string;
  display_name: string;
  category: string;
  input_names: string[];
  output_types: string[];
  output_names: string[];
  fingerprint: string;
};

type CacheFile = {
  updated_at: string;
  target_url: string;
  node_count: number;
  nodes: Record<string, NodeSummary>;
};

export type KnowledgeResult = {
  ok: boolean;
  action: string;
  summary: string;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  suggested_fix?: string;
};

const DEFAULT_CACHE_PATH = "/Users/krishna/Desktop/ComfyAI/logs/comfyai_node_knowledge_cache.json";

export class NodeKnowledgeCache {
  private readonly targetUrl: string;
  private readonly cachePath: string;
  private lastRefresh: KnowledgeResult | null = null;

  constructor(options: { targetUrl?: string; cachePath?: string } = {}) {
    this.targetUrl = options.targetUrl ?? process.env.COMFYAI_TARGET_URL ?? "http://localhost:8188";
    this.cachePath = options.cachePath ?? process.env.COMFYAI_NODE_KNOWLEDGE_CACHE ?? DEFAULT_CACHE_PATH;
  }

  startupRefresh(): void {
    if (process.env.COMFYAI_DISABLE_STARTUP_NODE_REFRESH === "1") return;
    void this.refresh({ reason: "mcp_startup" }).then((result) => {
      this.lastRefresh = result;
    }).catch((error) => {
      this.lastRefresh = this.failureFromError("nodeKnowledge.startupRefresh", error);
    });
  }

  getStatus(): KnowledgeResult {
    const cache = this.readCache();
    return {
      ok: true,
      action: "nodeKnowledge.getStatus",
      summary: cache
        ? `Node knowledge cache has ${cache.node_count} node class(es).`
        : "Node knowledge cache does not exist yet.",
      data: {
        cache_path: this.cachePath,
        target_url: this.targetUrl,
        cache_exists: Boolean(cache),
        updated_at: cache?.updated_at ?? null,
        node_count: cache?.node_count ?? 0,
        last_refresh: this.lastRefresh,
      },
    };
  }

  async refresh(options: { reason?: string } = {}): Promise<KnowledgeResult> {
    const url = `${this.targetUrl.replace(/\/$/, "")}/object_info`;
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      return this.failureFromError("nodeKnowledge.refresh", error, {
        url,
        reason: options.reason ?? null,
      });
    }

    if (!response.ok) {
      return {
        ok: false,
        action: "nodeKnowledge.refresh",
        summary: "Could not fetch ComfyUI /object_info.",
        error: {
          code: "OBJECT_INFO_FETCH_FAILED",
          message: `GET ${url} returned HTTP ${response.status}.`,
          details: { url, status: response.status },
        },
        suggested_fix: "Confirm active ComfyUI is running and COMFYAI_TARGET_URL points to it.",
      };
    }

    const raw = await response.json() as Record<string, unknown>;
    const previous = this.readCache();
    const next = this.buildCache(raw);
    this.ensureCacheDir();
    fs.writeFileSync(this.cachePath, JSON.stringify(next, null, 2));

    const diff = diffCaches(previous, next);
    const result: KnowledgeResult = {
      ok: true,
      action: "nodeKnowledge.refresh",
      summary: `Refreshed ${next.node_count} node class(es); added ${diff.added.length}, removed ${diff.removed.length}, changed ${diff.changed.length}.`,
      data: {
        cache_path: this.cachePath,
        target_url: this.targetUrl,
        reason: options.reason ?? null,
        updated_at: next.updated_at,
        node_count: next.node_count,
        added: diff.added,
        removed: diff.removed,
        changed: diff.changed,
      },
    };
    this.lastRefresh = result;
    return result;
  }

  search(query = "", options: { limit?: number } = {}): KnowledgeResult {
    const cache = this.readCache();
    if (!cache) {
      return {
        ok: false,
        action: "nodeKnowledge.search",
        summary: "Node knowledge cache is not available.",
        error: {
          code: "NODE_KNOWLEDGE_CACHE_MISSING",
          message: `Cache file does not exist: ${this.cachePath}`,
        },
        suggested_fix: "Run node_knowledge_refresh after ComfyUI has finished starting.",
      };
    }

    const needle = String(query ?? "").toLowerCase();
    const limit = Math.max(1, Math.min(Number(options.limit ?? 20), 100));
    const matches = Object.values(cache.nodes)
      .filter((node) => {
        const text = [
          node.class,
          node.display_name,
          node.category,
          ...node.input_names,
          ...node.output_types,
          ...node.output_names,
        ].join(" ").toLowerCase();
        return !needle || text.includes(needle);
      })
      .slice(0, limit);

    return {
      ok: true,
      action: "nodeKnowledge.search",
      summary: `Found ${matches.length} cached node class match(es).`,
      data: {
        query,
        count: matches.length,
        matches,
      },
    };
  }

  private buildCache(objectInfo: Record<string, unknown>): CacheFile {
    const nodes: Record<string, NodeSummary> = {};

    for (const [nodeClass, value] of Object.entries(objectInfo)) {
      if (!value || typeof value !== "object") continue;
      const info = value as Record<string, unknown>;
      const input = info.input && typeof info.input === "object" ? info.input as Record<string, unknown> : {};
      const inputNames = ["required", "optional", "hidden"].flatMap((section) => {
        const sectionValue = input[section];
        return sectionValue && typeof sectionValue === "object" ? Object.keys(sectionValue as Record<string, unknown>) : [];
      });
      const output = Array.isArray(info.output) ? info.output.map(String) : [];
      const outputName = Array.isArray(info.output_name) ? info.output_name.map(String) : [];
      const summary = {
        class: nodeClass,
        display_name: String(info.display_name ?? nodeClass),
        category: String(info.category ?? ""),
        input_names: inputNames.sort(),
        output_types: output,
        output_names: outputName,
        fingerprint: "",
      };
      summary.fingerprint = JSON.stringify({
        display_name: summary.display_name,
        category: summary.category,
        input_names: summary.input_names,
        output_types: summary.output_types,
        output_names: summary.output_names,
      });
      nodes[nodeClass] = summary;
    }

    return {
      updated_at: new Date().toISOString(),
      target_url: this.targetUrl,
      node_count: Object.keys(nodes).length,
      nodes,
    };
  }

  private readCache(): CacheFile | null {
    try {
      if (!fs.existsSync(this.cachePath)) return null;
      return JSON.parse(fs.readFileSync(this.cachePath, "utf8")) as CacheFile;
    } catch {
      return null;
    }
  }

  private ensureCacheDir(): void {
    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
  }

  private failureFromError(action: string, error: unknown, details: Record<string, unknown> = {}): KnowledgeResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      action,
      summary: "Node knowledge refresh could not reach ComfyUI.",
      error: {
        code: "COMFYUI_OBJECT_INFO_UNREACHABLE",
        message,
        details: {
          target_url: this.targetUrl,
          ...details,
        },
      },
      suggested_fix: "Wait until ComfyUI finishes startup, then call node_knowledge_refresh.",
    };
  }
}

function diffCaches(previous: CacheFile | null, next: CacheFile): { added: string[]; removed: string[]; changed: string[] } {
  const previousNodes = previous?.nodes ?? {};
  const nextNodes = next.nodes;
  const previousClasses = new Set(Object.keys(previousNodes));
  const nextClasses = new Set(Object.keys(nextNodes));

  const added = [...nextClasses].filter((nodeClass) => !previousClasses.has(nodeClass)).sort();
  const removed = [...previousClasses].filter((nodeClass) => !nextClasses.has(nodeClass)).sort();
  const changed = [...nextClasses]
    .filter((nodeClass) => previousClasses.has(nodeClass))
    .filter((nodeClass) => previousNodes[nodeClass]?.fingerprint !== nextNodes[nodeClass]?.fingerprint)
    .sort();

  return { added, removed, changed };
}
