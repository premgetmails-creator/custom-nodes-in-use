from __future__ import annotations

import re
from typing import Optional

import torch


REFERENCE_BANK_TYPE = "LTX_MSR_REFERENCE_BANK"
REFERENCE_BANK_VERSION = 1
MIN_REFERENCES = 2
MAX_REFERENCES = 5

_LABEL_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
_MENTION_PATTERN = re.compile(r"@([A-Za-z][A-Za-z0-9_-]*)")
_ROLE_ALIASES = {
    "background": "background",
    "bg": "background",
    "scene": "background",
    "environment": "background",
    "character": "character",
    "person": "character",
    "subject": "character",
    "prop": "prop",
    "object": "prop",
    "product": "prop",
    "detail": "detail",
    "texture": "detail",
    "view": "view",
    "style": "style",
    "reference": "reference",
}


def _split_compact(raw: str) -> list[str]:
    return [value.strip() for value in re.split(r"[,;\n]+", raw or "") if value.strip()]


def _split_descriptions(raw: str) -> list[str]:
    return [value.strip() for value in re.split(r"[;\n]+", raw or "") if value.strip()]


def _broadcast(
    values: list,
    count: int,
    name: str,
    default,
    allow_single: bool = True,
) -> list:
    if not values:
        return [
            default(index) if callable(default) else default for index in range(count)
        ]
    if allow_single and len(values) == 1:
        return values * count
    if len(values) != count:
        raise ValueError(
            f"{name} must contain either 1 value or {count} values; "
            f"received {len(values)}."
        )
    return values


