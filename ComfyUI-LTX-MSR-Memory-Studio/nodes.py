from __future__ import annotations

import uuid
from typing import Any, Optional

import torch

import comfy.sd
import comfy.utils
import comfy_extras.nodes_lt as nodes_lt
import folder_paths
import node_helpers

if __package__:
    from .attention import MSRTargetRoutingAttentionOverride
    from .reference_bank import (
        REFERENCE_BANK_TYPE,
        build_reference_bank,
        compile_prompt_mentions,
        reference_manifest,
        validate_reference_bank,
    )
else:
    from attention import MSRTargetRoutingAttentionOverride
    from reference_bank import (
        REFERENCE_BANK_TYPE,
        build_reference_bank,
        compile_prompt_mentions,
        reference_manifest,
        validate_reference_bank,
    )


MEMORY_INFO_TYPE = "LTX_MSR_MEMORY_INFO"
MEMORY_RECORDS_KEY = "ltx_msr_memory_records"
PACKAGE_VERSION = 1
NONE_LORA = "none"


def _lora_options() -> list[str]:
    try:
        names = folder_paths.get_filename_list("loras")
    except Exception:
        names = []
    return [NONE_LORA] + [name for name in names if name != NONE_LORA]


def _conditioning_value(conditioning, key: str, default=None):
    for item in conditioning:
        if key in item[1]:
            return item[1][key]
    return default


def _set_frame_rate(conditioning, frame_rate: float):
    return node_helpers.conditioning_set_values(
        conditioning,
        {"frame_rate": float(frame_rate)},
    )


def _remove_tensor_slice(
    tensor: torch.Tensor,
    dim: int,
    start: int,
    count: int,
) -> torch.Tensor:
    end = start + count
    before = tensor.narrow(dim, 0, start)
    after = tensor.narrow(dim, end, tensor.shape[dim] - end)
    return torch.cat([before, after], dim=dim)


def _validate_video_latent(latent: dict) -> torch.Tensor:
    samples = latent.get("samples") if isinstance(latent, dict) else None
    if not isinstance(samples, torch.Tensor) or samples.ndim != 5:
        raise ValueError(
            "LTXV MSR Visual Memory requires a video-only 5D LATENT. Place the "
            "node before LTXVConcatAVLatent."
        )
    if samples.shape[1] != 128:
        raise ValueError(
            "Expected a 128-channel LTX video latent. Combined AV latents are not "
            "supported; place this node before LTXVConcatAVLatent."
        )
    return samples


def _load_msr_lora(model, lora_name: str, strength: float):
    if not lora_name or lora_name == NONE_LORA:
        return model, 1, {"loaded": False, "name": NONE_LORA, "metadata": {}}

    path = folder_paths.get_full_path_or_raise("loras", lora_name)
    lora, metadata = comfy.utils.load_torch_file(
        path,
        safe_load=True,
        return_metadata=True,
    )
    metadata = metadata or {}
    raw_factor = metadata.get("reference_downscale_factor", 1)
    try:
        factor_float = float(raw_factor)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"LoRA '{lora_name}' has an invalid reference_downscale_factor."
        ) from exc
    factor = int(round(factor_float))
    if factor < 1 or abs(factor_float - factor) > 1e-6:
        raise ValueError(
            "reference_downscale_factor must be a positive whole number; "
            f"received {raw_factor!r}."
        )
    output_model = model
    if float(strength) != 0.0:
        output_model, _ = comfy.sd.load_lora_for_models(
            model,
            None,
            lora,
            float(strength),
            0.0,
        )
    return (
        output_model,
        factor,
        {
            "loaded": float(strength) != 0.0,
            "name": lora_name,
            "strength": float(strength),
            "metadata": metadata,
        },
    )


def _upscale_images(
    images: torch.Tensor,
    width: int,
    height: int,
    interpolation: str,
    resize_mode: str,
) -> torch.Tensor:
    crop = "center" if resize_mode == "center_crop" else "disabled"
    return (
        comfy.utils.common_upscale(
            images.movedim(-1, 1),
            int(width),
            int(height),
            interpolation,
            crop=crop,
        )
        .movedim(1, -1)[..., :3]
        .clamp(0.0, 1.0)
    )


