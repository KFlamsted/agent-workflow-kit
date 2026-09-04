---
name: git-committer
package:
description: Creates a local git commit for an explicit file list. Never pushes. Use after each planning artifact or reviewer-approved implementation phase.
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-5.6-sol
fallbackModels: gpt-5.5
thinking: low
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
