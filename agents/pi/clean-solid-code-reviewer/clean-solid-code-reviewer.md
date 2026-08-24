---
name: clean-solid-code-reviewer
package:
description: Reviews implementation work for Clean Code and SOLID violations only and either approves it or returns required fixes.
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
