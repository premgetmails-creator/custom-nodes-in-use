const comfyAppModule = window.comfyAPI?.app ?? await import("../../../scripts/app.js");
const { app } = comfyAppModule;

const EXTENSION_NAME = "Comfy.CanvasBeautifier";
const COMMANDS = Object.freeze({
  BEAUTIFY: "Comfy.CanvasBeautifier.BeautifySelection",
  RESTORE_LAST: "Comfy.CanvasBeautifier.RestoreLast",
  HISTORY: "Comfy.CanvasBeautifier.History",
});

const RULES = Object.freeze({
  parentChildGap: 120,
  siblingGap: 50,
  clusterGap: 120,
  frameTopPadding: 80,
  frameSidePadding: 50,
  frameBottomPadding: 50,
  grid: 10,
});

const ROLE_WEIGHTS = [
  ["ksampler", 10],
  ["sampler", 8],
  ["sequencer", 8],
  ["ltx", 5],
  ["apply", 5],
  ["merge", 5],
  ["combine", 5],
  ["conditioning", 4],
  ["condition", 4],
  ["decode", 3],
  ["vae", 2],
];

function toast(severity, summary, detail = "", life = 2800) {
  const payload = { severity, summary, detail, life };
  if (app.extensionManager?.toast?.add) {
    app.extensionManager.toast.add(payload);
  } else {
    console[severity === "error" ? "error" : severity === "warn" ? "warn" : "log"](
      `[Canvas Beautifier] ${summary}${detail ? `: ${detail}` : ""}`,
    );
  }
}

function snap(value, grid = RULES.grid) {
  return Math.round(value / grid) * grid;
}

function arr(value, fallback = [0, 0]) {
  try {
    return Array.from(value).map(Number);
  } catch {
    return fallback.slice();
  }
}

function nodeSize(node) {
  return arr(node.size, [Number(node.width || 220), Number(node.height || 100)]);
}

function nodeBounding(node) {
  const out = [0, 0, 0, 0];
  try {
    if (typeof node.getBounding === "function") {
      return arr(node.getBounding(out), out);
    }
  } catch {
    // Fall through to pos + size.
  }
  const pos = arr(node.pos);
  const size = nodeSize(node);
  return [pos[0], pos[1], size[0], size[1]];
}

function nodeRecord(node) {
  const pos = arr(node.pos);
  const size = nodeSize(node);
  const bounding = nodeBounding(node);
  return {
    id: node.id,
    node,
    title: node.title || node.type || `Node ${node.id}`,
    type: node.type || "",
    pos,
    size,
    bounding,
    leftPad: pos[0] - bounding[0],
    topPad: pos[1] - bounding[1],
    renderedWidth: bounding[2],
    visibleHeight: bounding[3],
  };
}

function groupBounds(group) {
  return arr(
    group?._bounding || group?.bounding || [
      group?.pos?.[0] || 0,
      group?.pos?.[1] || 0,
      group?.size?.[0] || 0,
      group?.size?.[1] || 0,
    ],
    [0, 0, 0, 0],
  );
}

function rectFromNodeRecord(record) {
  return [
    record.pos[0] - record.leftPad,
    record.pos[1] - record.topPad,
    record.renderedWidth,
    record.visibleHeight,
  ];
}

function plannedRenderedRect(planItem) {
  return [
    planItem.to[0] - planItem.leftPad,
    planItem.to[1] - planItem.topPad,
    planItem.renderedWidth,
    planItem.visibleHeight,
  ];
}

function rectRight(rect) {
  return rect[0] + rect[2];
}

function rectBottom(rect) {
  return rect[1] + rect[3];
}

function rectsOverlap(a, b, padding = 0) {
  return !(
    rectRight(a) + padding <= b[0] ||
    rectRight(b) + padding <= a[0] ||
    rectBottom(a) + padding <= b[1] ||
    rectBottom(b) + padding <= a[1]
  );
}

function rectContains(container, rect) {
  return (
    rect[0] >= container[0] - 1 &&
    rect[1] >= container[1] - 1 &&
    rectRight(rect) <= rectRight(container) + 1 &&
    rectBottom(rect) <= rectBottom(container) + 1
  );
}

function unionRects(rects) {
  const minX = Math.min(...rects.map((r) => r[0]));
  const minY = Math.min(...rects.map((r) => r[1]));
  const maxX = Math.max(...rects.map(rectRight));
  const maxY = Math.max(...rects.map(rectBottom));
  return [minX, minY, maxX - minX, maxY - minY];
}

function normalizeLink(link) {
  if (Array.isArray(link)) {
    return {
      id: link[0],
      from: link[1],
      from_slot: link[2],
      to: link[3],
      to_slot: link[4],
      type: link[5],
    };
  }

  return {
    id: link.id,
    from: link.origin_id,
    from_slot: link.origin_slot,
    to: link.target_id,
    to_slot: link.target_slot,
    type: link.type,
  };
}

function graphLinks(graph) {
  const raw = graph?.links;
  const links = Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw || {}).filter(Boolean);
  return links.map(normalizeLink).filter((link) => Number.isFinite(Number(link.from)) && Number.isFinite(Number(link.to)));
}

function getNodeById(graph, id) {
  return graph.getNodeById?.(Number(id)) || (graph._nodes || []).find((node) => node.id === Number(id));
}

function socketPosition(node, isInput, slot) {
  const out = [0, 0];
  try {
    if (typeof node.getConnectionPos === "function") {
      return arr(node.getConnectionPos(isInput, slot, out) || out);
    }
  } catch {
    // Ignore and use fallback.
  }

  const pos = arr(node.pos);
  const size = nodeSize(node);
  return [isInput ? pos[0] + 10 : pos[0] + size[0] - 10, pos[1] + size[1] / 2];
}

function selectedGroups(graph, canvas) {
  const groups = graph._groups || graph.groups || [];
  const selected = [];

  for (const item of canvas?.selectedItems || []) {
    if (groups.includes(item)) selected.push(item);
  }

  for (const group of groups) {
    if (group.selected && !selected.includes(group)) selected.push(group);
  }

  return selected;
}

function selectedNodes(canvas) {
  return Object.values(canvas?.selected_nodes || {}).filter(Boolean);
}

function isGraphNode(value) {
  return Boolean(value && Number.isFinite(Number(value.id)) && value.pos && value.size);
}

function groupChildren(group) {
  const direct = [
    ...Array.from(group?._children || []),
    ...Array.from(group?._nodes || []),
    ...Array.from(group?.nodes || []),
  ].filter(isGraphNode);
  return Array.from(new Map(direct.map((node) => [node.id, node])).values());
}

function collectScope(graph, canvas) {
  const groups = selectedGroups(graph, canvas);
  const allNodes = graph._nodes || graph.nodes || [];

  if (groups.length > 0) {
    const group = groups[0];
    const bounds = groupBounds(group);
    const explicitChildren = groupChildren(group);
    const nodes = explicitChildren.length > 0
      ? explicitChildren
      : allNodes.filter((node) => rectContains(bounds, nodeBounding(node)));
    return { kind: "group", group, groups, nodes };
  }

  const nodes = selectedNodes(canvas);
  if (nodes.length > 0) {
    return { kind: "nodes", group: null, groups: [], nodes };
  }

  return { kind: "empty", group: null, groups: [], nodes: [] };
}

