from __future__ import annotations

import re
import uuid
from typing import Any, Optional

import torch

import comfy.utils
import comfy_extras.nodes_lt as nodes_lt
import node_helpers

if __package__:
    from .attention import TargetRoutingAttentionOverride
else:
    from attention import TargetRoutingAttentionOverride


MEMORY_INFO_TYPE = "LTX_VISUAL_MEMORY_INFO"
MEMORY_RECORDS_KEY = "ltx_visual_memory_records"
PACKAGE_VERSION = 1


def _conditioning_value(conditioning, key: str, default=None):
    for item in conditioning:
        if key in item[1]:
            return item[1][key]
    return default


def _parse_float_list(raw: str, count: int, default: float) -> list[float]:
    values = [
        float(value) for value in re.split(r"[,;\n]+", raw or "") if value.strip()
    ]
    if not values:
        values = [float(default)]
    if len(values) == 1:
        values *= count
    if len(values) != count:
        raise ValueError(
            f"attention_strengths must contain either 1 value or {count} values; "
            f"received {len(values)}."
        )
    if any(value < 0.0 or value > 1.0 for value in values):
        raise ValueError("Attention strengths must be between 0.0 and 1.0.")
    return values


def _parse_labels(raw: str, count: int) -> list[str]:
    labels = [
        label.strip() for label in re.split(r"[,;\n]+", raw or "") if label.strip()
    ]
    if not labels:
        return [f"reference_{index + 1}" for index in range(count)]
    if len(labels) == 1 and count > 1:
        base = labels[0]
        return [f"{base}_{index + 1}" for index in range(count)]
    if len(labels) != count:
        raise ValueError(
            f"reference_labels must contain either 0, 1, or {count} labels; "
            f"received {len(labels)}."
        )
    return labels


def _normalize_mask_batch(
    masks: Optional[torch.Tensor],
    count: int,
    name: str,
) -> Optional[list[torch.Tensor]]:
    if masks is None:
        return None
    if not isinstance(masks, torch.Tensor):
        raise TypeError(f"{name} must be a ComfyUI MASK tensor.")
    if masks.ndim == 2:
        masks = masks.unsqueeze(0)
    elif masks.ndim == 4 and masks.shape[1] == 1:
        masks = masks[:, 0]
    if masks.ndim != 3:
        raise ValueError(
            f"{name} must have shape (H,W), (N,H,W), or (N,1,H,W); "
            f"received {tuple(masks.shape)}."
        )
    if masks.shape[0] == 1:
        return [masks[0]] * count
    if masks.shape[0] != count:
        raise ValueError(
            f"{name} must contain 1 mask or {count} masks; received {masks.shape[0]}."
        )
    return [masks[index] for index in range(count)]


def _source_mask(mask: Optional[torch.Tensor]) -> Optional[torch.Tensor]:
    if mask is None:
        return None
    return mask.detach().to(dtype=torch.float32).clamp(0.0, 1.0)[None, None, None]


def _existing_keyframe_state(conditioning) -> tuple[Optional[torch.Tensor], int, int]:
    keyframes = _conditioning_value(conditioning, "keyframe_idxs")
    if keyframes is None:
        return None, 0, 0
    if not isinstance(keyframes, torch.Tensor) or keyframes.ndim != 4:
        raise ValueError("Existing keyframe_idxs metadata has an unsupported shape.")
    token_count = int(keyframes.shape[2])
    temporal_positions = int(torch.unique(keyframes[:, 0, :, 0]).numel())
    return keyframes, token_count, temporal_positions


