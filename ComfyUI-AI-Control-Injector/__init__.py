# This file is the Python entrypoint ComfyUI looks for when it scans
# `custom_nodes/`. Even though this project is currently JavaScript-only,
# ComfyUI still needs this small Python module so it can discover and serve the
# frontend files in `./web`.

# WEB_DIRECTORY tells ComfyUI where this custom node package keeps browser-side
# assets. Every JavaScript file in this directory can be loaded by ComfyUI as a
# frontend extension after the server starts.
WEB_DIRECTORY = "./web"

# These mappings are intentionally empty. We are not adding new Python node
# classes to the ComfyUI backend yet. The first proof focuses only on controlling
# the already-open browser workflow through the frontend graph object.
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# ComfyUI imports these names from custom node packages. Keeping __all__ explicit
# makes it clear that this package exposes only the empty node mappings and the
# frontend web directory.
__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