function connectedComponents(records, links) {
  const ids = new Set(records.map((record) => record.id));
  const adjacency = new Map(records.map((record) => [record.id, new Set()]));

  for (const link of links) {
    if (!ids.has(link.from) || !ids.has(link.to)) continue;
    adjacency.get(link.from).add(link.to);
    adjacency.get(link.to).add(link.from);
  }

  const seen = new Set();
  const components = [];

  for (const record of records) {
    if (seen.has(record.id)) continue;
    const stack = [record.id];
    const componentIds = [];
    seen.add(record.id);

    while (stack.length > 0) {
      const id = stack.pop();
      componentIds.push(id);
      for (const next of adjacency.get(id) || []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }

    components.push(componentIds.map((id) => records.find((record) => record.id === id)));
  }

  components.sort((a, b) => {
    const ar = unionRects(a.map((record) => rectFromNodeRecord(record)));
    const br = unionRects(b.map((record) => rectFromNodeRecord(record)));
    return ar[0] - br[0] || ar[1] - br[1];
  });

  return components;
}

function parentScore(record, internalLinks) {
  const inCount = internalLinks.filter((link) => link.to === record.id).length;
  const outCount = internalLinks.filter((link) => link.from === record.id).length;
  const degree = inCount + outCount;
  const text = `${record.type} ${record.title}`.toLowerCase();
  const role = ROLE_WEIGHTS.reduce((score, [word, weight]) => score + (text.includes(word) ? weight : 0), 0);
  return [degree + role - Math.abs(inCount - outCount) * 0.1, degree, inCount + outCount, record.size[0] * record.size[1]];
}

function compareScore(a, b) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
}

function chooseParent(records, internalLinks) {
  return records.reduce((best, current) => {
    if (!best) return current;
    const diff = compareScore(parentScore(current, internalLinks), parentScore(best, internalLinks));
    return diff > 0 ? current : best;
  }, null);
}

function socketOffset(record, isInput, slot) {
  const socket = socketPosition(record.node, isInput, slot);
  return [socket[0] - record.pos[0], socket[1] - record.pos[1]];
}

function snapIfClose(value) {
  const snapped = snap(value);
  return Math.abs(snapped - value) < 0.001 ? snapped : value;
}

function average(values, fallback = 0) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return fallback;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function visibleTop(planItem) {
  return planItem.to[1] - planItem.topPad;
}

function visibleBottom(planItem) {
  return visibleTop(planItem) + planItem.visibleHeight;
}

function visibleLeft(planItem) {
  return planItem.to[0] - planItem.leftPad;
}

function visibleRight(planItem) {
  return visibleLeft(planItem) + planItem.renderedWidth;
}

function linkChildId(link, side) {
  return side === "left" ? link.from : link.to;
}

function parentSlot(link, side) {
  return Number(side === "left" ? link.to_slot : link.from_slot) || 0;
}

function childSlot(link, side) {
  return Number(side === "left" ? link.from_slot : link.to_slot) || 0;
}

function parentSocketOffset(parent, side, link) {
  return side === "left"
    ? socketOffset(parent, true, link.to_slot)
    : socketOffset(parent, false, link.from_slot);
}

function childSocketOffset(childRecord, side, link) {
  return side === "left"
    ? socketOffset(childRecord, false, link.from_slot)
    : socketOffset(childRecord, true, link.to_slot);
}

function sortLinksForChild(links, side, parent) {
  return links.slice().sort((a, b) => {
    const slotDiff = parentSlot(a, side) - parentSlot(b, side);
    if (slotDiff) return slotDiff;

    const yDiff = parentSocketOffset(parent, side, a)[1] - parentSocketOffset(parent, side, b)[1];
    if (yDiff) return yDiff;

    return childSlot(a, side) - childSlot(b, side);
  });
}

function identifySideChildren(sideLinks, side, parent, plan) {
  const byChild = new Map();

  for (const link of sideLinks) {
    const childId = linkChildId(link, side);
    const item = plan.get(childId);
    if (!item) continue;
    if (!byChild.has(childId)) {
      byChild.set(childId, { childId, item, links: [], anchorLink: null });
    }
    byChild.get(childId).links.push(link);
  }

  const children = Array.from(byChild.values()).map((child) => {
    const links = sortLinksForChild(child.links, side, parent);
    return { ...child, links, anchorLink: links[0] };
  });

  children.sort((a, b) => {
    const slotDiff = parentSlot(a.anchorLink, side) - parentSlot(b.anchorLink, side);
    if (slotDiff) return slotDiff;

    const yDiff = parentSocketOffset(parent, side, a.anchorLink)[1]
      - parentSocketOffset(parent, side, b.anchorLink)[1];
    if (yDiff) return yDiff;

    return a.item.from[1] - b.item.from[1] || a.item.from[0] - b.item.from[0] || a.childId - b.childId;
  });

  return children;
}

function setSideX(childIds, side, parentItem, plan) {
  if (side === "left") {
    const edge = visibleLeft(parentItem) - RULES.parentChildGap;
    for (const childId of childIds) {
      const item = plan.get(childId);
      item.to[0] = snap(edge - item.renderedWidth + item.leftPad);
    }
  } else {
    const edge = visibleRight(parentItem) + RULES.parentChildGap;
    for (const childId of childIds) {
      const item = plan.get(childId);
      item.to[0] = snap(edge + item.leftPad);
    }
  }
}

function stackCentered(items, centerY) {
  const totalHeight = items.reduce((sum, item) => sum + item.visibleHeight, 0)
    + RULES.siblingGap * Math.max(0, items.length - 1);
  let cursorTop = snap(centerY - totalHeight / 2);

  for (const item of items) {
    item.to[1] = snap(cursorTop + item.topPad);
    cursorTop = visibleBottom(item) + RULES.siblingGap;
  }
}

function stackAroundIndex(items, middleIndex) {
  for (let index = middleIndex - 1; index >= 0; index -= 1) {
    const current = items[index];
    const next = items[index + 1];
    current.to[1] = snap(visibleTop(next) - RULES.siblingGap - current.visibleHeight + current.topPad);
  }

  for (let index = middleIndex + 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    current.to[1] = snap(visibleBottom(previous) + RULES.siblingGap + current.topPad);
  }
}

function alignCenterChildSocket(parent, side, parentItem, child) {
  const parentSocket = parentSocketOffset(parent, side, child.anchorLink);
  const childSocket = childSocketOffset(child.item.record, side, child.anchorLink);
  child.item.to[1] = snapIfClose(parentItem.to[1] + parentSocket[1] - childSocket[1]);
}