def _append_attention_entries(
    conditioning,
    memory_id: str,
    labels: list[str],
    strengths: list[float],
    masks: Optional[list[torch.Tensor]],
    latent_shapes: list[list[int]],
    existing_keyframe_tokens: int,
):
    existing = _conditioning_value(conditioning, "guide_attention_entries")
    entries_were_none = existing is None
    entries = list(existing or [])
    tracked_count = sum(int(entry["pre_filter_count"]) for entry in entries)
    if tracked_count > existing_keyframe_tokens:
        raise ValueError(
            "Existing guide_attention_entries describe more tokens than keyframe_idxs."
        )

    placeholder_index = None
    if tracked_count < existing_keyframe_tokens:
        placeholder_index = len(entries)
        entries.append(
            {
                "pre_filter_count": existing_keyframe_tokens - tracked_count,
                "strength": 1.0,
                "pixel_mask": None,
                "latent_shape": None,
                "visual_memory_placeholder_for": memory_id,
            }
        )

    memory_entry_start = len(entries)
    for index, (label, strength, latent_shape) in enumerate(
        zip(labels, strengths, latent_shapes)
    ):
        entries.append(
            {
                "pre_filter_count": int(
                    latent_shape[0] * latent_shape[1] * latent_shape[2]
                ),
                "strength": float(strength),
                "pixel_mask": _source_mask(None if masks is None else masks[index]),
                "latent_shape": list(latent_shape),
                "visual_memory_id": memory_id,
                "visual_memory_label": label,
            }
        )

    return node_helpers.conditioning_set_values(
        conditioning,
        {"guide_attention_entries": entries},
    ), {
        "entries_were_none": entries_were_none,
        "placeholder_index": placeholder_index,
        "memory_entry_start": memory_entry_start,
        "memory_entry_count": len(latent_shapes),
    }


def _append_record(conditioning, record: dict[str, Any]):
    records = list(_conditioning_value(conditioning, MEMORY_RECORDS_KEY, []) or [])
    records.append(record)
    return node_helpers.conditioning_set_values(
        conditioning,
        {MEMORY_RECORDS_KEY: records},
    )


def _encode_reference(
    vae,
    image: torch.Tensor,
    latent_samples: torch.Tensor,
    target_width: int,
    target_height: int,
    interpolation: str,
    resize_mode: str,
) -> torch.Tensor:
    crop = "center" if resize_mode == "center_crop" else "disabled"
    resized = comfy.utils.common_upscale(
        image.movedim(-1, 1),
        target_width,
        target_height,
        interpolation,
        crop=crop,
    ).movedim(1, -1)
    encoded = vae.encode(resized[..., :3].clamp(0.0, 1.0))
    if not isinstance(encoded, torch.Tensor) or encoded.ndim != 5:
        raise ValueError("The supplied VAE did not return a 5D LTX video latent.")
    if encoded.shape[2] != 1:
        raise ValueError(
            "Each reference image must encode to exactly one latent frame. "
            f"Received {encoded.shape[2]} latent frames."
        )
    if encoded.shape[1] != latent_samples.shape[1]:
        raise ValueError(
            "Reference VAE channels do not match the input video latent: "
            f"{encoded.shape[1]} vs {latent_samples.shape[1]}."
        )
    if encoded.shape[3:] != latent_samples.shape[3:]:
        raise ValueError(
            "Reference VAE spatial shape does not match the input video latent: "
            f"{tuple(encoded.shape[3:])} vs {tuple(latent_samples.shape[3:])}."
        )
    if encoded.shape[0] == 1 and latent_samples.shape[0] > 1:
        encoded = encoded.expand(latent_samples.shape[0], -1, -1, -1, -1)
    elif encoded.shape[0] != latent_samples.shape[0]:
        raise ValueError(
            "Reference latent batch cannot be broadcast to the video latent batch."
        )
    return encoded.to(device=latent_samples.device, dtype=latent_samples.dtype)


def _remove_tensor_slice(tensor: torch.Tensor, dim: int, start: int, count: int):
    end = start + count
    before = tensor.narrow(dim, 0, start)
    after = tensor.narrow(dim, end, tensor.shape[dim] - end)
    return torch.cat([before, after], dim=dim)


