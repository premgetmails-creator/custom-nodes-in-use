#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/premgetmails-creator/custom-nodes-in-use.git}"
BRANCH="${BRANCH:-main}"

BASE_DIR="$(pwd)"
COMFY_DIR="${COMFY_DIR:-$BASE_DIR/ComfyUI}"
CUSTOM_NODES_DIR="$COMFY_DIR/custom_nodes"

echo "============================================================"
echo " ComfyUI Custom Node Pack Installer"
echo "============================================================"
echo "Repo: $REPO_URL"
echo "Branch: $BRANCH"
echo "ComfyUI folder: $COMFY_DIR"
echo "Custom nodes target: $CUSTOM_NODES_DIR"
echo "============================================================"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed or not available in PATH."
  exit 1
fi

if [ ! -d "$COMFY_DIR" ]; then
  echo "ERROR: Could not find ComfyUI folder at:"
  echo "$COMFY_DIR"
  echo
  echo "Run this script from the folder that contains the ComfyUI folder."
  exit 1
fi

mkdir -p "$CUSTOM_NODES_DIR"

if [ -n "${PYTHON:-}" ]; then
  PYTHON_BIN="$PYTHON"
elif [ -x "$COMFY_DIR/venv/bin/python" ]; then
  PYTHON_BIN="$COMFY_DIR/venv/bin/python"
elif [ -x "$BASE_DIR/venv/bin/python" ]; then
  PYTHON_BIN="$BASE_DIR/venv/bin/python"
elif [ -x "/home/zeus/miniconda3/envs/cloudspace/bin/python" ]; then
  PYTHON_BIN="/home/zeus/miniconda3/envs/cloudspace/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "ERROR: Could not find Python."
  echo "Run with: PYTHON=/path/to/python bash install_custom_nodes_from_pack.sh"
  exit 1
fi

echo "Using Python: $PYTHON_BIN"
"$PYTHON_BIN" --version || true

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

REPO_DIR="$TMP_DIR/custom-nodes-in-use"

echo
echo "Cloning custom node pack repo temporarily..."
if ! git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"; then
  echo
  echo "Branch-specific clone failed. Trying normal clone..."
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

echo
echo "Scanning available custom node folders..."
PACKS=()

while IFS= read -r d; do
  name="$(basename "$d")"

  case "$name" in
    .git|.github|__pycache__|node_modules|models|output|outputs|input|temp|tmp)
      continue
      ;;
  esac

  PACKS+=("$name")
done < <(find "$REPO_DIR" -mindepth 1 -maxdepth 1 -type d -print | sort)

if [ "${#PACKS[@]}" -eq 0 ]; then
  echo "ERROR: No top-level custom node folders found in repo."
  exit 1
fi

echo
echo "Available custom node packs:"
echo "------------------------------------------------------------"

i=1
for name in "${PACKS[@]}"; do
  echo "  $i) $name"
  i=$((i + 1))
done

echo "------------------------------------------------------------"
echo
echo "Enter numbers separated by commas, for example:"
echo "  1,3,5"
echo
echo "Or type:"
echo "  all"
echo
read -r -p "Your choice: " CHOICE

SELECTED=()

if [ "$CHOICE" = "all" ] || [ "$CHOICE" = "ALL" ]; then
  for name in "${PACKS[@]}"; do
    SELECTED+=("$name")
  done
else
  OLDIFS="$IFS"
  IFS=','
  set -- $CHOICE
  IFS="$OLDIFS"

  for raw in "$@"; do
    num="$(echo "$raw" | tr -d '[:space:]')"

    if ! echo "$num" | grep -Eq '^[0-9]+$'; then
      echo "ERROR: Invalid selection: $raw"
      exit 1
    fi

    if [ "$num" -lt 1 ] || [ "$num" -gt "${#PACKS[@]}" ]; then
      echo "ERROR: Selection out of range: $num"
      exit 1
    fi

    idx=$((num - 1))
    SELECTED+=("${PACKS[$idx]}")
  done
fi

if [ "${#SELECTED[@]}" -eq 0 ]; then
  echo "ERROR: Nothing selected."
  exit 1
fi

echo
echo "Selected packs:"
for name in "${SELECTED[@]}"; do
  echo "  - $name"
done

echo
read -r -p "Proceed with installation? Existing folders will be backed up. [y/N]: " CONFIRM

case "$CONFIRM" in
  y|Y|yes|YES)
    ;;
  *)
    echo "Cancelled."
    exit 0
    ;;
esac

TS="$(date +%Y%m%d_%H%M%S)"

copy_folder() {
  src="$1"
  dest="$2"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude='.git' \
      --exclude='.DS_Store' \
      --exclude='__pycache__' \
      --exclude='*.pyc' \
      --exclude='*.pyo' \
      --exclude='*.log' \
      --exclude='node_modules' \
      --exclude='models' \
      --exclude='output' \
      --exclude='outputs' \
      --exclude='input' \
      --exclude='temp' \
      --exclude='tmp' \
      "$src/" "$dest/"
  else
    mkdir -p "$dest"
    cp -R "$src/." "$dest/"
    find "$dest" -name ".git" -exec rm -rf {} + 2>/dev/null || true
    find "$dest" -name ".DS_Store" -delete 2>/dev/null || true
    find "$dest" -name "__pycache__" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    find "$dest" -name "*.pyc" -delete 2>/dev/null || true
  fi
}

echo
echo "Installing selected custom nodes..."
echo "============================================================"

for name in "${SELECTED[@]}"; do
  SRC="$REPO_DIR/$name"
  DEST="$CUSTOM_NODES_DIR/$name"

  echo
  echo "Installing: $name"
  echo "Source: $SRC"
  echo "Target: $DEST"

  if [ -e "$DEST" ]; then
    BACKUP="${DEST}.backup_${TS}"
    echo "Existing folder found. Backing up to:"
    echo "$BACKUP"
    mv "$DEST" "$BACKUP"
  fi

  mkdir -p "$DEST"
  copy_folder "$SRC" "$DEST"

  if [ -f "$DEST/requirements.txt" ]; then
    echo "Installing pip requirements for $name..."
    "$PYTHON_BIN" -m pip install -r "$DEST/requirements.txt"
  else
    echo "No requirements.txt found for $name. Skipping pip install."
  fi
done

echo
echo "============================================================"
echo "Done."
echo "Installed selected custom nodes into:"
echo "$CUSTOM_NODES_DIR"
echo
echo "Now restart ComfyUI."
echo "============================================================"
