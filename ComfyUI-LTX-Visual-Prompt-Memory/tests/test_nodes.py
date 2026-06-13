import pytest
import torch

from ltx_visual_prompt_memory_plugin import NODE_CLASS_MAPPINGS
from ltx_visual_prompt_memory_plugin.nodes import (
    MEMORY_RECORDS_KEY,
    LTXVCropGlobalVisualPromptMemory,
    LTXVGlobalVisualPromptMemory,
    _cleanup_conditioning,
    _normalize_mask_batch,
    _parse_float_list,
)


def test_strength_broadcast_and_validation():
    assert _parse_float_list("", 3, 0.7) == [0.7, 0.7, 0.7]
    assert _parse_float_list("0.2", 2, 0.7) == [0.2, 0.2]
    assert _parse_float_list("0.2, 0.8", 2, 0.7) == [0.2, 0.8]


def test_mask_batch_broadcast():
    masks = torch.ones((1, 16, 16))
    normalized = _normalize_mask_batch(masks, 3, "masks")
    assert len(normalized) == 3
    assert all(mask.shape == (16, 16) for mask in normalized)


def test_mask_batch_mismatch_is_rejected():
    with pytest.raises(ValueError, match="1 mask or 3 masks"):
        _normalize_mask_batch(torch.ones((2, 16, 16)), 3, "masks")


def test_cleanup_removes_only_memory_metadata():
    keyframes = torch.zeros((1, 3, 12, 2))
    conditioning = [
        [
            torch.zeros((1, 1, 1)),
            {
                "keyframe_idxs": keyframes,
                "guide_attention_entries": [
                    {"pre_filter_count": 4, "strength": 1.0},
                    {
                        "pre_filter_count": 4,
                        "strength": 0.7,
                        "visual_memory_id": "memory",
                    },
                    {"pre_filter_count": 4, "strength": 1.0},
                ],
                MEMORY_RECORDS_KEY: [
                    {
                        "id": "memory",
                        "keyframe_token_start": 4,
                        "keyframe_token_count": 4,
                        "memory_entry_start": 1,
                        "memory_entry_count": 1,
                        "placeholder_index": None,
                        "entries_were_none": False,
                    }
                ],
            },
        ]
    ]

    cleaned = _cleanup_conditioning(conditioning, "memory")
    metadata = cleaned[0][1]
    assert metadata["keyframe_idxs"].shape[2] == 8
    assert len(metadata["guide_attention_entries"]) == 2
    assert MEMORY_RECORDS_KEY not in metadata


class _FakeVae:
    downscale_index_formula = (8, 4, 4)

    def encode(self, image):
        batch = image.shape[0]
        return torch.ones((batch, 128, 1, 2, 2), dtype=torch.float32)


class _FakeModel:
    def __init__(self):
        self.model_options = {"transformer_options": {}}

    def clone(self):
        clone = _FakeModel()
        clone.model_options = {
            "transformer_options": self.model_options["transformer_options"].copy()
        }
        return clone


def _conditioning():
    return [[torch.zeros((1, 1, 1)), {}]]


def test_registration_exposes_both_nodes():
    assert (
        NODE_CLASS_MAPPINGS["LTXVGlobalVisualPromptMemory"]
        is LTXVGlobalVisualPromptMemory
    )
    assert (
        NODE_CLASS_MAPPINGS["LTXVCropGlobalVisualPromptMemory"]
        is LTXVCropGlobalVisualPromptMemory
    )


def test_inject_and_crop_round_trip():
    latent = {"samples": torch.zeros((1, 128, 3, 2, 2))}
    references = torch.zeros((2, 8, 8, 3))
    model, positive, negative, augmented, info, report = (
        LTXVGlobalVisualPromptMemory().apply(
            _FakeModel(),
            _conditioning(),
            _conditioning(),
            _FakeVae(),
            latent,
            references,
            0.7,
            "global",
            "stretch",
            "bilinear",
            64,
            "0.6, 0.8",
            "back, hair",
        )
    )

    assert model.model_options["transformer_options"] == {}
    assert augmented["samples"].shape == (1, 128, 5, 2, 2)
    assert torch.all(augmented["noise_mask"][:, :, -2:] == 0)
    assert positive[0][1]["keyframe_idxs"].shape[2] == 8
    assert torch.unique(positive[0][1]["keyframe_idxs"][:, 0, :, 0]).tolist() == [
        -3.0,
        -2.0,
    ]
    assert info["memory_token_count"] == 8
    assert "back=0.60" in report

    clean_positive, clean_negative, clean_latent, clean_report = (
        LTXVCropGlobalVisualPromptMemory().crop(
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
    assert "Removed visual memory" in clean_report


def test_target_mode_clones_and_installs_attention_override():
    latent = {"samples": torch.zeros((1, 128, 3, 2, 2))}
    references = torch.zeros((1, 8, 8, 3))
    original_model = _FakeModel()
    output_model, _, _, _, _, _ = LTXVGlobalVisualPromptMemory().apply(
        original_model,
        _conditioning(),
        _conditioning(),
        _FakeVae(),
        latent,
        references,
        0.7,
        "target_masked",
        "stretch",
        "bilinear",
        64,
        target_masks=torch.ones((1, 8, 8)),
    )

    assert output_model is not original_model
    assert (
        "optimized_attention_override"
        in output_model.model_options["transformer_options"]
    )
    assert original_model.model_options["transformer_options"] == {}


def test_combined_av_latent_is_rejected_with_placement_message():
    with pytest.raises(ValueError, match="before LTXVConcatAVLatent"):
        LTXVGlobalVisualPromptMemory().apply(
            _FakeModel(),
            _conditioning(),
            _conditioning(),
            _FakeVae(),
            {"samples": object()},
            torch.zeros((1, 8, 8, 3)),
            0.7,
            "global",
            "stretch",
            "bilinear",
            64,
        )


def test_round_trip_preserves_existing_guide_metadata():
    existing_keyframes = torch.zeros((1, 3, 4, 2))
    existing_entry = {
        "pre_filter_count": 4,
        "strength": 0.9,
        "pixel_mask": None,
        "latent_shape": [1, 2, 2],
    }
    conditioning = [
        [
            torch.zeros((1, 1, 1)),
            {
                "keyframe_idxs": existing_keyframes,
                "guide_attention_entries": [existing_entry],
            },
        ]
    ]
    latent = {"samples": torch.zeros((1, 128, 4, 2, 2))}
    references = torch.zeros((1, 8, 8, 3))

    _, positive, negative, augmented, info, _ = LTXVGlobalVisualPromptMemory().apply(
        _FakeModel(),
        conditioning,
        conditioning,
        _FakeVae(),
        latent,
        references,
        0.7,
        "global",
        "stretch",
        "bilinear",
        64,
    )
    clean_positive, clean_negative, clean_latent, _ = (
        LTXVCropGlobalVisualPromptMemory().crop(
            positive,
            negative,
            augmented,
            info,
        )
    )

    assert clean_latent["samples"].shape == latent["samples"].shape
    assert torch.equal(
        clean_positive[0][1]["keyframe_idxs"],
        existing_keyframes,
    )
    assert clean_positive[0][1]["guide_attention_entries"] == [existing_entry]
    assert clean_negative[0][1]["guide_attention_entries"] == [existing_entry]