function layoutSide(sideLinks, side, parent, plan) {
  const children = identifySideChildren(sideLinks, side, parent, plan);
  if (children.length === 0) return children;

  const childIds = children.map((child) => child.childId);
  const childItems = children.map((child) => child.item);
  const parentItem = plan.get(parent.id);

  parentItem.to = [snap(parentItem.to[0]), snap(parentItem.to[1])];

  // Keep this order literal: children -> side -> count -> odd center socket -> fan-out.
  setSideX(childIds, side, parentItem, plan);

  if (childItems.length % 2 === 1) {
    const middleIndex = Math.floor(childItems.length / 2);
    alignCenterChildSocket(parent, side, parentItem, children[middleIndex]);
    stackAroundIndex(childItems, middleIndex);
  } else {
    const anchorYs = children.map((child) => parentItem.to[1] + parentSocketOffset(parent, side, child.anchorLink)[1]);
    stackCentered(childItems, average(anchorYs, parentItem.to[1] + parent.size[1] / 2));
  }

  return children;
}

function directedDistances(parentId, internalLinks, direction) {
  const distances = new Map([[parentId, 0]]);
  const queue = [parentId];

  while (queue.length > 0) {
    const current = queue.shift();
    const distance = distances.get(current);

    for (const link of internalLinks) {
      const next = direction === "left" && link.to === current
        ? link.from
        : direction === "right" && link.from === current
          ? link.to
          : null;
      if (next === null || distances.has(next)) continue;
      distances.set(next, distance + 1);
      queue.push(next);
    }
  }

  return distances;
}

function nearestPlacedIds(distance, placedByDistance, parentId) {
  for (let candidate = distance - 1; candidate >= 0; candidate -= 1) {
    const ids = placedByDistance.get(candidate);
    if (ids?.length) return new Set(ids);
  }
  return new Set([parentId]);
}

function columnAnchor(item, side, closerIds, internalLinks, plan) {
  const anchors = [];

  for (const link of internalLinks) {
    if (side === "left" && link.from === item.record.id && closerIds.has(link.to)) {
      const closer = plan.get(link.to);
      if (!closer) continue;
      anchors.push({
        y: closer.to[1] + socketOffset(closer.record, true, link.to_slot)[1],
        childOffsetY: socketOffset(item.record, false, link.from_slot)[1],
      });
    } else if (side === "right" && closerIds.has(link.from) && link.to === item.record.id) {
      const closer = plan.get(link.from);
      if (!closer) continue;
      anchors.push({
        y: closer.to[1] + socketOffset(closer.record, false, link.from_slot)[1],
        childOffsetY: socketOffset(item.record, true, link.to_slot)[1],
      });
    }
  }

  if (anchors.length === 0) return null;
  return {
    y: average(anchors.map((anchor) => anchor.y), item.to[1] + item.size[1] / 2),
    childOffsetY: average(anchors.map((anchor) => anchor.childOffsetY), item.size[1] / 2),
  };
}

function placeColumnX(items, side, closerIds, plan) {
  const closerItems = Array.from(closerIds).map((id) => plan.get(id)).filter(Boolean);
  if (closerItems.length === 0) return;

  if (side === "left") {
    const edge = Math.min(...closerItems.map(visibleLeft)) - RULES.parentChildGap;
    for (const item of items) {
      item.to[0] = snap(edge - item.renderedWidth + item.leftPad);
    }
  } else {
    const edge = Math.max(...closerItems.map(visibleRight)) + RULES.parentChildGap;
    for (const item of items) {
      item.to[0] = snap(edge + item.leftPad);
    }
  }
}

function layoutColumnY(items, side, closerIds, internalLinks, plan) {
  const scored = items.map((item) => {
    const anchor = columnAnchor(item, side, closerIds, internalLinks, plan);
    return {
      item,
      anchor,
      sortY: anchor?.y ?? item.from[1],
      sortX: item.from[0],
    };
  }).sort((a, b) => a.sortY - b.sortY || a.sortX - b.sortX || a.item.record.id - b.item.record.id);

  const ordered = scored.map((entry) => entry.item);
  const anchors = scored.map((entry) => entry.anchor?.y).filter((value) => Number.isFinite(value));
  const closerRects = Array.from(closerIds).map((id) => plan.get(id)).filter(Boolean).map(plannedRenderedRect);
  const closerCenter = closerRects.length > 0
    ? unionRects(closerRects)[1] + unionRects(closerRects)[3] / 2
    : ordered[0].to[1];

  if (ordered.length % 2 === 1) {
    const middleIndex = Math.floor(ordered.length / 2);
    const middleAnchor = scored[middleIndex].anchor;
    if (middleAnchor) {
      ordered[middleIndex].to[1] = snapIfClose(middleAnchor.y - middleAnchor.childOffsetY);
      stackAroundIndex(ordered, middleIndex);
      return;
    }
  }

  stackCentered(ordered, average(anchors, closerCenter));
}

function layoutRankedColumns(side, records, distances, directIds, parentId, plan, internalLinks) {
  const columns = new Map();

  for (const record of records) {
    const distance = distances.get(record.id);
    if (!Number.isFinite(distance) || distance <= 1 || directIds.has(record.id)) continue;
    if (!columns.has(distance)) columns.set(distance, []);
    columns.get(distance).push(plan.get(record.id));
  }

  const placedByDistance = new Map([[0, [parentId]]]);
  if (directIds.size > 0) placedByDistance.set(1, Array.from(directIds));
  const placed = new Set();

  for (const distance of Array.from(columns.keys()).sort((a, b) => a - b)) {
    const items = columns.get(distance).filter(Boolean);
    if (items.length === 0) continue;
    const closerIds = nearestPlacedIds(distance, placedByDistance, parentId);
    placeColumnX(items, side, closerIds, plan);
    layoutColumnY(items, side, closerIds, internalLinks, plan);
    const ids = items.map((item) => item.record.id);
    placedByDistance.set(distance, ids);
    for (const id of ids) placed.add(id);
  }

  return placed;
}

function layoutLooseColumn(side, records, parentItem, plan) {
  if (records.length === 0) return;

  const items = records.map((record) => plan.get(record.id)).filter(Boolean)
    .sort((a, b) => a.from[1] - b.from[1] || a.from[0] - b.from[0] || a.record.id - b.record.id);
  const looseIds = new Set(items.map((item) => item.record.id));
  const placedItems = Array.from(plan.values()).filter((item) => !looseIds.has(item.record.id));
  const anchors = placedItems.length > 0 ? placedItems : Array.from(plan.values());

  if (side === "left") {
    const edge = Math.min(...anchors.map(visibleLeft)) - RULES.parentChildGap;
    for (const item of items) item.to[0] = snap(edge - item.renderedWidth + item.leftPad);
  } else {
    const edge = Math.max(...anchors.map(visibleRight)) + RULES.parentChildGap;
    for (const item of items) item.to[0] = snap(edge + item.leftPad);
  }

  stackCentered(items, visibleTop(parentItem) + parentItem.visibleHeight / 2);
}

function makePlan(componentRecords) {
  return new Map(componentRecords.map((record) => [
    record.id,
    {
      record,
      title: record.title,
      type: record.type,
      from: record.pos.slice(),
      to: [snap(record.pos[0]), snap(record.pos[1])],
      size: record.size.slice(),
      leftPad: record.leftPad,
      topPad: record.topPad,
      renderedWidth: record.renderedWidth,
      visibleHeight: record.visibleHeight,
    },
  ]));
}

