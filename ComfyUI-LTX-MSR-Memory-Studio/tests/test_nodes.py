import pytest
import torch

from ltx_msr_memory_studio_plugin import NODE_CLASS_MAPPINGS
from ltx_msr_memory_studio_plugin.nodes import (
    MEMORY_RECORDS_KEY,
    LTXVCropMSRVisualMemory,
    LTXVMSRVisualMemoryAdvanced,
    LTXVMSRVisualMemoryStudio,
)
from ltx_msr_memory_studio_plugin.reference_bank import build_reference_bank


class _FakeVae:
    downscale_index_formula = (8, 4, 4)

    def encode(self, pixels):
        frames = (pixels.shape[0] - 1) // 8 + 1
        height = pixels.shape[1] // 4
        width = pixels.shape[2] // 4
        value = float(pixels.mean()) if pixels.numel() else 0.0
        return torch.full(
            (1, 128, frames, height, width),
            value,
            dtype=torch.float32,
        )

    def encode_tiled(self, pixels, tile_x, tile_y, overlap):
        return self.encode(pixels)


class _FakeModel:
    def __init__(self):
        self.model_options = {"transformer_options": {}}
        self.lora_strength = None

    def clone(self):
        output = _FakeModel()
        output.model_options = {
            "transformer_options": self.model_options["transformer_options"].copy()
        }
        output.lora_strength = self.lora_strength
        return output


class _FakeClip:
    def tokenize(self, text):
        return text

    def encode_from_tokens_scheduled(self, tokens):
        return [[torch.zeros((1, 1, 1)), {"encoded_text": tokens}]]


def _conditioning(metadata=None):
    return [[torch.zeros((1, 1, 1)), metadata or {}]]


def _advanced_apply(
    latent,
    bank,
    model=None,
    positive=None,
    negative=None,
    lora_name="none",
    memory_latent_mode="msr_clip",
    routing_mode="global",
    downscale=0,
):
    return LTXVMSRVisualMemoryAdvanced().apply(
        model or _FakeModel(),
        positive or _conditioning(),
        negative or _conditioning(),
        _FakeVae(),
        latent,
        bank,
        lora_name,
        1.0,
        50.0,
        memory_latent_mode,
        routing_mode,
        "stretch",
        "bilinear",
        downscale,
        False,
        256,
        64,
        65536,
    )


def test_registration_exposes_complete_node_family():
    assert set(NODE_CLASS_MAPPINGS) == {
        "LTXMSRReferenceBank",
        "LTXMSRCompilePromptMentions",
        "LTXVMSRVisualMemoryStudio",
        "LTXVMSRVisualMemoryAdvanced",
        "LTXVCropMSRVisualMemory",
    }


def test_clean_msr_injection_and_exact_cleanup_round_trip():
    bank = build_reference_bank(
        torch.zeros((3, 8, 8, 3)),
        "hero,sword,garden",
        "character,prop,background",
        attention_strengths="1.0,0.8,0.7",
    )
    latent = {"samples": torch.zeros((1, 128, 5, 2, 2))}
    model, positive, negative, augmented, info, clip, report = _advanced_apply(
        latent,
        bank,
    )

    assert model.lora_strength is None
    assert clip.shape == (25, 8, 8, 3)
    assert augmented["samples"].shape == (1, 128, 9, 2, 2)
    assert torch.all(augmented["noise_mask"][:, :, -4:] == 0)
    assert positive[0][1]["frame_rate"] == 50.0
    assert positive[0][1]["keyframe_idxs"].shape[2] == 16
    assert [
        entry["pre_filter_count"] for entry in positive[0][1]["guide_attention_entries"]
    ] == [8, 4, 4]
    assert info["effective_memory_tokens"] == 16
    assert "25 pixel frames -> 4 aligned latent frames" in report

    clean_positive, clean_negative, clean_latent, clean_report = (
        LTXVCropMSRVisualMemory().crop(
            positive,
            negative,
            augmented,
            info,
        )
    )
    assert clean_latent["samples"].shape == latent["samples"].shape
    assert clean_positive[0][1]["keyframe_idxs"] is None
    assert clean_negative[0][1]["keyframe_idxs"] is None
    assert MEMORY_RECORDS_KEY not in clean_positive[0][1]
    assert "original generated frame count is restored" in clean_report


def test_individual_aligned_mode_duplicates_first_reference_and_keeps_count():
    images = torch.stack(
        [
            torch.full((8, 8, 3), 0.1),
            torch.full((8, 8, 3), 0.2),
            torch.full((8, 8, 3), 0.3),
        ]
    )
    bank = build_reference_bank(
        images,
        "hero,prop,bg",
        "character,prop,background",
    )
    latent = {"samples": torch.zeros((1, 128, 3, 2, 2))}
    _, _, _, augmented, info, _, _ = _advanced_apply(
        latent,
        bank,
        memory_latent_mode="individual_aligned",
    )
    tail = augmented["samples"][0, 0, -4:, 0, 0]
    assert tail.tolist() == pytest.approx([0.1, 0.1, 0.2, 0.3])
    assert info["frame_count"] == 4


