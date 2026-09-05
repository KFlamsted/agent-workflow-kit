---
name: clean-solid-code-reviewer
package:
description: Reviews a diff/change or the full repository for Clean Code and SOLID quality only. Returns a 0-10 score and ranked HIGH/MEDIUM/LOW/TRIVIAL findings, or approves at 10/10. Does not review bugs or behavior. Use after an implementation round, on a full repo, or in the clean-solid review loop.
tools: read, grep, find, ls, bash
extensions:
model: gpt-5.6-sol
fallbackModels: gpt-5.6-sol
thinking: medium
systemPromptMode: append
inheritProjectContext: false
inheritSkills: true
skills:
output:
defaultReads:
defaultProgress: true
completionGuard: false
interactive: true
maxSubagentDepth: 1
# 1 hour
maxExecutionTimeMs: 3600000
maxTokens: 270000
---
