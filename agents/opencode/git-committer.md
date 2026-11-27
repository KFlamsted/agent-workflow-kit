---
description: Creates a local git commit for an explicit file list. Never pushes. Use after prompt.md, after all planning documents exist, or after each reviewer-approved implementation phase.
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017
variant: low
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: allow
  task: deny
---
