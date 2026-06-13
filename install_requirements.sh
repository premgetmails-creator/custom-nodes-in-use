#!/usr/bin/env bash
set -e

PYTHON="${PYTHON:-python}"

for d in */ ; do
  if [ -f "$d/requirements.txt" ]; then
    echo "Installing requirements for $d"
    "$PYTHON" -m pip install -r "$d/requirements.txt"
  else
    echo "No requirements.txt in $d, skipping"
  fi
done
