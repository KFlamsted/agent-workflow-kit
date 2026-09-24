---
name: git-committer
package:
description: Creates a local git commit for an explicit file list. Never pushes. Use after prompt.md, after all planning documents exist, or after each reviewer-approved implementation phase.
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-6-luna
fallbackModels: gpt-6-sol
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