def _build_reference_clip(
    ordered_images: torch.Tensor,
    width: int,
    height: int,
    interpolation: str,
    resize_mode: str,
) -> tuple[torch.Tensor, torch.Tensor]:
    resized = _upscale_images(
        ordered_images,
        width,
        height,
        interpolation,
        resize_mode,
    )
    segments = []
    for index in range(resized.shape[0]):
        repeats = 9 if index == 0 else 8
        segments.append(resized[index : index + 1].repeat(repeats, 1, 1, 1))
    return resized, torch.cat(segments, dim=0)


def _vae_encode(
    vae,
    pixels: torch.Tensor,
    use_tiled_encode: bool,
    tile_size: int,
    tile_overlap: int,
) -> torch.Tensor:
    if use_tiled_encode:
        if not hasattr(vae, "encode_tiled"):
            raise ValueError("The supplied VAE does not support tiled encoding.")
        encoded = vae.encode_tiled(
            pixels,
            tile_x=int(tile_size),
            tile_y=int(tile_size),
            overlap=int(tile_overlap),
        )
    else:
        encoded = vae.encode(pixels)
    if not isinstance(encoded, torch.Tensor) or encoded.ndim != 5:
        raise ValueError("The supplied VAE did not return a 5D LTX video latent.")
    return encoded


def _encode_msr_latent(
    vae,
    resized_images: torch.Tensor,
    reference_clip: torch.Tensor,
    reference_count: int,
    encode_width: int,
    encode_height: int,
    memory_latent_mode: str,
    use_tiled_encode: bool,
    tile_size: int,
    tile_overlap: int,
) -> torch.Tensor:
    encode_clip = _upscale_images(
        reference_clip,
        encode_width,
        encode_height,
        "bilinear",
        "stretch",
    )
    if memory_latent_mode == "msr_clip":
        guide = _vae_encode(
            vae,
            encode_clip,
            use_tiled_encode,
            tile_size,
            tile_overlap,
        )
    elif memory_latent_mode == "individual_aligned":
        encode_images = _upscale_images(
            resized_images,
            encode_width,
            encode_height,
            "bilinear",
            "stretch",
        )
        individual = [
            _vae_encode(
                vae,
                encode_images[index : index + 1],
                use_tiled_encode,
                tile_size,
                tile_overlap,
            )
            for index in range(reference_count)
        ]
        for encoded in individual:
            if encoded.shape[2] != 1:
                raise ValueError(
                    "Each independently encoded MSR reference must produce one "
                    "latent frame."
                )
        guide = torch.cat([individual[0], individual[0], *individual[1:]], dim=2)
    else:
        raise ValueError(f"Unsupported memory_latent_mode: {memory_latent_mode}")

    expected_frames = reference_count + 1
    if guide.shape[2] != expected_frames:
        raise ValueError(
            "The MSR reference clip did not encode to the aligned latent layout. "
            f"Expected {expected_frames} frames from {8 * reference_count + 1} "
            f"pixels frames, received {guide.shape[2]}."
        )
    return guide


def _broadcast_guide(
    guide: torch.Tensor,
    samples: torch.Tensor,
) -> torch.Tensor:
    if guide.shape[1] != samples.shape[1]:
        raise ValueError(
            "MSR guide VAE channels do not match the video latent: "
            f"{guide.shape[1]} vs {samples.shape[1]}."
        )
    if guide.shape[0] == 1 and samples.shape[0] > 1:
        guide = guide.expand(samples.shape[0], -1, -1, -1, -1)
    elif guide.shape[0] != samples.shape[0]:
        raise ValueError("MSR guide batch cannot be broadcast to the video batch.")
    return guide.to(device=samples.device, dtype=samples.dtype)


def _dilate_guide(
    guide: torch.Tensor,
    factor: int,
    target_height: int,
    target_width: int,
) -> tuple[torch.Tensor, Optional[torch.Tensor]]:
    if factor == 1:
        if guide.shape[3:] != (target_height, target_width):
            raise ValueError(
                "MSR guide spatial shape does not match the video latent: "
                f"{tuple(guide.shape[3:])} vs {(target_height, target_width)}."
            )
        return guide, None
    if (
        guide.shape[3] * factor != target_height
        or guide.shape[4] * factor != target_width
    ):
        raise ValueError(
            "The LoRA reference downscale factor does not align with the target "
            "latent dimensions."
        )
    dilated = torch.zeros(
        (
            guide.shape[0],
            guide.shape[1],
            guide.shape[2],
            target_height,
            target_width,
        ),
        device=guide.device,
        dtype=guide.dtype,
    )
    dilated[..., ::factor, ::factor] = guide
    sparse_mask = torch.full(
        (
            guide.shape[0],
            1,
            guide.shape[2],
            target_height,
            target_width,
        ),
        -1.0,
        device=guide.device,
        dtype=torch.float32,
    )
    sparse_mask[..., ::factor, ::factor] = 1.0
    return dilated, sparse_mask