function sortRecordsVisual(a, b) {
  return a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1] || a.id - b.id;
}

function assignDirectedLayers(componentRecords, internalLinks) {
  const ids = new Set(componentRecords.map((record) => record.id));
  const byId = new Map(componentRecords.map((record) => [record.id, record]));
  const incoming = new Map(componentRecords.map((record) => [record.id, []]));
  const outgoing = new Map(componentRecords.map((record) => [record.id, []]));
  const indegree = new Map(componentRecords.map((record) => [record.id, 0]));

  for (const link of internalLinks) {
    if (!ids.has(link.from) || !ids.has(link.to)) continue;
    outgoing.get(link.from).push(link);
    incoming.get(link.to).push(link);
    indegree.set(link.to, indegree.get(link.to) + 1);
  }

  const queue = componentRecords
    .filter((record) => indegree.get(record.id) === 0)
    .sort(sortRecordsVisual);
  const layerOf = new Map(queue.map((record) => [record.id, 0]));
  const processed = new Set();

  while (queue.length > 0) {
    const record = queue.shift();
    processed.add(record.id);

    for (const link of outgoing.get(record.id) || []) {
      const nextLayer = (layerOf.get(record.id) || 0) + 1;
      layerOf.set(link.to, Math.max(layerOf.get(link.to) || 0, nextLayer));
      indegree.set(link.to, indegree.get(link.to) - 1);
      if (indegree.get(link.to) === 0 && !processed.has(link.to)) {
        queue.push(byId.get(link.to));
        queue.sort(sortRecordsVisual);
      }
    }
  }

  const unresolved = componentRecords.filter((record) => !layerOf.has(record.id)).sort(sortRecordsVisual);
  for (const record of unresolved) {
    const predecessorLayers = (incoming.get(record.id) || [])
      .map((link) => layerOf.get(link.from))
      .filter((layer) => Number.isFinite(layer));
    const fallbackLayer = predecessorLayers.length > 0 ? Math.max(...predecessorLayers) + 1 : 0;
    layerOf.set(record.id, fallbackLayer);
  }

  const uniqueLayers = Array.from(new Set(layerOf.values())).sort((a, b) => a - b);
  const compact = new Map(uniqueLayers.map((layer, index) => [layer, index]));
  for (const [id, layer] of layerOf.entries()) layerOf.set(id, compact.get(layer));

  const layers = new Map();
  for (const record of componentRecords) {
    const layer = layerOf.get(record.id) || 0;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(record);
  }

  for (const records of layers.values()) {
    records.sort((a, b) => a.pos[1] - b.pos[1] || a.pos[0] - b.pos[0] || a.id - b.id);
  }

  return { layers, layerOf, incoming, outgoing };
}

function layerNumbers(layers) {
  return Array.from(layers.keys()).sort((a, b) => a - b);
}

function layerItems(layerRecords, plan) {
  return layerRecords.map((record) => plan.get(record.id)).filter(Boolean);
}

function placeSourceLayer(layerRecords, plan) {
  const items = layerItems(layerRecords, plan);
  if (items.length === 0) return;

  const originalBounds = unionRects(layerRecords.map(rectFromNodeRecord));
  const leftEdge = snap(originalBounds[0]);
  for (const item of items) {
    item.to[0] = snap(leftEdge + item.leftPad);
  }

  stackCentered(items, originalBounds[1] + originalBounds[3] / 2);
}

function primaryParentForLayer(record, layer, incoming, layerOf, plan) {
  const candidates = (incoming.get(record.id) || [])
    .filter((link) => Number.isFinite(layerOf.get(link.from)) && layerOf.get(link.from) < layer)
    .map((link) => ({
      link,
      parentLayer: layerOf.get(link.from),
      parentItem: plan.get(link.from),
    }))
    .filter((candidate) => candidate.parentItem);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const layerDiff = b.parentLayer - a.parentLayer;
    if (layerDiff) return layerDiff;

    const slotDiff = (Number(a.link.to_slot) || 0) - (Number(b.link.to_slot) || 0);
    if (slotDiff) return slotDiff;

    const yDiff = Math.abs(a.parentItem.from[1] - record.pos[1]) - Math.abs(b.parentItem.from[1] - record.pos[1]);
    if (yDiff) return yDiff;

    return a.link.from - b.link.from;
  });

  return candidates[0];
}

function layoutChildFamily(parentItem, children) {
  if (children.length === 0) return;

  children.sort((a, b) => {
    const outputSlotDiff = (Number(a.link.from_slot) || 0) - (Number(b.link.from_slot) || 0);
    if (outputSlotDiff) return outputSlotDiff;

    const inputSlotDiff = (Number(a.link.to_slot) || 0) - (Number(b.link.to_slot) || 0);
    if (inputSlotDiff) return inputSlotDiff;

    return a.item.from[1] - b.item.from[1] || a.item.record.id - b.item.record.id;
  });

  const items = children.map((child) => child.item);
  if (items.length % 2 === 1) {
    const middleIndex = Math.floor(items.length / 2);
    const middle = children[middleIndex];
    const parentSocket = socketOffset(parentItem.record, false, middle.link.from_slot);
    const childSocket = socketOffset(middle.item.record, true, middle.link.to_slot);
    middle.item.to[1] = snapIfClose(parentItem.to[1] + parentSocket[1] - childSocket[1]);
    stackAroundIndex(items, middleIndex);
  } else {
    const socketYs = children.map((child) => (
      parentItem.to[1] + socketOffset(parentItem.record, false, child.link.from_slot)[1]
    ));
    stackCentered(items, average(socketYs, visibleTop(parentItem) + parentItem.visibleHeight / 2));
  }
}

function familyBounds(children) {
  return unionRects(children.map((child) => plannedRenderedRect(child.item)));
}

function shiftFamily(children, dy) {
  for (const child of children) {
    child.item.to[1] = snap(child.item.to[1] + dy);
  }
}

function resolveLayerFamilyOverlaps(families) {
  const ordered = families
    .filter((family) => family.children.length > 0)
    .map((family) => ({ ...family, bounds: familyBounds(family.children) }))
    .sort((a, b) => a.bounds[1] - b.bounds[1] || a.parentItem.to[1] - b.parentItem.to[1]);

  let cursor = null;
  for (const family of ordered) {
    if (cursor !== null && family.bounds[1] < cursor) {
      const dy = cursor - family.bounds[1];
      shiftFamily(family.children, dy);
      family.bounds = familyBounds(family.children);
    }
    cursor = rectBottom(family.bounds) + RULES.siblingGap;
  }
}

