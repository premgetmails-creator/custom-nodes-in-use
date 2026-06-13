# AI Layout Policy

This project should treat ComfyUI workflows as visual documents, not only as
executable graphs.

Whenever the AI adds, removes, reconnects, or rebuilds nodes, it must preserve
human readability on the canvas.

## Core Principle

The long-term design goal is a recursive, hierarchy-aware graph beautifier:

```text
node -> micro-cluster -> molecule -> component -> full workflow
```

The layout engine should eventually traverse the directed graph, detect local
neighborhoods and functional clusters, compute bounding boxes, then arrange
nodes and groups so splines are clean, branches are symmetric, and the full
workflow reads as a deliberate composition.

## Lean Policy For Codex Now

Until the full auto-composer exists, Codex must use a predictable manual layout
grid whenever it creates or moves nodes.

Default flow:

```text
Inputs / Models -> Preprocess -> Conditioning -> Sampling -> Decode -> Upscale -> Output
```

Important:

```text
The default layout must remain one-directional: left to right.
Do not create a semantic above/below workflow unless the user asks for it.
Vertical position should be used only to place nodes on readable horizontal
lines, not to create a second reading direction.
```

Recommended columns:

```text
x =   0  input media, prompt text helpers, reference assets
x = 320  loaders, model stack, VAE, CLIP, LoRA, ControlNet loaders
x = 660  preprocessors, encoders, masks, conditioning builders
x = 1020 samplers and main generation/video nodes
x = 1380 decode, post-process, upscale, interpolation
x = 1740 preview/save/export nodes
```

Recommended horizontal lines:

```text
y =   0 primary workflow line
y = 220 secondary continuation line when a component is too wide
y = 440 tertiary continuation line for large workflows
y = 700 notes, diagnostics, attempt log, model provenance
```

Spacing rules:

```text
1. Keep upstream nodes to the left of downstream nodes.
2. Keep related nodes on the same horizontal line whenever practical.
3. Use multiple horizontal lines only when needed to avoid overlap or extreme width.
4. Keep line transitions sparse and obvious.
5. Put output/save nodes on the far right.
6. Keep note nodes below the working graph, not between data-flow splines.
7. Avoid tall above/below branching structures that make the workflow hard to scan.
8. Leave at least 80 px horizontal and 60 px vertical padding between node boxes.
9. When adding a troubleshooting node, place it near the affected component,
   but do not overlap the existing readable structure.
10. Prefer small local edits over global rearrangement unless the user asks for
    a beautify pass.
```

## Symmetry Rules

Symmetry means clean left-to-right alignment, consistent spacing, and parallel
horizontal lines. It does not mean putting important branches above and below
the main flow by default.

Example:

```text
line 1: input -> encode -> condition -> sampler -> decode -> save
line 2: ref   -> prep   -> control   -> apply  ---/
```

For video workflows, keep temporal/video-specific nodes in the same left-to-right
reading direction. Use a second or third horizontal line only when the workflow
would otherwise become too wide or splines would become unreadable.

## Modular Set/Get Blocks

When a workflow already uses modular set/get style nodes, or when that pattern
would make the canvas easier to traverse, the AI may prefer it over long splines
that run from the far-left side of the graph to the far-right side.

Policy:

```text
1. Use set/get blocks only when they improve readability or preserve the user's
   existing workflow style.
2. Keep each set/get pair clearly named so a human can understand what value is
   being passed.
3. Place the setter near the producing component.
4. Place the getter near the consuming component.
5. Log the virtual connection in the attempt log because it may not be visible
   as a normal spline.
6. Do not replace clear local splines with set/get blocks unnecessarily.
```

This keeps workflows modular without forcing visible splines to cross the entire
canvas.

## Future Auto-Composer

The future implementation should:

```text
1. Read all nodes and links.
2. Build a directed graph.
3. Detect root/input nodes and terminal/output nodes.
4. Assign each node a workflow depth/rank.
5. Detect node roles by class, title, sockets, and link context.
6. Group tightly connected nodes into micro-clusters.
7. Group micro-clusters into molecules/components.
8. Compute padded bounding boxes for every group.
9. Arrange each group recursively.
10. Minimize spline crossings and diagonal chaos.
11. Prefer clean one-directional reading over vertical semantic branching.
12. Move nodes only after snapshotting the graph.
```

Until that exists, AI-created nodes should still follow the lean grid above.