def _existing_keyframe_state(
    conditioning,
    latent_height: int,
    latent_width: int,
) -> tuple[Optional[torch.Tensor], int, int]:
    keyframes = _conditioning_value(conditioning, "keyframe_idxs")
    if keyframes is None:
        return None, 0, 0
    if not isinstance(keyframes, torch.Tensor) or keyframes.ndim != 4:
        raise ValueError("Existing keyframe_idxs metadata has an unsupported shape.")
    token_count = int(keyframes.shape[2])
    frame_area = int(latent_height * latent_width)
    if token_count % frame_area != 0:
        raise ValueError(
            "Existing LTX guides do not align with the current latent spatial grid."
        )
    return keyframes, token_count, token_count // frame_area


def _source_mask(mask: Optional[torch.Tensor]) -> Optional[torch.Tensor]:
    if mask is None:
        return None
    return mask.detach().to(dtype=torch.float32).clamp(0.0, 1.0)[None, None, None]


def _append_attention_entries(
    conditioning,
    memory_id: str,
    bank: dict,
    existing_keyframe_tokens: int,
    full_height: int,
    full_width: int,
    encoded_height: int,
    encoded_width: int,
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
                "msr_placeholder_for": memory_id,
            }
        )

    memory_entry_start = len(entries)
    source_masks = bank.get("source_masks")
    for index, entry in enumerate(bank["entries"]):
        latent_frames = int(entry["latent_frames"])
        entries.append(
            {
                "pre_filter_count": latent_frames * full_height * full_width,
                "strength": float(entry["attention_strength"]),
                "pixel_mask": _source_mask(
                    None if source_masks is None else source_masks[index]
                ),
                "latent_shape": [
                    latent_frames,
                    encoded_height,
                    encoded_width,
                ],
                "msr_memory_id": memory_id,
                "msr_label": entry["label"],
                "msr_role": entry["role"],
                "msr_slot": entry["slot"],
            }
        )

    return node_helpers.conditioning_set_values(
        conditioning,
        {"guide_attention_entries": entries},
    ), {
        "entries_were_none": entries_were_none,
        "placeholder_index": placeholder_index,
        "memory_entry_start": memory_entry_start,
        "memory_entry_count": len(bank["entries"]),
    }


def _append_record(conditioning, record: dict[str, Any]):
    records = list(_conditioning_value(conditioning, MEMORY_RECORDS_KEY, []) or [])
    records.append(record)
    return node_helpers.conditioning_set_values(
        conditioning,
        {MEMORY_RECORDS_KEY: records},
    )


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
            raise ValueError("MSR keyframe metadata is missing during cleanup.")
        if token_start + token_count > keyframes.shape[2]:
            raise ValueError("MSR keyframe metadata no longer matches the workflow.")
        keyframes = _remove_tensor_slice(keyframes, 2, token_start, token_count)
        updated["keyframe_idxs"] = None if keyframes.shape[2] == 0 else keyframes

        entries = list(updated.get("guide_attention_entries", []) or [])
        entry_start = int(record["memory_entry_start"])
        entry_count = int(record["memory_entry_count"])
        if entry_start + entry_count > len(entries):
            raise ValueError("MSR attention metadata no longer matches the workflow.")
        del entries[entry_start : entry_start + entry_count]

        placeholder_index = record.get("placeholder_index")
        if placeholder_index is not None:
            placeholder_index = int(placeholder_index)
            if (
                placeholder_index >= len(entries)
                or entries[placeholder_index].get("msr_placeholder_for") != memory_id
            ):
                raise ValueError("MSR compatibility placeholder was modified.")
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
        raise ValueError("The supplied conditioning does not contain this MSR record.")
    return cleaned


