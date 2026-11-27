---
description: Researches the codebase and existing solutions for a task and writes code-base.md. Use for the research phase of end-to-end-orchestrator-detailed. Makes no product or architecture decisions.
mode: subagent
model: openrouter/google/gemini-4-neon
variant: medium
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: allow
  question: allow
  task: deny
---