function placeLayer(layerRecords, layer, previousLayerRecords, layerState, plan) {
  const items = layerItems(layerRecords, plan);
  if (items.length === 0) return;

  const previousItems = layerItems(previousLayerRecords, plan);
  const previousRight = Math.max(...previousItems.map(visibleRight));
  const layerLeft = previousRight + RULES.parentChildGap;

  for (const item of items) {
    item.to[0] = snap(layerLeft + item.leftPad);
  }

  const familyByParent = new Map();
  const loose = [];

  for (const record of layerRecords) {
    const primary = primaryParentForLayer(record, layer, layerState.incoming, layerState.layerOf, plan);
    const item = plan.get(record.id);
    if (!primary) {
      loose.push({ item });
      continue;
    }

    const parentId = primary.parentItem.record.id;
    if (!familyByParent.has(parentId)) {
      familyByParent.set(parentId, {
        parentItem: primary.parentItem,
        children: [],
      });
    }
    familyByParent.get(parentId).children.push({ item, link: primary.link });
  }

  const families = Array.from(familyByParent.values())
    .sort((a, b) => visibleTop(a.parentItem) - visibleTop(b.parentItem) || a.parentItem.record.id - b.parentItem.record.id);

  for (const family of families) {
    layoutChildFamily(family.parentItem, family.children);
  }
  resolveLayerFamilyOverlaps(families);

  if (loose.length > 0) {
    const looseItems = loose.map((entry) => entry.item).sort((a, b) => a.from[1] - b.from[1] || a.record.id - b.record.id);
    const occupied = families.flatMap((family) => family.children.map((child) => child.item));
    const occupiedBounds = occupied.length > 0 ? unionRects(occupied.map(plannedRenderedRect)) : null;
    const center = occupiedBounds
      ? rectBottom(occupiedBounds) + RULES.siblingGap + looseItems.reduce((sum, item) => sum + item.visibleHeight, 0) / 2
      : unionRects(previousItems.map(plannedRenderedRect))[1] + unionRects(previousItems.map(plannedRenderedRect))[3] / 2;
    stackCentered(looseItems, center);
  }
}

function primaryChildForPreviousLayer(record, currentLayer, outgoing, layerOf, plan) {
  const candidates = (outgoing.get(record.id) || [])
    .filter((link) => layerOf.get(link.to) === currentLayer)
    .map((link) => ({ link, childItem: plan.get(link.to) }))
    .filter((candidate) => candidate.childItem);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const slotDiff = (Number(a.link.to_slot) || 0) - (Number(b.link.to_slot) || 0);
    if (slotDiff) return slotDiff;

    const yDiff = Math.abs(a.childItem.to[1] - record.pos[1]) - Math.abs(b.childItem.to[1] - record.pos[1]);
    if (yDiff) return yDiff;

    return a.link.to - b.link.to;
  });

  return candidates[0];
}

function layoutInputFamily(consumerItem, providers) {
  if (providers.length === 0) return;

  providers.sort((a, b) => {
    const inputSlotDiff = (Number(a.link.to_slot) || 0) - (Number(b.link.to_slot) || 0);
    if (inputSlotDiff) return inputSlotDiff;

    const outputSlotDiff = (Number(a.link.from_slot) || 0) - (Number(b.link.from_slot) || 0);
    if (outputSlotDiff) return outputSlotDiff;

    return a.item.from[1] - b.item.from[1] || a.item.record.id - b.item.record.id;
  });

  const edge = visibleLeft(consumerItem) - RULES.parentChildGap;
  for (const provider of providers) {
    provider.item.to[0] = snap(edge - provider.item.renderedWidth + provider.item.leftPad);
  }

  const items = providers.map((provider) => provider.item);
  if (items.length % 2 === 1) {
    const middleIndex = Math.floor(items.length / 2);
    const middle = providers[middleIndex];
    const consumerSocket = socketOffset(consumerItem.record, true, middle.link.to_slot);
    const providerSocket = socketOffset(middle.item.record, false, middle.link.from_slot);
    middle.item.to[1] = snapIfClose(consumerItem.to[1] + consumerSocket[1] - providerSocket[1]);
    stackAroundIndex(items, middleIndex);
  } else {
    const socketYs = providers.map((provider) => (
      consumerItem.to[1] + socketOffset(consumerItem.record, true, provider.link.to_slot)[1]
    ));
    stackCentered(items, average(socketYs, visibleTop(consumerItem) + consumerItem.visibleHeight / 2));
  }
}

function downstreamClosureIds(startId, currentLayer, layerState) {
  const ids = new Set([startId]);
  const stack = [startId];

  while (stack.length > 0) {
    const id = stack.pop();
    for (const link of layerState.outgoing.get(id) || []) {
      const nextLayer = layerState.layerOf.get(link.to);
      if (!Number.isFinite(nextLayer) || nextLayer < currentLayer || ids.has(link.to)) continue;
      ids.add(link.to);
      stack.push(link.to);
    }
  }

  return ids;
}

function shiftIds(ids, dy, plan) {
  for (const id of ids) {
    const item = plan.get(id);
    if (item) item.to[1] = snap(item.to[1] + dy);
  }
}

function backwardFamilyBounds(family) {
  return unionRects(family.providers.map((provider) => plannedRenderedRect(provider.item)));
}

function resolveBackwardFamilyOverlaps(families, currentLayer, layerState, plan) {
  const ordered = families
    .filter((family) => family.providers.length > 0)
    .map((family) => ({ ...family, bounds: backwardFamilyBounds(family) }))
    .sort((a, b) => a.bounds[1] - b.bounds[1] || visibleTop(a.consumerItem) - visibleTop(b.consumerItem));

  let cursor = null;
  for (const family of ordered) {
    if (cursor !== null && family.bounds[1] < cursor) {
      const dy = cursor - family.bounds[1];
      const ids = downstreamClosureIds(family.consumerItem.record.id, currentLayer, layerState);
      for (const provider of family.providers) ids.add(provider.item.record.id);
      shiftIds(ids, dy, plan);
      family.bounds = backwardFamilyBounds(family);
    }
    cursor = rectBottom(family.bounds) + RULES.siblingGap;
  }
}

function placePreviousLayerFromCurrent(currentLayerRecords, previousLayerRecords, currentLayer, layerState, plan) {
  const familyByConsumer = new Map();
  const loose = [];

  for (const record of previousLayerRecords) {
    const primary = primaryChildForPreviousLayer(record, currentLayer, layerState.outgoing, layerState.layerOf, plan);
    const item = plan.get(record.id);
    if (!primary) {
      loose.push(item);
      continue;
    }

    const consumerId = primary.childItem.record.id;
    if (!familyByConsumer.has(consumerId)) {
      familyByConsumer.set(consumerId, {
        consumerItem: primary.childItem,
        providers: [],
      });
    }
    familyByConsumer.get(consumerId).providers.push({ item, link: primary.link });
  }

  const families = Array.from(familyByConsumer.values())
    .sort((a, b) => visibleTop(a.consumerItem) - visibleTop(b.consumerItem) || a.consumerItem.record.id - b.consumerItem.record.id);

  for (const family of families) {
    layoutInputFamily(family.consumerItem, family.providers);
  }
  resolveBackwardFamilyOverlaps(families, currentLayer, layerState, plan);

  if (loose.length > 0) {
    const currentItems = layerItems(currentLayerRecords, plan);
    const currentBounds = unionRects(currentItems.map(plannedRenderedRect));
    const previousLeft = Math.min(...currentItems.map(visibleLeft)) - RULES.parentChildGap;
    for (const item of loose) {
      item.to[0] = snap(previousLeft - item.renderedWidth + item.leftPad);
    }
    stackCentered(
      loose.sort((a, b) => a.from[1] - b.from[1] || a.record.id - b.record.id),
      currentBounds[1] + currentBounds[3] / 2,
    );
  }
}