def _make_guide_noise_mask(
    latent: dict,
    guide: torch.Tensor,
    sparse_mask: Optional[torch.Tensor],
    bank: dict,
) -> tuple[torch.Tensor, torch.Tensor]:
    noise_mask = nodes_lt.get_noise_mask(latent)
    per_frame_strengths = []
    for entry in bank["entries"]:
        per_frame_strengths.extend(
            [float(entry["guide_strength"])] * int(entry["latent_frames"])
        )
    strength_tensor = torch.tensor(
        per_frame_strengths,
        device=noise_mask.device,
        dtype=noise_mask.dtype,
    ).view(1, 1, guide.shape[2], 1, 1)
    if sparse_mask is not None:
        target_height, target_width = guide.shape[3:]
        if noise_mask.shape[3] == 1 and noise_mask.shape[4] == 1:
            noise_mask = noise_mask.expand(
                -1,
                -1,
                -1,
                target_height,
                target_width,
            )
        elif noise_mask.shape[3:] != (target_height, target_width):
            raise ValueError("Existing noise mask does not align with the MSR guide.")
        guide_mask = (
            sparse_mask.to(
                device=noise_mask.device,
                dtype=noise_mask.dtype,
            )
            - strength_tensor
        )
    else:
        guide_mask = (
            torch.ones(
                (
                    noise_mask.shape[0],
                    1,
                    guide.shape[2],
                    noise_mask.shape[3],
                    noise_mask.shape[4],
                ),
                device=noise_mask.device,
                dtype=noise_mask.dtype,
            )
            - strength_tensor
        )
    return noise_mask, guide_mask