def _normalize_masks(
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


def _canonical_role(value: str) -> str:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    return _ROLE_ALIASES.get(normalized, normalized or "reference")


def _default_labels(roles: list[str]) -> list[str]:
    totals: dict[str, int] = {}
    labels = []
    for role in roles:
        totals[role] = totals.get(role, 0) + 1
        labels.append(f"{role}_{totals[role]}")
    return labels


def build_reference_bank(
    reference_images: torch.Tensor,
    reference_labels: str = "",
    reference_roles: str = "",
    reference_descriptions: str = "",
    attention_strength: float = 1.0,
    attention_strengths: str = "",
    guide_strength: float = 1.0,
    guide_strengths: str = "",
    background_policy: str = "auto_last",
    reference_masks: Optional[torch.Tensor] = None,
    target_masks: Optional[torch.Tensor] = None,
) -> dict:
    if not isinstance(reference_images, torch.Tensor) or reference_images.ndim != 4:
        raise ValueError(
            "reference_images must be an IMAGE batch with shape (N,H,W,C)."
        )
    count = int(reference_images.shape[0])
    if count < MIN_REFERENCES or count > MAX_REFERENCES:
        raise ValueError(
            "LTX MSR supports 2 to 5 total references, including one background; "
            f"received {count}."
        )

    raw_roles = _split_compact(reference_roles)
    if raw_roles:
        roles = _broadcast(raw_roles, count, "reference_roles", "reference")
        roles = [_canonical_role(role) for role in roles]
    else:
        roles = ["reference"] * (count - 1) + ["background"]

    background_indices = [
        index for index, role in enumerate(roles) if role == "background"
    ]
    if not background_indices and background_policy == "auto_last":
        roles[-1] = "background"
        background_indices = [count - 1]
    if len(background_indices) != 1:
        raise ValueError(
            "MSR requires exactly one background reference. Mark one role as "
            "'background', or use background_policy='auto_last'."
        )
    background_index = background_indices[0]

    raw_labels = [value.lstrip("@") for value in _split_compact(reference_labels)]
    if raw_labels:
        labels = _broadcast(raw_labels, count, "reference_labels", "")
    else:
        labels = _default_labels(roles)
    for label in labels:
        if not _LABEL_PATTERN.fullmatch(label):
            raise ValueError(
                f"Invalid reference label '{label}'. Labels must start with a letter "
                "and contain only letters, numbers, underscores, or hyphens."
            )
    if len({label.casefold() for label in labels}) != count:
        raise ValueError("Reference labels must be unique.")

    descriptions = _broadcast(
        _split_descriptions(reference_descriptions),
        count,
        "reference_descriptions",
        "",
    )
    raw_strengths = [float(value) for value in _split_compact(attention_strengths)]
    strengths = _broadcast(
        raw_strengths,
        count,
        "attention_strengths",
        float(attention_strength),
    )
    if any(value < 0.0 or value > 1.0 for value in strengths):
        raise ValueError("Attention strengths must be between 0.0 and 1.0.")
    raw_guide_strengths = [float(value) for value in _split_compact(guide_strengths)]
    latent_strengths = _broadcast(
        raw_guide_strengths,
        count,
        "guide_strengths",
        float(guide_strength),
    )
    if any(value < 0.0 or value > 1.0 for value in latent_strengths):
        raise ValueError("Guide strengths must be between 0.0 and 1.0.")

    source_masks = _normalize_masks(reference_masks, count, "reference_masks")
    routed_masks = _normalize_masks(target_masks, count, "target_masks")

    order = [index for index in range(count) if index != background_index]
    order.append(background_index)
    ordered_roles = [roles[index] for index in order]
    ordered_labels = [labels[index] for index in order]
    ordered_descriptions = [descriptions[index] for index in order]
    ordered_strengths = [float(strengths[index]) for index in order]
    ordered_guide_strengths = [float(latent_strengths[index]) for index in order]
    ordered_source_masks = (
        None if source_masks is None else [source_masks[index] for index in order]
    )
    ordered_target_masks = (
        None if routed_masks is None else [routed_masks[index] for index in order]
    )

    repeats = [9] + [8] * (count - 1)
    entries = [
        {
            "slot": index + 1,
            "label": ordered_labels[index],
            "mention": f"@{ordered_labels[index]}",
            "role": ordered_roles[index],
            "description": ordered_descriptions[index],
            "attention_strength": ordered_strengths[index],
            "guide_strength": ordered_guide_strengths[index],
            "source_index": order[index],
            "pixel_frames": repeats[index],
            "latent_frames": 2 if index == 0 else 1,
        }
        for index in range(count)
    ]

    return {
        "kind": REFERENCE_BANK_TYPE,
        "version": REFERENCE_BANK_VERSION,
        "images": reference_images[order],
        "source_masks": ordered_source_masks,
        "target_masks": ordered_target_masks,
        "entries": entries,
        "reference_count": count,
        "frame_count": 8 * count + 1,
        "latent_frame_count": count + 1,
        "background_slot": count,
        "original_order": order,
    }


def validate_reference_bank(bank: dict) -> dict:
    if (
        not isinstance(bank, dict)
        or bank.get("kind") != REFERENCE_BANK_TYPE
        or bank.get("version") != REFERENCE_BANK_VERSION
    ):
        raise ValueError("reference_bank is not a compatible LTX MSR reference bank.")
    count = int(bank.get("reference_count", 0))
    if count < MIN_REFERENCES or count > MAX_REFERENCES:
        raise ValueError("reference_bank contains an unsupported reference count.")
    if len(bank.get("entries", [])) != count:
        raise ValueError("reference_bank entry metadata is incomplete.")
    images = bank.get("images")
    if not isinstance(images, torch.Tensor) or images.ndim != 4:
        raise ValueError("reference_bank image data is missing or invalid.")
    return bank


def reference_manifest(bank: dict) -> str:
    bank = validate_reference_bank(bank)
    lines = [
        (
            f"LTX MSR bank: {bank['reference_count']} references, "
            f"{bank['frame_count']} pixel frames, "
            f"{bank['latent_frame_count']} expected latent frames."
        )
    ]
    for entry in bank["entries"]:
        description = f" - {entry['description']}" if entry.get("description") else ""
        lines.append(
            f"{entry['slot']}. {entry['mention']} [{entry['role']}] "
            f"attention={entry['attention_strength']:.2f}, "
            f"guide={entry['guide_strength']:.2f}, "
            f"pixel_frames={entry['pixel_frames']}{description}"
        )
    lines.append("The background is always the final MSR slot.")
    return "\n".join(lines)


def compile_prompt_mentions(
    bank: dict,
    prompt: str,
    negative_prompt: str = "",
    strict_mentions: bool = True,
    include_reference_legend: bool = True,
    include_preservation_rules: bool = True,
) -> tuple[str, str, str]:
    bank = validate_reference_bank(bank)
    by_label = {entry["label"].casefold(): entry for entry in bank["entries"]}
    found = _MENTION_PATTERN.findall(prompt or "")
    unknown = sorted({label for label in found if label.casefold() not in by_label})
    if strict_mentions and unknown:
        raise ValueError(
            "Unknown reference mention(s): "
            + ", ".join(f"@{label}" for label in unknown)
        )

    used: list[str] = []

    def replace(match: re.Match) -> str:
        label = match.group(1)
        entry = by_label.get(label.casefold())
        if entry is None:
            return match.group(0)
        used.append(entry["label"])
        description = (
            f", described as {entry['description']}" if entry["description"] else ""
        )
        return (
            f"the {entry['role']} '{entry['label']}' from reference image "
            f"{entry['slot']}{description}"
        )

    expanded_request = _MENTION_PATTERN.sub(replace, prompt or "").strip()
    sections = []
    if include_reference_legend:
        bindings = []
        for entry in bank["entries"]:
            description = f": {entry['description']}" if entry["description"] else ""
            bindings.append(
                f"Reference image {entry['slot']} is {entry['mention']}, "
                f"role={entry['role']}{description}."
            )
        sections.append("Reference bindings:\n" + "\n".join(bindings))
    sections.append("Generation request:\n" + expanded_request)
    if include_preservation_rules:
        sections.append(
            "Reference rules:\n"
            "Keep each mentioned character, prop, detail, and background bound to "
            "its own reference. Preserve identity, appearance, colors, materials, "
            "and distinguishing features. Do not swap or merge attributes between "
            "references."
        )
    compiled_positive = "\n\n".join(section for section in sections if section)

    compiled_negative = (negative_prompt or "").strip()
    if include_preservation_rules:
        anti_swap = (
            "identity swap, subject fusion, attribute leakage, mixed costumes, "
            "duplicated subjects, wrong background, reference contamination"
        )
        compiled_negative = (
            f"{compiled_negative}, {anti_swap}" if compiled_negative else anti_swap
        )

    mention_report = "Resolved mentions: " + (
        ", ".join(f"@{label}" for label in dict.fromkeys(used)) or "none"
    )
    if unknown and not strict_mentions:
        mention_report += "; unresolved: " + ", ".join(f"@{label}" for label in unknown)
    return compiled_positive, compiled_negative, mention_report