function buildClusterPlan(componentRecords, links) {
  const ids = new Set(componentRecords.map((record) => record.id));
  const internalLinks = links.filter((link) => ids.has(link.from) && ids.has(link.to));
  const plan = makePlan(componentRecords);
  const layerState = assignDirectedLayers(componentRecords, internalLinks);
  const numbers = layerNumbers(layerState.layers);

  if (numbers.length === 0) {
    return { layers: [], items: Array.from(plan.values()) };
  }

  placeSourceLayer(layerState.layers.get(numbers[0]), plan);

  for (let index = 1; index < numbers.length; index += 1) {
    const previousLayer = layerState.layers.get(numbers[index - 1]);
    const currentLayer = layerState.layers.get(numbers[index]);
    placeLayer(currentLayer, numbers[index], previousLayer, layerState, plan);
  }

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const currentLayer = layerState.layers.get(numbers[index]);
    const previousLayer = layerState.layers.get(numbers[index - 1]);
    placePreviousLayerFromCurrent(currentLayer, previousLayer, numbers[index], layerState, plan);
  }

  return {
    layers: numbers.map((layer) => ({
      layer,
      nodeIds: layerState.layers.get(layer).map((record) => record.id),
    })),
    items: Array.from(plan.values()),
  };
}

function shiftItems(items, dx, dy) {
  for (const item of items) {
    item.to[0] = snap(item.to[0] + dx);
    item.to[1] = snap(item.to[1] + dy);
  }
}

function clusterBounds(cluster) {
  return unionRects(cluster.items.map(plannedRenderedRect));
}

function columnHeight(entries) {
  return entries.reduce((sum, entry) => sum + entry.bounds[3], 0)
    + RULES.siblingGap * Math.max(0, entries.length - 1);
}

function columnWidth(entries) {
  return Math.max(...entries.map((entry) => entry.bounds[2]));
}

function addToColumn(column, entry) {
  column.entries.push(entry);
  column.height = columnHeight(column.entries);
  column.width = columnWidth(column.entries);
  column.firstIndex = Math.min(column.firstIndex, entry.index);
}

function makeColumn(entry = null) {
  const column = {
    entries: [],
    height: 0,
    width: 0,
    firstIndex: Number.POSITIVE_INFINITY,
  };
  if (entry) addToColumn(column, entry);
  return column;
}

function columnPackFootprint(columns) {
  const usedColumns = columns.filter((column) => column.entries.length > 0);
  if (usedColumns.length === 0) return { width: 0, height: 0, area: 0 };

  const width = usedColumns.reduce((sum, column) => sum + column.width, 0)
    + RULES.clusterGap * Math.max(0, usedColumns.length - 1);
  const height = Math.max(...usedColumns.map((column) => column.height));
  return { width, height, area: width * height };
}

function buildSequentialColumns(entries, columnCount) {
  const columns = Array.from({ length: columnCount }, () => makeColumn());
  const totalHeight = columnHeight(entries);
  const targetHeight = totalHeight / columnCount;
  let columnIndex = 0;

  entries.forEach((entry, index) => {
    const column = columns[columnIndex];
    const projectedHeight = column.entries.length === 0
      ? entry.height
      : column.height + RULES.siblingGap + entry.height;
    const remainingEntries = entries.length - index;
    const remainingColumns = columnCount - columnIndex - 1;
    const shouldStartNextColumn = (
      column.entries.length > 0 &&
      columnIndex < columnCount - 1 &&
      remainingEntries > remainingColumns &&
      projectedHeight > targetHeight
    );

    if (shouldStartNextColumn) columnIndex += 1;
    addToColumn(columns[columnIndex], entry);
  });

  return columns.filter((column) => column.entries.length > 0);
}

function compactnessScore(columns, originalFootprint, maxReadableHeight) {
  const footprint = columnPackFootprint(columns);
  const aspect = footprint.height > 0 ? footprint.width / footprint.height : 1;
  const widePenalty = Math.max(0, aspect - 2.2) * 0.12;
  const tallPenalty = Math.max(0, footprint.height - maxReadableHeight) / Math.max(1, maxReadableHeight);
  const growthPenalty = Math.max(0, footprint.area - originalFootprint.area) / Math.max(1, originalFootprint.area);
  return footprint.area * (1 + widePenalty + tallPenalty * 0.8 + growthPenalty);
}

function chooseCompactColumns(entries, originalFootprint) {
  const maxHeight = Math.max(...entries.map((entry) => entry.height));
  const maxReadableHeight = Math.max(maxHeight, originalFootprint.height * 1.3);
  let best = null;

  for (let count = 1; count <= entries.length; count += 1) {
    const columns = buildSequentialColumns(entries, count);
    const footprint = columnPackFootprint(columns);
    const score = compactnessScore(columns, originalFootprint, maxReadableHeight);

    if (!best || score < best.score) {
      best = { columns, footprint, score };
    }
  }

  return best?.columns || entries.map((entry) => makeColumn(entry));
}

function placePackedColumns(columns, baseX, baseY) {
  let cursorX = baseX;

  for (const column of columns) {
    column.entries.sort((a, b) => a.bounds[1] - b.bounds[1] || a.index - b.index);
    let cursorY = baseY;

    for (const entry of column.entries) {
      shiftItems(entry.cluster.items, cursorX - entry.bounds[0], cursorY - entry.bounds[1]);
      entry.bounds = clusterBounds(entry.cluster);
      cursorY = rectBottom(entry.bounds) + RULES.siblingGap;
    }

    cursorX += columnWidth(column.entries) + RULES.clusterGap;
  }
}

function packClusters(clusterPlans) {
  if (clusterPlans.length <= 1) return;

  const entries = clusterPlans.map((cluster, index) => {
    const bounds = clusterBounds(cluster);
    return {
      cluster,
      index,
      bounds,
      height: bounds[3],
      width: bounds[2],
    };
  });

  const originalBounds = unionRects(entries.map((entry) => entry.bounds));
  const originalFootprint = {
    width: originalBounds[2],
    height: originalBounds[3],
    area: originalBounds[2] * originalBounds[3],
  };
  const baseY = Math.min(...entries.map((entry) => entry.bounds[1]));
  const baseX = Math.min(...entries.map((entry) => entry.bounds[0]));
  const columns = chooseCompactColumns(entries, originalFootprint);

  columns.sort((a, b) => a.firstIndex - b.firstIndex);
  placePackedColumns(columns, baseX, baseY);
}

function outsideRects(graph, scopeNodeIds, activeGroup) {
  const ids = new Set(scopeNodeIds);
  const rects = [];

  for (const node of graph._nodes || []) {
    if (!ids.has(node.id)) rects.push(nodeBounding(node));
  }

  for (const group of graph._groups || graph.groups || []) {
    if (group !== activeGroup) rects.push(groupBounds(group));
  }

  return rects.filter((rect) => rect[2] > 0 && rect[3] > 0);
}

