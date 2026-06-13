# ComfyUI Canvas Beautifier

Layout-only ComfyUI extension for cleaning selected node clusters or selected frames.

## Use

1. Install this folder under `ComfyUI/custom_nodes/ComfyUI-Canvas-Beautifier`.
2. Restart ComfyUI.
3. Select a group/frame or select nodes.
4. Press the compact **Beautify** icon from the selection toolbar, the command palette, or the canvas menu.

## Rules

- `120` units parent-child horizontal gap.
- `50` units visible vertical gap between sibling children.
- `10` unit grid snapping.
- Connected components are arranged as generalized left-to-right layers, not around one forced central parent.
- Each new layer is first placed left-to-right, then the final alignment pass runs backward from the rightmost layer to the first layer.
- During the backward pass, each previous layer is realigned around the consumer nodes in the layer to its right.
- For each right-layer consumer family, previous-layer providers are identified first, counted, then arranged.
- Odd child count aligns the center child socket exactly with the parent socket before sibling nodes are fanned out.
- Even child count centers the full stack around the parent-side sockets without choosing a fake center child.
- Multiple clusters are packed left-to-right with `120` units between them.
- Finished clusters are geometrically compacted into balanced columns to remove large unused empty space while keeping `120` horizontal and `50` vertical readable gaps.
- Frame padding is top `80`, left/right/bottom `50`.
- The selection toolbar Beautify icon includes a hover tooltip.

The extension changes only node positions and group bounds. It does not change links, widgets, prompts, seeds, models, node types, or queue behavior.

## History

Before every apply, the extension appends a JSONL record to:

```text
history/beautify_history.jsonl
```

Use **Restore Last Beautify** to restore the latest recorded layout for the current workflow title.
