---
name: code-implementer
package:
description: Implements an assigned scope or reviewer-requested fixes as one step in an implementation loop.
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-5.6-terra
fallbackModels: gpt-5.5
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