def _apply_msr_memory(
    model,
    positive,
    negative,
    vae,
    latent,
    reference_bank: dict,
    lora_name: str,
    lora_strength: float,
    frame_rate: float,
    memory_latent_mode: str,
    routing_mode: str,
    resize_mode: str,
    interpolation: str,
    latent_downscale_override: int,
    use_tiled_encode: bool,
    tile_size: int,
    tile_overlap: int,
    max_memory_tokens: int,
):
    samples = _validate_video_latent(latent)
    bank = validate_reference_bank(reference_bank)
    if _conditioning_value(positive, MEMORY_RECORDS_KEY) or _conditioning_value(
        negative,
        MEMORY_RECORDS_KEY,
    ):
        raise ValueError(
            "Only one MSR memory node is supported per sampler stage. Combine all "
            "references in one reference bank."
        )
    positive = _set_frame_rate(positive, frame_rate)
    negative = _set_frame_rate(negative, frame_rate)
    output_model, metadata_factor, lora_info = _load_msr_lora(
        model,
        lora_name,
        lora_strength,
    )
    factor = (
        int(latent_downscale_override)
        if int(latent_downscale_override) > 0
        else int(metadata_factor)
    )

    scale_factors = tuple(int(value) for value in vae.downscale_index_formula)
    if len(scale_factors) != 3:
        raise ValueError("The supplied VAE does not expose LTX scale factors.")
    _, width_scale, height_scale = scale_factors
    full_pixel_width = int(samples.shape[4] * width_scale)
    full_pixel_height = int(samples.shape[3] * height_scale)
    if samples.shape[4] % factor or samples.shape[3] % factor:
        raise ValueError(
            f"Latent size {samples.shape[4]}x{samples.shape[3]} is not divisible "
            f"by reference_downscale_factor={factor}."
        )
    encode_width = full_pixel_width // factor
    encode_height = full_pixel_height // factor

    resized_images, reference_clip = _build_reference_clip(
        bank["images"],
        full_pixel_width,
        full_pixel_height,
        interpolation,
        resize_mode,
    )
    encoded = _encode_msr_latent(
        vae,
        resized_images,
        reference_clip,
        bank["reference_count"],
        encode_width,
        encode_height,
        memory_latent_mode,
        use_tiled_encode,
        tile_size,
        tile_overlap,
    )
    encoded = _broadcast_guide(encoded, samples)
    encoded_height, encoded_width = int(encoded.shape[3]), int(encoded.shape[4])
    effective_token_counts = [
        int(entry["latent_frames"]) * encoded_height * encoded_width
        for entry in bank["entries"]
    ]
    effective_tokens = sum(effective_token_counts)
    if effective_tokens > int(max_memory_tokens):
        raise ValueError(
            f"MSR references require {effective_tokens} attention tokens, exceeding "
            f"max_memory_tokens={max_memory_tokens}."
        )

    guide, sparse_mask = _dilate_guide(
        encoded,
        factor,
        int(samples.shape[3]),
        int(samples.shape[4]),
    )
    _, positive_token_start, positive_existing_frames = _existing_keyframe_state(
        positive,
        int(samples.shape[3]),
        int(samples.shape[4]),
    )
    _, negative_token_start, negative_existing_frames = _existing_keyframe_state(
        negative,
        int(samples.shape[3]),
        int(samples.shape[4]),
    )
    if positive_token_start != negative_token_start:
        raise ValueError(
            "Positive and negative conditioning have different guide layouts."
        )
    if positive_existing_frames != negative_existing_frames:
        raise ValueError(
            "Positive and negative conditioning have different guide frame counts."
        )
    generated_frames = int(samples.shape[2]) - positive_existing_frames
    if generated_frames < 1:
        raise ValueError("Could not identify generated frames before existing guides.")

    positive = nodes_lt.LTXVAddGuide.add_keyframe_index(
        positive,
        0,
        guide,
        scale_factors,
        latent_downscale_factor=factor,
        causal_fix=True,
    )
    negative = nodes_lt.LTXVAddGuide.add_keyframe_index(
        negative,
        0,
        guide,
        scale_factors,
        latent_downscale_factor=factor,
        causal_fix=True,
    )

    memory_id = uuid.uuid4().hex
    positive, positive_entry_state = _append_attention_entries(
        positive,
        memory_id,
        bank,
        positive_token_start,
        int(samples.shape[3]),
        int(samples.shape[4]),
        encoded_height,
        encoded_width,
    )
    negative, negative_entry_state = _append_attention_entries(
        negative,
        memory_id,
        bank,
        negative_token_start,
        int(samples.shape[3]),
        int(samples.shape[4]),
        encoded_height,
        encoded_width,
    )

    coordinate_tokens = int(guide.shape[2] * guide.shape[3] * guide.shape[4])
    frame_start = int(samples.shape[2])
    record_common = {
        "id": memory_id,
        "version": PACKAGE_VERSION,
        "keyframe_token_start": positive_token_start,
        "keyframe_token_count": coordinate_tokens,
        "frame_start": frame_start,
        "frame_count": int(guide.shape[2]),
    }
    positive = _append_record(
        positive,
        {**record_common, **positive_entry_state},
    )
    negative = _append_record(
        negative,
        {**record_common, **negative_entry_state},
    )

    noise_mask, guide_mask = _make_guide_noise_mask(
        latent,
        guide,
        sparse_mask,
        bank,
    )
    output_latent = latent.copy()
    output_latent["samples"] = torch.cat([samples, guide], dim=2)
    output_latent["noise_mask"] = torch.cat([noise_mask, guide_mask], dim=2)

    if routing_mode == "target_masked":
        target_masks = bank.get("target_masks")
        if target_masks is None:
            raise ValueError(
                "target_masked routing requires one target mask or one mask per "
                "reference in the reference bank."
            )
        output_model = output_model.clone()
        transformer_options = output_model.model_options.setdefault(
            "transformer_options",
            {},
        )
        previous_override = transformer_options.get("optimized_attention_override")
        transformer_options["optimized_attention_override"] = (
            MSRTargetRoutingAttentionOverride(
                target_masks=target_masks,
                memory_token_counts=effective_token_counts,
                generated_frames=generated_frames,
                latent_height=int(samples.shape[3]),
                latent_width=int(samples.shape[4]),
                maximum_video_tokens=int(output_latent["samples"].shape[2])
                * int(samples.shape[3])
                * int(samples.shape[4]),
                previous_override=previous_override,
            )
        )
    elif routing_mode != "global":
        raise ValueError(f"Unsupported routing_mode: {routing_mode}")

    memory_info = {
        "kind": MEMORY_INFO_TYPE,
        "version": PACKAGE_VERSION,
        "id": memory_id,
        "frame_start": frame_start,
        "frame_count": int(guide.shape[2]),
        "coordinate_token_count": coordinate_tokens,
        "effective_memory_tokens": effective_tokens,
        "generated_frames": generated_frames,
        "reference_count": bank["reference_count"],
        "reference_clip_frames": bank["frame_count"],
        "memory_latent_mode": memory_latent_mode,
        "routing_mode": routing_mode,
        "guide_strengths": [
            float(entry["guide_strength"]) for entry in bank["entries"]
        ],
        "frame_rate": float(frame_rate),
        "lora": lora_info,
        "reference_downscale_factor": factor,
        "references": bank["entries"],
    }
    labels = ", ".join(
        f"@{entry['label']}[{entry['role']}]={entry['attention_strength']:.2f}"
        for entry in bank["entries"]
    )
    report = (
        f"MSR memory {memory_id[:8]}: {bank['reference_count']} references packed "
        f"as {bank['frame_count']} pixel frames -> {guide.shape[2]} aligned latent "
        f"frames, {effective_tokens} effective attention tokens. "
        f"Mode={memory_latent_mode}, routing={routing_mode}, "
        f"reference_downscale_factor={factor}. "
        f"LoRA={lora_info['name']} at {float(lora_strength):.2f}. "
        f"References: {labels}. Crop with LTXV Crop MSR Visual Memory after "
        "sampling and after LTXVSeparateAVLatent in AV workflows."
    )
    return (
        output_model,
        positive,
        negative,
        output_latent,
        memory_info,
        reference_clip,
        report,
    )


