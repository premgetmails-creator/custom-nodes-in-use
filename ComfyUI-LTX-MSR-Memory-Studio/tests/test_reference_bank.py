import pytest
import torch

from ltx_msr_memory_studio_plugin.reference_bank import (
    build_reference_bank,
    compile_prompt_mentions,
)


def test_background_is_reordered_to_final_slot_with_aligned_frame_plan():
    images = torch.stack(
        [
            torch.full((8, 8, 3), 0.1),
            torch.full((8, 8, 3), 0.2),
            torch.full((8, 8, 3), 0.3),
        ]
    )
    bank = build_reference_bank(
        images,
        "garden, hero, sword",
        "background, character, prop",
        "moonlit garden; woman in white; silver sword",
        attention_strengths="0.7, 1.0, 0.8",
    )

    assert [entry["label"] for entry in bank["entries"]] == [
        "hero",
        "sword",
        "garden",
    ]
    assert [entry["pixel_frames"] for entry in bank["entries"]] == [9, 8, 8]
    assert [entry["latent_frames"] for entry in bank["entries"]] == [2, 1, 1]
    assert bank["frame_count"] == 25
    assert torch.allclose(bank["images"][0], images[1])
    assert bank["entries"][-1]["role"] == "background"


def test_reference_count_and_background_validation():
    with pytest.raises(ValueError, match="2 to 5"):
        build_reference_bank(torch.zeros((1, 8, 8, 3)))
    with pytest.raises(ValueError, match="exactly one background"):
        build_reference_bank(
            torch.zeros((2, 8, 8, 3)),
            "a,b",
            "background,background",
            background_policy="require_role",
        )


def test_masks_follow_background_reordering():
    images = torch.zeros((3, 8, 8, 3))
    masks = torch.stack(
        [
            torch.full((8, 8), 0.1),
            torch.full((8, 8), 0.2),
            torch.full((8, 8), 0.3),
        ]
    )
    bank = build_reference_bank(
        images,
        "bg,person,car",
        "background,character,prop",
        reference_masks=masks,
        target_masks=masks,
    )
    assert bank["source_masks"][0][0, 0].item() == pytest.approx(0.2)
    assert bank["source_masks"][-1][0, 0].item() == pytest.approx(0.1)
    assert bank["target_masks"][-1][0, 0].item() == pytest.approx(0.1)


def test_mentions_compile_to_explicit_reference_bindings():
    bank = build_reference_bank(
        torch.zeros((3, 8, 8, 3)),
        "maya,car,garden",
        "character,prop,background",
        "woman in a red sari; vintage blue car; moonlit garden",
    )
    positive, negative, report = compile_prompt_mentions(
        bank,
        "@maya walks toward @car inside @garden",
        "blurry",
    )
    assert "Reference image 1 is @maya" in positive
    assert "character 'maya' from reference image 1" in positive
    assert "background 'garden' from reference image 3" in positive
    assert "identity swap" in negative
    assert "@maya" in report


def test_unknown_mentions_are_rejected_in_strict_mode():
    bank = build_reference_bank(
        torch.zeros((2, 8, 8, 3)),
        "hero,room",
        "character,background",
    )
    with pytest.raises(ValueError, match="@missing"):
        compile_prompt_mentions(bank, "@hero enters @missing")