def test_lora_metadata_factor_two_uses_sparse_grid_without_losing_layout():
    bank = build_reference_bank(
        torch.zeros((3, 16, 16, 3)),
        "hero,prop,bg",
        "character,prop,background",
    )
    latent = {"samples": torch.zeros((1, 128, 5, 4, 4))}
    model, _, _, augmented, info, _, _ = _advanced_apply(
        latent,
        bank,
        lora_name="factor2.safetensors",
    )
    assert model.lora_strength == 1.0
    assert info["reference_downscale_factor"] == 2
    assert info["effective_memory_tokens"] == 16
    assert info["coordinate_token_count"] == 64
    guide_mask = augmented["noise_mask"][:, :, -4:]
    assert torch.all(guide_mask[..., ::2, ::2] == 0)
    assert torch.all(guide_mask[..., 1::2, :] < 0)


def test_existing_guide_metadata_and_frames_are_preserved():
    existing_keyframes = torch.zeros((1, 3, 4, 2))
    existing_entry = {
        "pre_filter_count": 4,
        "strength": 1.0,
        "pixel_mask": None,
        "latent_shape": [1, 2, 2],
    }
    conditioning = _conditioning(
        {
            "keyframe_idxs": existing_keyframes,
            "guide_attention_entries": [existing_entry],
        }
    )
    bank = build_reference_bank(
        torch.zeros((2, 8, 8, 3)),
        "hero,bg",
        "character,background",
    )
    latent = {"samples": torch.zeros((1, 128, 4, 2, 2))}
    _, positive, negative, augmented, info, _, _ = _advanced_apply(
        latent,
        bank,
        positive=conditioning,
        negative=conditioning,
    )
    clean_positive, clean_negative, clean_latent, _ = LTXVCropMSRVisualMemory().crop(
        positive,
        negative,
        augmented,
        info,
    )
    assert clean_latent["samples"].shape == latent["samples"].shape
    assert torch.equal(
        clean_positive[0][1]["keyframe_idxs"],
        existing_keyframes,
    )
    assert clean_positive[0][1]["guide_attention_entries"] == [existing_entry]
    assert clean_negative[0][1]["guide_attention_entries"] == [existing_entry]


def test_target_routing_clones_patched_model_and_installs_override():
    bank = build_reference_bank(
        torch.zeros((2, 8, 8, 3)),
        "hero,bg",
        "character,background",
        target_masks=torch.ones((2, 8, 8)),
    )
    original = _FakeModel()
    output, _, _, _, _, _, _ = _advanced_apply(
        {"samples": torch.zeros((1, 128, 3, 2, 2))},
        bank,
        model=original,
        routing_mode="target_masked",
    )
    assert output is not original
    assert "optimized_attention_override" in output.model_options["transformer_options"]
    assert original.model_options["transformer_options"] == {}


def test_target_routing_requires_masks():
    bank = build_reference_bank(
        torch.zeros((2, 8, 8, 3)),
        "hero,bg",
        "character,background",
    )
    with pytest.raises(ValueError, match="requires one target mask"):
        _advanced_apply(
            {"samples": torch.zeros((1, 128, 3, 2, 2))},
            bank,
            routing_mode="target_masked",
        )


def test_studio_node_compiles_mentions_and_encodes_conditioning():
    outputs = LTXVMSRVisualMemoryStudio().apply(
        _FakeModel(),
        _FakeClip(),
        _FakeVae(),
        {"samples": torch.zeros((1, 128, 3, 2, 2))},
        torch.zeros((3, 8, 8, 3)),
        "@maya lifts @sword inside @garden",
        "blurry",
        "maya,sword,garden",
        "character,prop,background",
        "woman in red; silver sword; palace garden",
        "msr.safetensors",
        1.0,
        50.0,
        1.0,
        "",
        1.0,
        "",
        "msr_clip",
        "global",
        "auto_last",
        "stretch",
        "bilinear",
        0,
        False,
        256,
        64,
        65536,
        True,
        True,
        True,
    )
    model, positive, _, _, _, bank, clip, prompt, negative, report = outputs
    assert model.lora_strength == 1.0
    assert positive[0][1]["encoded_text"] == prompt
    assert "character 'maya' from reference image 1" in prompt
    assert "identity swap" in negative
    assert bank["entries"][-1]["label"] == "garden"
    assert clip.shape[0] == 25
    assert "Resolved mentions: @maya, @sword, @garden" in report


def test_per_reference_guide_strengths_control_temporal_noise_mask():
    bank = build_reference_bank(
        torch.zeros((3, 8, 8, 3)),
        "hero,prop,bg",
        "character,prop,background",
        guide_strengths="1.0,0.5,0.0",
    )
    _, _, _, augmented, info, _, _ = _advanced_apply(
        {"samples": torch.zeros((1, 128, 3, 2, 2))},
        bank,
    )
    tail = augmented["noise_mask"][0, 0, -4:, 0, 0]
    assert tail.tolist() == pytest.approx([0.0, 0.0, 0.5, 1.0])
    assert info["guide_strengths"] == [1.0, 0.5, 0.0]


def test_combined_av_latent_is_rejected_with_placement_message():
    bank = build_reference_bank(
        torch.zeros((2, 8, 8, 3)),
        "hero,bg",
        "character,background",
    )
    with pytest.raises(ValueError, match="before LTXVConcatAVLatent"):
        _advanced_apply({"samples": object()}, bank)