class LTXMSRReferenceBank:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "reference_images": ("IMAGE",),
                "reference_labels": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
                "reference_roles": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
                "reference_descriptions": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "attention_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01},
                ),
                "attention_strengths": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "guide_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01},
                ),
                "guide_strengths": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "background_policy": (
                    ["auto_last", "require_role"],
                    {"default": "auto_last"},
                ),
            },
            "optional": {
                "reference_masks": ("MASK",),
                "target_masks": ("MASK",),
            },
        }

    RETURN_TYPES = (REFERENCE_BANK_TYPE, "IMAGE", "STRING")
    RETURN_NAMES = ("reference_bank", "ordered_images", "manifest")
    FUNCTION = "build"
    CATEGORY = "LTX/MSR Memory Studio"
    DESCRIPTION = (
        "Names and classifies a 2-5 image batch for MSR. Exactly one background "
        "is moved to the final trained MSR slot."
    )

    def build(
        self,
        reference_images,
        reference_labels,
        reference_roles,
        reference_descriptions,
        attention_strength,
        attention_strengths,
        guide_strength,
        guide_strengths,
        background_policy,
        reference_masks=None,
        target_masks=None,
    ):
        bank = build_reference_bank(
            reference_images,
            reference_labels,
            reference_roles,
            reference_descriptions,
            attention_strength,
            attention_strengths,
            guide_strength,
            guide_strengths,
            background_policy,
            reference_masks,
            target_masks,
        )
        return bank, bank["images"], reference_manifest(bank)


