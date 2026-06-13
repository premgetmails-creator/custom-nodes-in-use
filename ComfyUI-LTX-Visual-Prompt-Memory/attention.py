from __future__ import annotations

from typing import Callable, Iterable, Optional

import torch
import torch.nn.functional as F


def _target_mask_tokens(
    mask: torch.Tensor,
    generated_frames: int,
    latent_height: int,
    latent_width: int,
    device: torch.device,
    dtype: torch.dtype,
) -> torch.Tensor:
    mask = mask.detach().to(device=device, dtype=torch.float32)
    if mask.ndim == 3:
        mask = mask[0]
    if mask.ndim != 2:
        raise ValueError(
            f"Target mask must be 2D after selection, got {tuple(mask.shape)}."
        )

    spatial = F.interpolate(
        mask[None, None],
        size=(latent_height, latent_width),
        mode="area",
    )[0, 0]
    spatial = spatial.clamp(0.0, 1.0).reshape(1, -1)
    return spatial.repeat(1, generated_frames).to(dtype=dtype)


class TargetRoutingAttentionOverride:
    """Adds target-query to memory-key gating to LTX video self-attention."""

    def __init__(
        self,
        target_masks: Iterable[torch.Tensor],
        memory_token_counts: Iterable[int],
        generated_frames: int,
        latent_height: int,
        latent_width: int,
        maximum_video_tokens: int,
        previous_override: Optional[Callable] = None,
    ) -> None:
        self.target_masks = [
            mask.detach().to(device="cpu", dtype=torch.float32) for mask in target_masks
        ]
        self.memory_token_counts = [int(count) for count in memory_token_counts]
        self.generated_frames = int(generated_frames)
        self.latent_height = int(latent_height)
        self.latent_width = int(latent_width)
        self.maximum_video_tokens = int(maximum_video_tokens)
        self.previous_override = previous_override

        self.generated_token_count = (
            self.generated_frames * self.latent_height * self.latent_width
        )
        self.memory_token_count = sum(self.memory_token_counts)
        self.minimum_video_tokens = self.generated_token_count + self.memory_token_count

        if len(self.target_masks) != len(self.memory_token_counts):
            raise ValueError("Each memory reference must have one target mask.")

    def _next(self, func: Callable, *args, **kwargs):
        if self.previous_override is not None:
            return self.previous_override(func, *args, **kwargs)
        return func(*args, **kwargs)

    def _is_video_self_attention(self, q: torch.Tensor, k: torch.Tensor) -> bool:
        if q.ndim != 3 or k.ndim != 3 or q.shape[1] != k.shape[1]:
            return False
        token_count = q.shape[1]
        return self.minimum_video_tokens <= token_count <= self.maximum_video_tokens

    def _routing_bias(
        self,
        token_count: int,
        device: torch.device,
        dtype: torch.dtype,
    ) -> torch.Tensor:
        bias = torch.zeros(
            (1, 1, token_count, token_count),
            device=device,
            dtype=dtype,
        )
        memory_start = token_count - self.memory_token_count
        column = memory_start
        finfo = torch.finfo(dtype)

        for mask, memory_tokens in zip(self.target_masks, self.memory_token_counts):
            weights = _target_mask_tokens(
                mask,
                self.generated_frames,
                self.latent_height,
                self.latent_width,
                device,
                dtype,
            )
            log_weights = torch.full_like(weights, finfo.min)
            positive = weights > 0
            if positive.any():
                log_weights[positive] = torch.log(
                    weights[positive].clamp(min=finfo.tiny)
                )

            next_column = column + memory_tokens
            bias[
                :,
                :,
                : self.generated_token_count,
                column:next_column,
            ] = log_weights.view(1, 1, -1, 1)
            column = next_column

        return bias

    def __call__(self, func: Callable, *args, **kwargs):
        if len(args) < 4:
            return self._next(func, *args, **kwargs)

        q, k = args[0], args[1]
        if not isinstance(q, torch.Tensor) or not isinstance(k, torch.Tensor):
            return self._next(func, *args, **kwargs)
        if not self._is_video_self_attention(q, k):
            return self._next(func, *args, **kwargs)

        positional_mask = len(args) >= 5
        existing_mask = args[4] if positional_mask else kwargs.get("mask")
        routing_bias = self._routing_bias(q.shape[1], q.device, q.dtype)
        combined_mask = (
            routing_bias
            if existing_mask is None
            else existing_mask.to(device=q.device, dtype=q.dtype) + routing_bias
        )

        if positional_mask:
            updated_args = list(args)
            updated_args[4] = combined_mask
            return self._next(func, *updated_args, **kwargs)

        updated_kwargs = dict(kwargs)
        updated_kwargs["mask"] = combined_mask
        return self._next(func, *args, **updated_kwargs)
