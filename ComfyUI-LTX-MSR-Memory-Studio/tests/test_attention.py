import torch

from ltx_msr_memory_studio_plugin.attention import (
    MSRTargetRoutingAttentionOverride,
)


def test_zero_target_mask_blocks_generated_queries_to_reference():
    override = MSRTargetRoutingAttentionOverride(
        target_masks=[torch.zeros((8, 8))],
        memory_token_counts=[4],
        generated_frames=2,
        latent_height=2,
        latent_width=2,
        maximum_video_tokens=12,
    )
    bias = override._routing_bias(12, torch.device("cpu"), torch.float32)
    assert torch.all(bias[:, :, :8, 8:] < -1e20)
    assert torch.all(bias[:, :, 8:, :8] == 0)


def test_one_target_mask_matches_global_attention():
    override = MSRTargetRoutingAttentionOverride(
        target_masks=[torch.ones((8, 8))],
        memory_token_counts=[4],
        generated_frames=2,
        latent_height=2,
        latent_width=2,
        maximum_video_tokens=12,
    )
    bias = override._routing_bias(12, torch.device("cpu"), torch.float32)
    assert torch.all(bias == 0)
