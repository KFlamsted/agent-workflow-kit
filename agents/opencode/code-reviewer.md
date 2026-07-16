---
description: Reviews loop-produced implementation work and either approves it or returns required fixes. Use after an implementation round.
mode: subagent
model: openai/gpt-5.6-sol
variant: high
permission:
  read: allow
  glob: allow
  grep: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "git show*": allow
  edit: deny
  task: deny
---