class LTXMSRCompilePromptMentions:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "reference_bank": (REFERENCE_BANK_TYPE,),
                "prompt": (
                    "STRING",
                    {"default": "", "multiline": True, "dynamicPrompts": True},
                ),
                "negative_prompt": (
                    "STRING",
                    {"default": "", "multiline": True, "dynamicPrompts": True},
                ),
                "strict_mentions": ("BOOLEAN", {"default": True}),
                "include_reference_legend": ("BOOLEAN", {"default": True}),
                "include_preservation_rules": ("BOOLEAN", {"default": True}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("positive_prompt", "negative_prompt", "mention_report")
    FUNCTION = "compile"
    CATEGORY = "LTX/MSR Memory Studio"

    def compile(
        self,
        reference_bank,
        prompt,
        negative_prompt,
        strict_mentions,
        include_reference_legend,
        include_preservation_rules,
    ):
        return compile_prompt_mentions(
            reference_bank,
            prompt,
            negative_prompt,
            strict_mentions,
            include_reference_legend,
            include_preservation_rules,
        )


class LTXVMSRVisualMemoryAdvanced:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "vae": ("VAE",),
                "latent": ("LATENT",),
                "reference_bank": (REFERENCE_BANK_TYPE,),
                "lora_name": (_lora_options(), {"default": NONE_LORA}),
                "lora_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01},
                ),
                "frame_rate": (
                    "FLOAT",
                    {"default": 50.0, "min": 1.0, "max": 1000.0, "step": 0.01},
                ),
                "memory_latent_mode": (
                    ["msr_clip", "individual_aligned"],
                    {"default": "msr_clip"},
                ),
                "routing_mode": (
                    ["global", "target_masked"],
                    {"default": "global"},
                ),
                "resize_mode": (
                    ["center_crop", "stretch"],
                    {"default": "center_crop"},
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
                "latent_downscale_override": (
                    "INT",
                    {
                        "default": 0,
                        "min": 0,
                        "max": 10,
                        "step": 1,
                        "tooltip": "0 reads reference_downscale_factor from LoRA metadata.",
                    },
                ),
                "use_tiled_encode": ("BOOLEAN", {"default": False}),
                "tile_size": (
                    "INT",
                    {"default": 256, "min": 64, "max": 1024, "step": 32},
                ),
                "tile_overlap": (
                    "INT",
                    {"default": 64, "min": 16, "max": 512, "step": 16},
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
            }
        }

    RETURN_TYPES = (
        "MODEL",
        "CONDITIONING",
        "CONDITIONING",
        "LATENT",
        MEMORY_INFO_TYPE,
        "IMAGE",
        "STRING",
    )
    RETURN_NAMES = (
        "model",
        "positive",
        "negative",
        "latent",
        "memory_info",
        "reference_clip",
        "report",
    )
    FUNCTION = "apply"
    CATEGORY = "LTX/MSR Memory Studio"
    DESCRIPTION = (
        "Advanced MSR injector that preserves existing conditioning and ordinary "
        "guides while adding the trained MSR LoRA and aligned reference memory."
    )

    def apply(
        self,
        model,
        positive,
        negative,
        vae,
        latent,
        reference_bank,
        lora_name,
        lora_strength,
        frame_rate,
        memory_latent_mode,
        routing_mode,
        resize_mode,
        interpolation,
        latent_downscale_override,
        use_tiled_encode,
        tile_size,
        tile_overlap,
        max_memory_tokens,
    ):
        return _apply_msr_memory(
            model,
            positive,
            negative,
            vae,
            latent,
            reference_bank,
            lora_name,
            lora_strength,
            frame_rate,
            memory_latent_mode,
            routing_mode,
            resize_mode,
            interpolation,
            latent_downscale_override,
            use_tiled_encode,
            tile_size,
            tile_overlap,
            max_memory_tokens,
        )