def _cleanup_conditioning(conditioning, memory_id: str):
    cleaned = []
    found = False

    for value, metadata in conditioning:
        updated = metadata.copy()
        records = list(updated.get(MEMORY_RECORDS_KEY, []) or [])
        record_index = next(
            (
                index
                for index, item in enumerate(records)
                if item.get("id") == memory_id
            ),
            None,
        )
        if record_index is None:
            cleaned.append([value, updated])
            continue

        found = True
        record = records.pop(record_index)
        token_start = int(record["keyframe_token_start"])
        token_count = int(record["keyframe_token_count"])
        keyframes = updated.get("keyframe_idxs")
        if not isinstance(keyframes, torch.Tensor):
            raise ValueError(
                "Visual-memory keyframe metadata is missing during cleanup."
            )
        if token_start + token_count > keyframes.shape[2]:
            raise ValueError(
                "Visual-memory keyframe metadata no longer matches the workflow."
            )
        keyframes = _remove_tensor_slice(keyframes, 2, token_start, token_count)
        updated["keyframe_idxs"] = None if keyframes.shape[2] == 0 else keyframes

        entries = list(updated.get("guide_attention_entries", []) or [])
        entry_start = int(record["memory_entry_start"])
        entry_count = int(record["memory_entry_count"])
        if entry_start + entry_count > len(entries):
            raise ValueError(
                "Visual-memory attention metadata no longer matches the workflow."
            )
        del entries[entry_start : entry_start + entry_count]

        placeholder_index = record.get("placeholder_index")
        if placeholder_index is not None:
            placeholder_index = int(placeholder_index)
            if (
                placeholder_index >= len(entries)
                or entries[placeholder_index].get("visual_memory_placeholder_for")
                != memory_id
            ):
                raise ValueError(
                    "Visual-memory compatibility placeholder was modified."
                )
            del entries[placeholder_index]

        if entries:
            updated["guide_attention_entries"] = entries
        elif record.get("entries_were_none", False):
            updated["guide_attention_entries"] = None
        else:
            updated["guide_attention_entries"] = []

        if records:
            updated[MEMORY_RECORDS_KEY] = records
        else:
            updated.pop(MEMORY_RECORDS_KEY, None)
        cleaned.append([value, updated])

    if not found:
        raise ValueError(
            "The supplied conditioning does not contain this visual-memory record."
        )
    return cleaned


