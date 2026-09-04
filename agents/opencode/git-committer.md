---
description: Creates a local git commit for an explicit file list. Never pushes. Use after each planning artifact or reviewer-approved implementation phase.
mode: subagent
model: openai/gpt-5.6-sol
variant: low
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: allow
  task: deny
---
