---
description: Creates a local git commit for an explicit file list. Never pushes. Use after prompt.md, after all planning documents exist, or after each reviewer-approved implementation phase.
mode: subagent
model: openai/gpt-6-luna
variant: medium
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: allow
  task: deny
---
