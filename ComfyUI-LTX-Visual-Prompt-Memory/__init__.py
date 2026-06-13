if __package__:
    from .nodes import (
        LTXVGlobalVisualPromptMemory,
        LTXVCropGlobalVisualPromptMemory,
    )
else:
    from nodes import (
        LTXVGlobalVisualPromptMemory,
        LTXVCropGlobalVisualPromptMemory,
    )


NODE_CLASS_MAPPINGS = {
    "LTXVGlobalVisualPromptMemory": LTXVGlobalVisualPromptMemory,
    "LTXVCropGlobalVisualPromptMemory": LTXVCropGlobalVisualPromptMemory,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LTXVGlobalVisualPromptMemory": "LTXV Global Visual Prompt Memory",
    "LTXVCropGlobalVisualPromptMemory": "LTXV Crop Global Visual Prompt Memory",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
