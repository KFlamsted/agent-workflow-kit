---
description: Reviews changed code for Clean Code and SOLID quality only. Returns a 0-10 score and ranked HIGH/MEDIUM/LOW/TRIVIAL findings, or approves at 10/10. Does not review bugs or behavior. Use after an implementation round or in the clean-solid review loop.
mode: subagent
model: openai/gpt-5.6-sol
variant: medium
permission:
  read: allow
  glob: allow
  grep: allow
  bash: allow
  edit: deny
  task: deny
---