class LTXVMSRVisualMemoryStudio:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "latent": ("LATENT",),
                "reference_images": ("IMAGE",),
                "prompt": (
                    "STRING",
                    {
                        "default": (
                            "Create a coherent video using the referenced subjects, "
                            "objects, and background."
                        ),
                        "multiline": True,
                        "dynamicPrompts": True,
                    },
                ),
                "negative_prompt": (
                    "STRING",
                    {"default": "blurry, distorted, inconsistent", "multiline": True},
                ),
                "reference_labels": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
                "reference_roles": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
                "reference_descriptions": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "lora_name": (_lora_options(), {"default": NONE_LORA}),
                "lora_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01},
                ),
                "frame_rate": (
                    "FLOAT",
                    {"default": 50.0, "min": 1.0, "max": 1000.0, "step": 0.01},
                ),
                "guide_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01},
                ),
                "guide_strengths": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "attention_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01},
                ),
                "attention_strengths": (
                    "STRING",
                    {"default": "", "multiline": True},
                ),
                "memory_latent_mode": (
                    ["msr_clip", "individual_aligned"],
                    {"default": "msr_clip"},
                ),
                "routing_mode": (
                    ["global", "target_masked"],
                    {"default": "global"},
                ),
                "background_policy": (
                    ["auto_last", "require_role"],
                    {"default": "auto_last"},
                ),
                "resize_mode": (
                    ["center_crop", "stretch"],
                    {"default": "center_crop"},
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
                "latent_downscale_override": (
                    "INT",
                    {"default": 0, "min": 0, "max": 10, "step": 1},
                ),
                "use_tiled_encode": ("BOOLEAN", {"default": False}),
                "tile_size": (
                    "INT",
                    {"default": 256, "min": 64, "max": 1024, "step": 32},
                ),
                "tile_overlap": (
                    "INT",
                    {"default": 64, "min": 16, "max": 512, "step": 16},
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
                "strict_mentions": ("BOOLEAN", {"default": True}),
                "include_reference_legend": ("BOOLEAN", {"default": True}),
                "include_preservation_rules": ("BOOLEAN", {"default": True}),
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
        REFERENCE_BANK_TYPE,
        "IMAGE",
        "STRING",
        "STRING",
        "STRING",
    )
    RETURN_NAMES = (
        "model",
        "positive",
        "negative",
        "latent",
        "memory_info",
        "reference_bank",
        "reference_clip",
        "compiled_prompt",
        "compiled_negative",
        "report",
    )
    FUNCTION = "apply"
    CATEGORY = "LTX/MSR Memory Studio"
    DESCRIPTION = (
        "All-in-one role-aware MSR node. Name references, use @mentions in the "
        "prompt, load the MSR LoRA, build aligned memory, and sample downstream."
    )

    def apply(
        self,
        model,
        clip,
        vae,
        latent,
        reference_images,
        prompt,
        negative_prompt,
        reference_labels,
        reference_roles,
        reference_descriptions,
        lora_name,
        lora_strength,
        frame_rate,
        guide_strength,
        guide_strengths,
        attention_strength,
        attention_strengths,
        memory_latent_mode,
        routing_mode,
        background_policy,
        resize_mode,
        interpolation,
        latent_downscale_override,
        use_tiled_encode,
        tile_size,
        tile_overlap,
        max_memory_tokens,
        strict_mentions,
        include_reference_legend,
        include_preservation_rules,
        reference_masks=None,
        target_masks=None,
    ):
        bank = build_reference_bank(
            reference_images,
            reference_labels,
            reference_roles,
            reference_descriptions,
            attention_strength,
            attention_strengths,
            guide_strength,
            guide_strengths,
            background_policy,
            reference_masks,
            target_masks,
        )
        compiled_positive, compiled_negative, mention_report = compile_prompt_mentions(
            bank,
            prompt,
            negative_prompt,
            strict_mentions,
            include_reference_legend,
            include_preservation_rules,
        )
        if clip is None:
            raise ValueError("clip input is required for the Studio node.")
        positive = clip.encode_from_tokens_scheduled(clip.tokenize(compiled_positive))
        negative = clip.encode_from_tokens_scheduled(clip.tokenize(compiled_negative))
        (
            output_model,
            positive,
            negative,
            output_latent,
            memory_info,
            reference_clip,
            report,
        ) = _apply_msr_memory(
            model,
            positive,
            negative,
            vae,
            latent,
            bank,
            lora_name,
            lora_strength,
            frame_rate,
            memory_latent_mode,
            routing_mode,
            resize_mode,
            interpolation,
            latent_downscale_override,
            use_tiled_encode,
            tile_size,
            tile_overlap,
            max_memory_tokens,
        )
        return (
            output_model,
            positive,
            negative,
            output_latent,
            memory_info,
            bank,
            reference_clip,
            compiled_positive,
            compiled_negative,
            f"{mention_report}\n{report}",
        )


class LTXVCropMSRVisualMemory:
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
    CATEGORY = "LTX/MSR Memory Studio"
    DESCRIPTION = (
        "Removes exactly the MSR memory frames and metadata added by the matching "
        "Studio or Advanced node."
    )

    def crop(self, positive, negative, latent, memory_info):
        if (
            not isinstance(memory_info, dict)
            or memory_info.get("kind") != MEMORY_INFO_TYPE
            or memory_info.get("version") != PACKAGE_VERSION
        ):
            raise ValueError("memory_info is not a compatible MSR cleanup handle.")
        samples = latent.get("samples") if isinstance(latent, dict) else None
        if not isinstance(samples, torch.Tensor) or samples.ndim != 5:
            raise ValueError(
                "MSR cleanup requires a video-only 5D LATENT. In AV workflows, "
                "place it after LTXVSeparateAVLatent."
            )
        frame_start = int(memory_info["frame_start"])
        frame_count = int(memory_info["frame_count"])
        if frame_start < 0 or frame_start + frame_count > samples.shape[2]:
            raise ValueError("The sampled latent no longer matches this MSR handle.")

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
                raise ValueError("The noise mask no longer matches this MSR handle.")
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
            f"Removed MSR memory {memory_id[:8]}: {frame_count} latent frames and "
            f"{memory_info['coordinate_token_count']} coordinate tokens. "
            "The original generated frame count is restored."
        )
        return positive, negative, output_latent, report
