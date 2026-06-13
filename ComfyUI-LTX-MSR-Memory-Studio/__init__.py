if __package__:
    from .nodes import (
        LTXMSRCompilePromptMentions,
        LTXMSRReferenceBank,
        LTXVCropMSRVisualMemory,
        LTXVMSRVisualMemoryAdvanced,
        LTXVMSRVisualMemoryStudio,
    )
else:
    from nodes import (
        LTXMSRCompilePromptMentions,
        LTXMSRReferenceBank,
        LTXVCropMSRVisualMemory,
        LTXVMSRVisualMemoryAdvanced,
        LTXVMSRVisualMemoryStudio,
    )


NODE_CLASS_MAPPINGS = {
    "LTXMSRReferenceBank": LTXMSRReferenceBank,
    "LTXMSRCompilePromptMentions": LTXMSRCompilePromptMentions,
    "LTXVMSRVisualMemoryStudio": LTXVMSRVisualMemoryStudio,
    "LTXVMSRVisualMemoryAdvanced": LTXVMSRVisualMemoryAdvanced,
    "LTXVCropMSRVisualMemory": LTXVCropMSRVisualMemory,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LTXMSRReferenceBank": "LTX MSR Reference Bank",
    "LTXMSRCompilePromptMentions": "LTX MSR Compile @Mentions",
    "LTXVMSRVisualMemoryStudio": "LTXV MSR Visual Memory Studio",
    "LTXVMSRVisualMemoryAdvanced": "LTXV MSR Visual Memory Advanced",
    "LTXVCropMSRVisualMemory": "LTXV Crop MSR Visual Memory",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