function frameFromItems(items) {
  const content = unionRects(items.map(plannedRenderedRect));
  return [
    snap(content[0] - RULES.frameSidePadding),
    snap(content[1] - RULES.frameTopPadding),
    snap(content[2] + RULES.frameSidePadding * 2),
    snap(content[3] + RULES.frameTopPadding + RULES.frameBottomPadding),
  ];
}

function findNonCollidingPlacement(frame, blockers) {
  if (!blockers.some((blocker) => rectsOverlap(frame, blocker))) return { frame, dx: 0, dy: 0 };

  const original = frame.slice();
  const maxSteps = 100;
  const step = RULES.grid * 10;

  for (let row = 0; row <= maxSteps; row += 1) {
    for (let col = 0; col <= maxSteps; col += 1) {
      const dx = col * step;
      const dy = row * step;
      if (dx === 0 && dy === 0) continue;
      const candidate = [snap(original[0] + dx), snap(original[1] + dy), original[2], original[3]];
      if (!blockers.some((blocker) => rectsOverlap(candidate, blocker))) {
        return { frame: candidate, dx, dy };
      }
    }
  }

  return { frame: original, dx: 0, dy: 0, failed: true };
}

function buildPlan(graph, canvas) {
  const scope = collectScope(graph, canvas);
  if (scope.kind === "empty" || scope.nodes.length === 0) {
    throw new Error("Select nodes or a frame to beautify.");
  }

  const records = scope.nodes.map(nodeRecord);
  const recordIds = new Set(records.map((record) => record.id));
  const links = graphLinks(graph).filter((link) => recordIds.has(link.from) && recordIds.has(link.to));
  const components = connectedComponents(records, links);
  const clusters = components.map((component) => buildClusterPlan(component, links));

  packClusters(clusters);

  const items = clusters.flatMap((cluster) => cluster.items);
  let frame = scope.group ? frameFromItems(items) : null;
  let relocation = null;

  if (frame) {
    const placed = findNonCollidingPlacement(frame, outsideRects(graph, records.map((record) => record.id), scope.group));
    relocation = placed;
    frame = placed.frame;
    if (placed.dx || placed.dy) shiftItems(items, placed.dx, placed.dy);
  }

  return {
    scope,
    records,
    links,
    clusters,
    items,
    frame,
    relocation,
  };
}

function setArray(array, values) {
  if (!array) return;
  array[0] = values[0];
  array[1] = values[1];
  if (array.length > 2 && values.length > 2) {
    array[2] = values[2];
    array[3] = values[3];
  }
}

function applyGroupBounds(group, bounds) {
  if (!group || !bounds) return;

  setArray(group.pos, [bounds[0], bounds[1]]);
  setArray(group.size, [bounds[2], bounds[3]]);
  setArray(group._pos, [bounds[0], bounds[1]]);
  setArray(group._size, [bounds[2], bounds[3]]);
  setArray(group.bounding, bounds);
  setArray(group._bounding, bounds);
  group.recomputeInsideNodes?.();
}

function workflowTitle() {
  return document.title || location.hash || "Untitled ComfyUI Workflow";
}

function createHistoryRecord(plan) {
  const graph = app.graph;
  return {
    timestamp: new Date().toISOString(),
    workflowTitle: workflowTitle(),
    rules: RULES,
    scope: {
      kind: plan.scope.kind,
      groupTitle: plan.scope.group?.title || null,
      nodeIds: plan.records.map((record) => record.id),
    },
    groupBefore: plan.scope.group ? groupBounds(plan.scope.group) : null,
    groupAfter: plan.frame,
    nodes: Object.fromEntries(plan.items.map((item) => [
      String(item.record.id),
      {
        title: item.title,
        type: item.type,
        from: item.from,
        to: item.to,
      },
    ])),
    graphNodeCount: graph?._nodes?.length ?? null,
  };
}

