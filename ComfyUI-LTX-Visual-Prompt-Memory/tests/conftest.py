from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import torch
import torch.nn.functional as F


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = "ltx_visual_prompt_memory_plugin"


def _conditioning_set_values(conditioning, values):
    output = []
    for value, metadata in conditioning:
        updated = metadata.copy()
        updated.update(values)
        output.append([value, updated])
    return output


def _common_upscale(image, width, height, interpolation, crop="disabled"):
    mode = {
        "nearest": "nearest",
        "nearest-exact": "nearest-exact",
        "area": "area",
    }.get(interpolation, "bilinear")
    kwargs = {"size": (height, width), "mode": mode}
    if mode == "bilinear":
        kwargs["align_corners"] = False
    return F.interpolate(image, **kwargs)


class _FakeAddGuide:
    @classmethod
    def add_keyframe_index(
        cls,
        conditioning,
        frame_idx,
        guiding_latent,
        scale_factors,
        latent_downscale_factor=1,
        causal_fix=None,
    ):
        batch, _, frames, height, width = guiding_latent.shape
        tokens = frames * height * width
        coords = torch.zeros((batch, 3, tokens, 2), dtype=torch.float32)
        coords[:, 0, :, 0] = frame_idx
        coords[:, 0, :, 1] = frame_idx + 1
        existing = conditioning[0][1].get("keyframe_idxs")
        if existing is not None:
            coords = torch.cat([existing, coords], dim=2)
        return _conditioning_set_values(conditioning, {"keyframe_idxs": coords})


def _get_noise_mask(latent):
    if latent.get("noise_mask") is not None:
        return latent["noise_mask"].clone()
    samples = latent["samples"]
    return torch.ones(
        (samples.shape[0], 1, samples.shape[2], 1, 1),
        dtype=torch.float32,
        device=samples.device,
    )


def _install_comfy_stubs():
    comfy = types.ModuleType("comfy")
    comfy_utils = types.ModuleType("comfy.utils")
    comfy_utils.common_upscale = _common_upscale
    comfy.utils = comfy_utils

    comfy_extras = types.ModuleType("comfy_extras")
    nodes_lt = types.ModuleType("comfy_extras.nodes_lt")
    nodes_lt.LTXVAddGuide = _FakeAddGuide
    nodes_lt.get_noise_mask = _get_noise_mask
    comfy_extras.nodes_lt = nodes_lt

    node_helpers = types.ModuleType("node_helpers")
    node_helpers.conditioning_set_values = _conditioning_set_values

    sys.modules["comfy"] = comfy
    sys.modules["comfy.utils"] = comfy_utils
    sys.modules["comfy_extras"] = comfy_extras
    sys.modules["comfy_extras.nodes_lt"] = nodes_lt
    sys.modules["node_helpers"] = node_helpers


def pytest_configure():
    _install_comfy_stubs()
    spec = importlib.util.spec_from_file_location(
        PACKAGE_NAME,
        ROOT / "__init__.py",
        submodule_search_locations=[str(ROOT)],
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[PACKAGE_NAME] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
