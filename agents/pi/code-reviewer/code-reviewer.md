---
name: code-reviewer
package: code-implementation-loop
description: Reviews loop-produced implementation work and either approves it or returns required fixes.
tools: read, grep, find, ls, bash
extensions:
model: gpt-5.6-sol
fallbackModels: gpt-5.6-sol
thinking: high
systemPromptMode: append
inheritProjectContext: true
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
