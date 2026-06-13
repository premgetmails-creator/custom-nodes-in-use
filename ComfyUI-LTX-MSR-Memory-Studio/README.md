# ComfyUI LTX MSR Memory Studio

Standalone role-aware Multiple Subject Reference nodes for LTX 2.3.

The package combines the complete MSR reference subsystem into convenient
nodes:

- names references so prompts can use `@mentions`;
- requires and automatically moves one background to the final MSR slot;
- constructs the aligned `8*N+1` pseudo-video representation;
- loads the trained MSR IC-LoRA directly;
- reads `reference_downscale_factor` from LoRA metadata;
- VAE-encodes and appends frozen LTX guide tokens;
- preserves full spatial token grids;
- supports tiled encoding and small-grid dilation;
- applies per-reference strengths and source masks;
- optionally routes references to target regions;
- preserves existing ordinary LTX guides and conditioning metadata;
- supports a corrected individual-guide hybrid;
- removes exactly its own frames and metadata after sampling.

It does not require `ComfyUI-Licon-MSR`, `ComfyUI-LTXVideo`, or KJNodes at
runtime. It uses current ComfyUI core LTX interfaces. The trained MSR LoRA is
still required for learned multiple-subject interpretation.

## Pipeline coverage

| Original pipeline behavior | Memory Studio implementation |
| --- | --- |
| Numbered references plus required background | Named reference batch with exactly one background |
| `1 -> 2 -> 3 -> 4 -> background` ordering | Stable source order with the background moved last |
| 17/25/33/41 reference frames | Automatically calculates `8*N+1` |
| Lanczos resize and fixed output size | Latent-derived target size, crop mode, and interpolation control |
| `LTXICLoRALoaderModelOnly` | Integrated LoRA loading and strength |
| LoRA `reference_downscale_factor` metadata | Read automatically, with optional manual override |
| `LTXAddVideoICLoRAGuide` | Integrated VAE encode, keyframe coordinates, latent append, and noise mask |
| Center crop, tiled encode, tile size, overlap | Exposed directly |
| IC guide strength | Common or per-reference guide strengths |
| `LTXVAddGuideMulti` still-image branch | Corrected `individual_aligned` mode |
| Positive and negative conditioning updates | Both updated independently |
| `LTXVConditioning` frame rate | Integrated |
| Guide attention metadata | One labeled entry per reference |
| Source masks | One shared mask or one per reference |
| Target-region routing | Global or target-masked self-attention |
| Reference-video inspection | `reference_clip` IMAGE output |
| `LTXVCropGuides` cleanup | Scoped cleanup handle that preserves older guides |
| Prompt reference descriptions | Role-aware `@mention` compiler |
| Prompt Relay, NAG, CFG, sigmas, AV, sampler | Remain fully composable through the Advanced outputs |

## Nodes

### LTXV MSR Visual Memory Studio

The convenient all-in-one interface.

Supply:

- LTX model, text encoder, VAE, and video-only latent;
- a batch of 2 to 5 images;
- labels such as `maya, sword, palace`;
- roles such as `character, prop, background`;
- optional one-line descriptions;
- a prompt such as `@maya raises @sword inside @palace`;
- the MSR LoRA.

The node compiles the mentions, encodes positive and negative prompts, applies
LTX frame-rate conditioning, patches the model with the LoRA, builds reference
memory, and returns everything needed by the downstream sampler.

### LTX MSR Reference Bank

Builds a reusable typed reference bank. Use this when prompt construction,
Prompt Relay, NAG, or another conditioning system should remain separate.

If labels and roles are blank, labels are generated automatically and the last
image becomes the background. To use `@mentions`, provide your own memorable
labels.

### LTX MSR Compile @Mentions

Compiles labels into explicit text bindings that the LTX text encoder can
understand. Labels are organizational handles, not learned visual tokens.

For example:

```text
Labels: maya, car, garden
Roles: character, prop, background

Prompt:
@maya walks toward @car inside @garden
```

The compiler adds a reference-slot legend, expands every known mention, and
optionally adds anti-swap preservation rules.

### LTXV MSR Visual Memory Advanced

Accepts existing positive and negative conditioning rather than a text encoder.
Use it with:

