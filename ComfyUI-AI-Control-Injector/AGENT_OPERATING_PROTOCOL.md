# ComfyAI Agent Operating Protocol

This document tells an AI operator how to use ComfyAI responsibly.

## Primary Loop

```text
1. Understand the user's goal.
2. Inspect the current graph and backend capabilities.
3. Set the correct control mode.
4. Snapshot before edits.
5. Build or modify the workflow.
6. Preflight before running.
7. Queue or dry-run.
8. Collect outputs.
9. Visually analyze outputs.
10. Record the attempt.
11. Decide the next edit.
12. Repeat until success, budget limit, or human intervention.
```

## Use The Right Record For The Right Audience

Detailed machine trail:

```text
MCP JSONL log
window.comfyAI.getActionLog()
window.comfyAI.getAttemptJournal()
```

Human canvas trail:

```text
short note nodes
number + timestamp + concise paragraph
no giant subheaded logs unless explicitly requested
```

## Canvas Note Style

Good canvas note:

```text
3. 2026-05-09T10:20:00Z
Observed face softness and hand distortion in output 0002. Increased steps
from 20 to 30 and strengthened hand-related negative prompt. Output 0003
improved hands; face still needs lower CFG.
```

Avoid large canvas notes full of headings. Keep detailed fields in the journal.

## Safety Modes

```text
read_only
  inspect only

safe_edit
  normal small edits, node creation, connection changes

full_control
  clear workflow, rebuild workflow, destructive operations
```

Use `full_control` only when the user or task clearly allows rebuilds.

## Human Intervention

Stop and ask the human when:

```text
no safe API/browser/file path exists
model source is ambiguous or gated
license/download choice needs approval
disk/time/cost risk is high
visual evidence is unavailable
destructive action has no reliable recovery path
```

Return a structured human-intervention response instead of guessing.

## Socket Strategy

Never trust socket names alone.

Prefer:

```text
1. raw socket type
2. normalized union type
3. inferred semantic type
4. backend schema
5. socket name only as a weak hint
```

## Node Label Strategy

Preserve original ComfyUI node identity.

Use labels like:

```text
Video Sampler__KSampler (Advanced)
Load Main Model__CheckpointLoaderSimple
```

Do not hide the actual node type behind a friendly label.

