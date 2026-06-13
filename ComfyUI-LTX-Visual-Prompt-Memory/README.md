# ComfyUI LTX Visual Prompt Memory

Standalone ComfyUI nodes that encode an IMAGE batch as frozen LTX video-latent
memory. The references are assigned negative temporal positions, participate in
LTX self-attention, and are removed from the sampled latent before decoding.

No adapter weights, training, or dependency on `ComfyUI-LTXVideo` is required.
The implementation uses the LTX interfaces supplied by ComfyUI core.

## Nodes

### LTXV Global Visual Prompt Memory

- Accepts one IMAGE batch containing any practical number of references.
- Encodes every image independently with the supplied LTX VAE.
- Freezes the resulting latent frames with a zero noise mask.
- Supports global attention and optional target-mask routing.
- Accepts one mask/strength for all references or one per reference.
- Returns a cleanup handle and a readable report.

`reference_masks` control which source-reference regions are readable.
`target_masks` control where generated video tokens may read each reference in
`target_masked` mode. Labels are for workflow organization and reporting only.

### LTXV Crop Global Visual Prompt Memory

Removes only the latent frames and conditioning metadata created by the matching
memory node. Existing ordinary LTX guides are preserved.

## Workflow placement

```text
video latent
  -> LTXV Global Visual Prompt Memory
  -> optional LTXVConcatAVLatent
  -> sampler
  -> optional LTXVSeparateAVLatent
  -> LTXV Crop Global Visual Prompt Memory
  -> optional LTXVCropGuides
  -> VAE decode
```

The memory node requires a video-only 128-channel LTX latent. In an audio-video
workflow it must run before concatenation, and cleanup must run after separation.

For a two-stage interpolation/refinement workflow, use one memory node in each
stage. Crop the stage-one memory before upscaling, then encode the original
reference IMAGE batch again against the stage-two latent resolution. Do not
reuse the low-resolution reference latents in the refinement stage.

Use one visual-memory node per sampler stage. Put all references in its IMAGE
batch so cleanup and target routing share one unambiguous memory layout.

## Installation

Link or copy this directory into the ComfyUI `custom_nodes` directory, then
restart ComfyUI:

```text
ComfyUI-LTX-Visual-Prompt-Memory/
```

No additional Python requirements are introduced beyond the current ComfyUI
runtime.

## Practical limits

`max_memory_tokens` is a deliberate VRAM guard, not a fixed reference-count
limit. Target-mask routing creates an additive self-attention mask and therefore
costs more memory than global routing. VAE compression and soft attention mean
that exact reproduction of very small motifs is not guaranteed.
