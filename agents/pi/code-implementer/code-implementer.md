---
name: code-implementer
package:
description: Implements an assigned scope or reviewer-requested fixes as one step in an implementation loop.
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-6-sol
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