class LTXVGlobalVisualPromptMemory:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "vae": ("VAE",),
                "latent": ("LATENT",),
                "reference_images": ("IMAGE",),
                "attention_strength": (
                    "FLOAT",
                    {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.01},
                ),
                "routing_mode": (["global", "target_masked"], {"default": "global"}),
                "resize_mode": (
                    ["stretch", "center_crop"],
                    {"default": "stretch"},
                ),
                "interpolation": (
                    [
                        "lanczos",
                        "bislerp",
                        "nearest",
                        "bilinear",
                        "bicubic",
                        "area",
                        "nearest-exact",
                    ],
                    {"default": "lanczos"},
                ),
                "max_memory_tokens": (
                    "INT",
                    {
                        "default": 65536,
                        "min": 1,
                        "max": 1048576,
                        "step": 256,
                    },
                ),
                "attention_strengths": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "reference_labels": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
            },
            "optional": {
                "reference_masks": ("MASK",),
                "target_masks": ("MASK",),
            },
        }

    RETURN_TYPES = (
        "MODEL",
        "CONDITIONING",
        "CONDITIONING",
        "LATENT",
        MEMORY_INFO_TYPE,
        "STRING",
    )
    RETURN_NAMES = (
        "model",
        "positive",
        "negative",
        "latent",
        "memory_info",
        "report",
    )
    FUNCTION = "apply"
    CATEGORY = "LTX/visual_prompt_memory"
    DESCRIPTION = (
        "Encodes an IMAGE batch as frozen LTX latent memory at negative temporal "
        "positions. References remain context and are removed after sampling by "
        "LTXV Crop Global Visual Prompt Memory."
    )

    def apply(
        self,
        model,
        positive,
        negative,
        vae,
        latent,
        reference_images,
        attention_strength,
        routing_mode,
        resize_mode,
        interpolation,
        max_memory_tokens,
        attention_strengths="",
        reference_labels="",
        reference_masks=None,
        target_masks=None,
    ):
        samples = latent.get("samples")
        if not isinstance(samples, torch.Tensor) or samples.ndim != 5:
            raise ValueError(
                "LTXV Global Visual Prompt Memory requires a video-only 5D LATENT. "
                "Place it before LTXVConcatAVLatent."
            )
        if samples.shape[1] != 128:
            raise ValueError(
                "Expected a 128-channel LTX video latent. Combined AV latents are not "
                "supported; place this node before LTXVConcatAVLatent."
            )
        if not isinstance(reference_images, torch.Tensor) or reference_images.ndim != 4:
            raise ValueError(
                "reference_images must be an IMAGE batch with shape (N,H,W,C)."
            )
        reference_count = int(reference_images.shape[0])
        if reference_count < 1:
            raise ValueError("At least one reference image is required.")
        if _conditioning_value(positive, MEMORY_RECORDS_KEY) or _conditioning_value(
            negative,
            MEMORY_RECORDS_KEY,
        ):
            raise ValueError(
                "Only one visual-memory node is supported per sampler stage. "
                "Combine all references into one IMAGE batch."
            )

        strengths = _parse_float_list(
            attention_strengths,
            reference_count,
            attention_strength,
        )
        labels = _parse_labels(reference_labels, reference_count)
        source_masks = _normalize_mask_batch(
            reference_masks,
            reference_count,
            "reference_masks",
        )
        routed_masks = _normalize_mask_batch(
            target_masks,
            reference_count,
            "target_masks",
        )
        if routing_mode == "target_masked" and routed_masks is None:
            raise ValueError("target_masked routing requires target_masks.")

        scale_factors = tuple(int(value) for value in vae.downscale_index_formula)
        if len(scale_factors) != 3:
            raise ValueError(
                "The supplied VAE does not expose LTX temporal/spatial scales."
            )
        _, width_scale, height_scale = scale_factors
        target_width = int(samples.shape[4] * width_scale)
        target_height = int(samples.shape[3] * height_scale)

        encoded_references = [
            _encode_reference(
                vae,
                reference_images[index : index + 1],
                samples,
                target_width,
                target_height,
                interpolation,
                resize_mode,
            )
            for index in range(reference_count)
        ]
        latent_shapes = [list(reference.shape[2:]) for reference in encoded_references]
        memory_token_counts = [
            int(shape[0] * shape[1] * shape[2]) for shape in latent_shapes
        ]
        memory_token_count = sum(memory_token_counts)
        if memory_token_count > int(max_memory_tokens):
            raise ValueError(
                f"References require {memory_token_count} memory tokens, exceeding "
                f"max_memory_tokens={max_memory_tokens}."
            )

        _, positive_token_start, positive_guide_frames = _existing_keyframe_state(
            positive
        )
        _, negative_token_start, negative_guide_frames = _existing_keyframe_state(
            negative
        )
        if positive_token_start != negative_token_start:
            raise ValueError(
                "Positive and negative conditioning have different guide layouts."
            )
        if positive_guide_frames != negative_guide_frames:
            raise ValueError(
                "Positive and negative conditioning have different guide timing."
            )

        generated_frames = int(samples.shape[2]) - positive_guide_frames
        if generated_frames < 1:
            raise ValueError(
                "Could not identify any generated video frames before the guides."
            )

        memory_id = uuid.uuid4().hex
        for index, encoded in enumerate(encoded_references):
            frame_idx = -(reference_count - index + 1)
            positive = nodes_lt.LTXVAddGuide.add_keyframe_index(
                positive,
                frame_idx,
                encoded,
                scale_factors,
                causal_fix=True,
            )
            negative = nodes_lt.LTXVAddGuide.add_keyframe_index(
                negative,
                frame_idx,
                encoded,
                scale_factors,
                causal_fix=True,
            )

        positive, positive_entry_state = _append_attention_entries(
            positive,
            memory_id,
            labels,
            strengths,
            source_masks,
            latent_shapes,
            positive_token_start,
        )
        negative, negative_entry_state = _append_attention_entries(
            negative,
            memory_id,
            labels,
            strengths,
            source_masks,
            latent_shapes,
            negative_token_start,
        )

        frame_start = int(samples.shape[2])
        memory_frames = sum(int(reference.shape[2]) for reference in encoded_references)
        record_common = {
            "id": memory_id,
            "version": PACKAGE_VERSION,
            "keyframe_token_start": positive_token_start,
            "keyframe_token_count": memory_token_count,
            "frame_start": frame_start,
            "frame_count": memory_frames,
        }
        positive = _append_record(
            positive,
            {**record_common, **positive_entry_state},
        )
        negative = _append_record(
            negative,
            {**record_common, **negative_entry_state},
        )

        noise_mask = nodes_lt.get_noise_mask(latent)
        frozen_masks = [
            torch.zeros(
                (
                    samples.shape[0],
                    1,
                    reference.shape[2],
                    noise_mask.shape[3],
                    noise_mask.shape[4],
                ),
                device=noise_mask.device,
                dtype=noise_mask.dtype,
            )
            for reference in encoded_references
        ]
        output_latent = latent.copy()
        output_latent["samples"] = torch.cat([samples, *encoded_references], dim=2)
        output_latent["noise_mask"] = torch.cat([noise_mask, *frozen_masks], dim=2)

        output_model = model
        if routing_mode == "target_masked":
            output_model = model.clone()
            transformer_options = output_model.model_options.setdefault(
                "transformer_options",
                {},
            )
            previous_override = transformer_options.get("optimized_attention_override")
            transformer_options["optimized_attention_override"] = (
                TargetRoutingAttentionOverride(
                    target_masks=routed_masks or [],
                    memory_token_counts=memory_token_counts,
                    generated_frames=generated_frames,
                    latent_height=int(samples.shape[3]),
                    latent_width=int(samples.shape[4]),
                    maximum_video_tokens=int(output_latent["samples"].shape[2])
                    * int(samples.shape[3])
                    * int(samples.shape[4]),
                    previous_override=previous_override,
                )
            )

        memory_info = {
            "kind": MEMORY_INFO_TYPE,
            "version": PACKAGE_VERSION,
            "id": memory_id,
            "frame_start": frame_start,
            "frame_count": memory_frames,
            "memory_token_count": memory_token_count,
            "generated_frames": generated_frames,
            "latent_height": int(samples.shape[3]),
            "latent_width": int(samples.shape[4]),
            "routing_mode": routing_mode,
            "references": [
                {
                    "label": label,
                    "attention_strength": strength,
                    "tokens": tokens,
                    "negative_frame_position": -(reference_count - index + 1),
                }
                for index, (label, strength, tokens) in enumerate(
                    zip(labels, strengths, memory_token_counts)
                )
            ],
        }

        reference_summary = ", ".join(
            f"{label}={strength:.2f}" for label, strength in zip(labels, strengths)
        )
        report = (
            f"Visual memory {memory_id[:8]}: {reference_count} references, "
            f"{memory_frames} frozen latent frames, {memory_token_count} tokens. "
            f"Routing: {routing_mode}. Generated timeline: {generated_frames} latent "
            f"frames at {samples.shape[4]}x{samples.shape[3]}. "
            f"References: {reference_summary}. Crop with "
            "LTXV Crop Global Visual Prompt Memory after sampling."
        )
        return output_model, positive, negative, output_latent, memory_info, report


