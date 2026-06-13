import torch

from ltx_visual_prompt_memory_plugin.attention import TargetRoutingAttentionOverride


def _record_attention(q, k, v, heads, mask=None, **kwargs):
    return mask


def test_target_zero_blocks_only_target_to_its_memory():
    override = TargetRoutingAttentionOverride(
        target_masks=[torch.zeros((8, 8))],
        memory_token_counts=[4],
        generated_frames=2,
        latent_height=2,
        latent_width=2,
        maximum_video_tokens=12,
    )
    q = torch.zeros((1, 12, 8), dtype=torch.float32)
    mask = override(_record_attention, q, q, q, 1)

    assert mask.shape == (1, 1, 12, 12)
    assert torch.all(mask[:, :, :8, 8:] < -1e20)
    assert torch.all(mask[:, :, 8:, :] == 0)


def test_target_one_matches_unmasked_attention():
    override = TargetRoutingAttentionOverride(
        target_masks=[torch.ones((8, 8))],
        memory_token_counts=[4],
        generated_frames=2,
        latent_height=2,
        latent_width=2,
        maximum_video_tokens=12,
    )
    q = torch.zeros((1, 12, 8), dtype=torch.float32)
    mask = override(_record_attention, q, q, q, 1)

    assert torch.all(mask == 0)


def test_nonmatching_attention_is_passed_through():
    override = TargetRoutingAttentionOverride(
        target_masks=[torch.zeros((8, 8))],
        memory_token_counts=[4],
        generated_frames=2,
        latent_height=2,
        latent_width=2,
        maximum_video_tokens=12,
    )
    q = torch.zeros((1, 5, 8), dtype=torch.float32)
    assert override(_record_attention, q, q, q, 1) is None