async function appendHistory(record) {
  try {
    const response = await fetch("/canvas_beautifier/history/append", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return await response.json();
  } catch (error) {
    console.warn("[Canvas Beautifier] Failed to write history", error);
    return { ok: false, error: String(error) };
  }
}

async function latestHistory() {
  const query = new URLSearchParams({ workflowTitle: workflowTitle() });
  const response = await fetch(`/canvas_beautifier/history/latest?${query}`);
  const result = await response.json();
  return result.record;
}

async function historyList(limit = 50) {
  try {
    const query = new URLSearchParams({ workflowTitle: workflowTitle(), limit: String(limit) });
    const response = await fetch(`/canvas_beautifier/history/list?${query}`);
    if (!response.ok) throw new Error(`History list route returned ${response.status}`);
    const result = await response.json();
    return Array.isArray(result.records) ? result.records : [];
  } catch {
    const latest = await latestHistory();
    return latest ? [latest] : [];
  }
}

function applyPlan(plan) {
  const graph = app.graph;
  const canvas = app.canvas;

  canvas.emitBeforeChange?.();
  graph.beforeChange?.();

  for (const item of plan.items) {
    item.record.node.setPos?.(item.to[0], item.to[1]);
    if (!item.record.node.setPos) {
      item.record.node.pos[0] = item.to[0];
      item.record.node.pos[1] = item.to[1];
    }
  }

  if (plan.scope.group && plan.frame) applyGroupBounds(plan.scope.group, plan.frame);

  graph.afterChange?.();
  canvas.emitAfterChange?.();
  graph.change?.();
  canvas.setDirty?.(true, true);
  canvas.draw?.(true, true);
}

async function beautifySelection() {
  try {
    const plan = buildPlan(app.graph, app.canvas);
    const record = createHistoryRecord(plan);
    await appendHistory(record);
    applyPlan(plan);

    const detail = plan.scope.group
      ? `Arranged ${plan.items.length} nodes inside "${plan.scope.group.title}".`
      : `Arranged ${plan.items.length} selected nodes.`;
    toast("info", "Beautify applied", detail);
  } catch (error) {
    toast("warn", "Beautify skipped", error.message || String(error));
  }
}

function restoreGroupBounds(groupTitle, bounds) {
  if (!groupTitle || !bounds) return;
  const group = (app.graph._groups || app.graph.groups || []).find((candidate) => candidate.title === groupTitle);
  if (group) applyGroupBounds(group, bounds);
}

function restoreRecord(record, mode = "before") {
  const graph = app.graph;
  const canvas = app.canvas;
  const nodeKey = mode === "after" ? "to" : "from";
  const groupBoundsToRestore = mode === "after" ? record.groupAfter : record.groupBefore;

  canvas.emitBeforeChange?.();
  graph.beforeChange?.();

  for (const [id, nodeRecordEntry] of Object.entries(record.nodes || {})) {
    const node = getNodeById(graph, id);
    const position = nodeRecordEntry[nodeKey];
    if (!node || !Array.isArray(position)) continue;
    node.setPos?.(position[0], position[1]);
    if (!node.setPos) {
      node.pos[0] = position[0];
      node.pos[1] = position[1];
    }
  }

  restoreGroupBounds(record.scope?.groupTitle, groupBoundsToRestore);

  graph.afterChange?.();
  canvas.emitAfterChange?.();
  graph.change?.();
  canvas.setDirty?.(true, true);
  canvas.draw?.(true, true);
}

async function restoreLastBeautify() {
  try {
    const record = await latestHistory();
    if (!record) {
      toast("warn", "Nothing to restore", "No beautify history exists for this workflow.");
      return;
    }

    restoreRecord(record, "before");
    toast("info", "Beautify restored", "Restored the latest recorded layout.");
  } catch (error) {
    toast("error", "Restore failed", error.message || String(error));
  }
}

function recordLabel(record, index) {
  const timestamp = record.timestamp || record.serverTimestamp || "";
  const date = timestamp ? new Date(timestamp) : null;
  const when = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : timestamp || `Entry ${index + 1}`;
  const count = Object.keys(record.nodes || {}).length;
  const scope = record.scope?.groupTitle || record.scope?.kind || "selection";
  return `${when} - ${scope} - ${count} nodes`;
}

function closeHistoryPanel() {
  document.getElementById("canvas-beautifier-history")?.remove();
}

async function showHistoryPanel() {
  try {
    closeHistoryPanel();
    const records = await historyList(50);
    const panel = document.createElement("div");
    panel.id = "canvas-beautifier-history";
    panel.innerHTML = `
      <div class="cb-history-card">
        <div class="cb-history-header">
          <strong>Beautify History</strong>
          <button type="button" class="cb-history-close" title="Close">x</button>
        </div>
        <div class="cb-history-list"></div>
      </div>
    `;

    const list = panel.querySelector(".cb-history-list");
    if (records.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cb-history-empty";
      empty.textContent = "No beautify history for this workflow yet.";
      list.appendChild(empty);
    }

    records.forEach((record, index) => {
      const row = document.createElement("div");
      row.className = "cb-history-row";

      const label = document.createElement("span");
      label.textContent = recordLabel(record, index);

      const restoreBefore = document.createElement("button");
      restoreBefore.type = "button";
      restoreBefore.textContent = "Before";
      restoreBefore.title = "Restore coordinates before this Beautify run";
      restoreBefore.addEventListener("click", () => {
        restoreRecord(record, "before");
        toast("info", "History restored", "Restored the selected pre-beautify layout.");
      });

      const restoreAfter = document.createElement("button");
      restoreAfter.type = "button";
      restoreAfter.textContent = "After";
      restoreAfter.title = "Restore coordinates after this Beautify run";
      restoreAfter.addEventListener("click", () => {
        restoreRecord(record, "after");
        toast("info", "History restored", "Restored the selected beautified layout.");
      });

      row.append(label, restoreBefore, restoreAfter);
      list.appendChild(row);
    });

    panel.querySelector(".cb-history-close").addEventListener("click", closeHistoryPanel);
    panel.addEventListener("click", (event) => {
      if (event.target === panel) closeHistoryPanel();
    });

    document.body.appendChild(panel);
  } catch (error) {
    toast("error", "History failed", error.message || String(error));
  }
}

function installStyles() {
  if (document.getElementById("canvas-beautifier-styles")) return;

  const style = document.createElement("style");
  style.id = "canvas-beautifier-styles";
  style.textContent = `
    #canvas-beautifier-history {
      align-items: center;
      background: rgba(0, 0, 0, 0.46);
      bottom: 0;
      display: flex;
      justify-content: center;
      left: 0;
      position: fixed;
      right: 0;
      top: 0;
      z-index: 20000;
    }

    #canvas-beautifier-history .cb-history-card {
      background: #1f1f24;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 8px;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.45);
      color: #f5f5f5;
      font: 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      max-height: min(620px, 82vh);
      overflow: hidden;
      width: min(760px, 88vw);
    }

    #canvas-beautifier-history .cb-history-header {
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      padding: 12px 14px;
    }

    #canvas-beautifier-history .cb-history-close,
    #canvas-beautifier-history .cb-history-row button {
      background: #34343a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #f5f5f5;
      cursor: pointer;
      font: 600 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      height: 28px;
      padding: 0 10px;
    }

    #canvas-beautifier-history .cb-history-row button:hover,
    #canvas-beautifier-history .cb-history-close:hover {
      background: #3a8bff;
      border-color: #3a8bff;
    }

    #canvas-beautifier-history .cb-history-list {
      max-height: calc(min(620px, 82vh) - 54px);
      overflow: auto;
      padding: 8px;
    }

    #canvas-beautifier-history .cb-history-empty,
    #canvas-beautifier-history .cb-history-row {
      align-items: center;
      border-radius: 6px;
      display: flex;
      gap: 8px;
      min-height: 36px;
      padding: 7px 8px;
    }

    #canvas-beautifier-history .cb-history-row:nth-child(odd) {
      background: rgba(255, 255, 255, 0.035);
    }

    #canvas-beautifier-history .cb-history-row span {
      color: rgba(255, 255, 255, 0.86);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

function addCanvasMenuOption(options) {
  if (options.__canvasBeautifierAdded) return;
  options.__canvasBeautifierAdded = true;
  options.push(null);
  options.push({
    content: "Beautify Selection",
    callback: () => void beautifySelection(),
  });
  options.push({
    content: "Restore Last Beautify",
    callback: () => void restoreLastBeautify(),
  });
  options.push({
    content: "Beautify History",
    callback: () => void showHistoryPanel(),
  });
}

app.registerExtension({
  name: EXTENSION_NAME,

  setup() {
    installStyles();
    if (typeof LGraphCanvas !== "undefined" && !LGraphCanvas.prototype.__canvasBeautifierMenuPatched) {
      const getCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
      LGraphCanvas.prototype.getCanvasMenuOptions = function (...args) {
        const options = getCanvasMenuOptions.apply(this, args);
        addCanvasMenuOption(options);
        return options;
      };
      LGraphCanvas.prototype.__canvasBeautifierMenuPatched = true;
    }
  },

  commands: [
    {
      id: COMMANDS.BEAUTIFY,
      label: "Beautify Selection",
      tooltip: "Beautify selected nodes or frame",
      icon: "pi pi-sitemap",
      function: beautifySelection,
    },
    {
      id: COMMANDS.RESTORE_LAST,
      label: "Restore Last Beautify",
      icon: "pi pi-undo",
      function: restoreLastBeautify,
    },
    {
      id: COMMANDS.HISTORY,
      label: "Beautify History",
      icon: "pi pi-history",
      function: showHistoryPanel,
    },
  ],

  keybindings: [
    {
      commandId: COMMANDS.BEAUTIFY,
      combo: { key: "b", ctrl: true, shift: true },
      targetElementId: "graph-canvas",
    },
  ],

  getSelectionToolboxCommands: () => [COMMANDS.BEAUTIFY],
});

window.ComfyCanvasBeautifier = {
  beautifySelection,
  restoreLastBeautify,
  showHistoryPanel,
  buildPlan: () => buildPlan(app.graph, app.canvas),
  RULES,
};