class LTXVCropGlobalVisualPromptMemory:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "latent": ("LATENT",),
                "memory_info": (MEMORY_INFO_TYPE,),
            }
        }

    RETURN_TYPES = ("CONDITIONING", "CONDITIONING", "LATENT", "STRING")
    RETURN_NAMES = ("positive", "negative", "latent", "report")
    FUNCTION = "crop"
    CATEGORY = "LTX/visual_prompt_memory"
    DESCRIPTION = (
        "Removes exactly the frozen latent frames and conditioning metadata added "
        "by LTXV Global Visual Prompt Memory."
    )

    def crop(self, positive, negative, latent, memory_info):
        if (
            not isinstance(memory_info, dict)
            or memory_info.get("kind") != MEMORY_INFO_TYPE
            or memory_info.get("version") != PACKAGE_VERSION
        ):
            raise ValueError("memory_info is not a compatible visual-memory handle.")

        samples = latent.get("samples")
        if not isinstance(samples, torch.Tensor) or samples.ndim != 5:
            raise ValueError(
                "Cleanup requires a video-only 5D LATENT. In AV workflows, place it "
                "after LTXVSeparateAVLatent."
            )
        frame_start = int(memory_info["frame_start"])
        frame_count = int(memory_info["frame_count"])
        if frame_start < 0 or frame_start + frame_count > samples.shape[2]:
            raise ValueError("The sampled latent no longer matches this memory handle.")

        output_latent = latent.copy()
        output_latent["samples"] = _remove_tensor_slice(
            samples,
            2,
            frame_start,
            frame_count,
        )
        noise_mask = latent.get("noise_mask")
        if isinstance(noise_mask, torch.Tensor):
            if frame_start + frame_count > noise_mask.shape[2]:
                raise ValueError(
                    "The latent noise mask no longer matches the memory handle."
                )
            output_latent["noise_mask"] = _remove_tensor_slice(
                noise_mask,
                2,
                frame_start,
                frame_count,
            )

        memory_id = memory_info["id"]
        positive = _cleanup_conditioning(positive, memory_id)
        negative = _cleanup_conditioning(negative, memory_id)
        report = (
            f"Removed visual memory {memory_id[:8]}: {frame_count} latent frames and "
            f"{memory_info['memory_token_count']} conditioning tokens."
        )
        return positive, negative, output_latent, report