- Prompt Relay or scheduled prompts;
- NAG or another model patch;
- custom text-encoding pipelines;
- pre-existing ordinary LTX guides;
- multi-stage refinement workflows.

### LTXV Crop MSR Visual Memory

Uses the returned `LTX_MSR_MEMORY_INFO` handle to remove exactly this node's
latent frames, coordinates, attention entries, placeholders, and markers.
Existing guides are preserved.

## Reference packing

MSR supports 2 to 5 total references, including one background:

| References | Pixel frames | Latent frames |
| ---: | ---: | ---: |
| 2 | 17 | 3 |
| 3 | 25 | 4 |
| 4 | 33 | 5 |
| 5 | 41 | 6 |

The first reference receives 9 pixel frames and two causal latent frames. Every
later reference receives 8 pixel frames and one latent frame. The background is
always last.

Frame counts are calculated automatically. This prevents the cross-reference
temporal blending caused by using 41 frames for fewer than five references.

## Memory modes

`msr_clip`

Uses the clean trained MSR pipeline. The aligned pseudo-video is encoded as one
causal video latent. This is the default and recommended baseline.

`individual_aligned`

Independently encodes each still image, then creates the same `N+1` latent-frame
layout expected by MSR by duplicating the first reference. This preserves the
stronger individual-image starting point sought by the tutorial's MultiGuide
hybrid without mixing six conditioning frames with only five latent frames.

## Masks and strengths

`guide_strength`

Controls the denoising mask of every appended guide partition. `1.0` freezes
it exactly, matching the demonstrated MSR workflow.

`guide_strengths`

Optionally assigns one latent anchoring strength per reference. The first
reference's value is applied to both of its causal latent frames. This retains
the per-image guide-strength control of the MultiGuide branch.

`attention_strength` / `attention_strengths`

Controls how strongly generated tokens and each reference communicate through
LTX self-attention.

`reference_masks`

One source mask for all references or one per reference. It restricts readable
regions inside each reference.

`target_masks`

One target mask for all references or one per reference. With
`routing_mode=target_masked`, it controls where generated queries may read each
reference. Static masks are broadcast across the generated timeline.

## Workflow placement

```text
video latent
  -> LTXV MSR Visual Memory Studio or Advanced
  -> optional LTXVConcatAVLatent
  -> optional NAG/model guidance
  -> sampler
  -> optional LTXVSeparateAVLatent
  -> LTXV Crop MSR Visual Memory
  -> optional LTXVCropGuides for older ordinary guides
  -> VAE decode
```

The Studio/Advanced node must receive a video-only 128-channel latent. In AV
workflows, inject before `LTXVConcatAVLatent` and clean after
`LTXVSeparateAVLatent`.

Prompt Relay belongs before the Advanced node. NAG, CFG, sampler choice, manual
sigmas, audio concatenation, and decoding remain ordinary typed ComfyUI stages;
the node outputs are designed to connect to them directly. They are not hidden
inside the memory node, so existing workflows retain their full controls.

For two-stage generation, use one injection and cleanup pair per sampler stage.
Re-encode the original references at the second stage's latent resolution.

## LoRA installation

Place the MSR LoRA under ComfyUI's `models/loras` directory and select it in the
node. The current LiconStudio V1 file is:

```text
LTX-2.3-Licon-MSR-V1.safetensors
```

Selecting `none` leaves the input model unchanged. This supports externally
patched models and ablation tests, but the base LTX model alone has not learned
the demonstrated MSR subject-slot behavior.

## Installation

Place or link this directory into:

```text
ComfyUI/custom_nodes/ComfyUI-LTX-MSR-Memory-Studio
```

Restart ComfyUI afterward. No additional Python packages are required beyond
the current ComfyUI runtime.

## Important limitations

- `@mentions` compile prompt bindings; they do not create a new semantic
  language inside LTX.
- The trained LoRA performs the learned reference interpretation.
- The model can still swap attributes, duplicate character-sheet views, or
  lose tiny details.
- VAE compression limits exact motif reproduction.
- Target masks control attention access, not pose or geometry.
- More references increase complexity; two characters plus one background is
  the recommended starting point.
