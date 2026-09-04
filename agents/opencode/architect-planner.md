---
description: Clarifies architectural choices or records Status: SKIPPED when none are needed, then writes architectural.md. Use for the architecture phase of end-to-end-orchestrator-detailed.
mode: subagent
model: openai/gpt-5.6-sol
variant: high
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: allow
  question: allow
  task: deny
---
