---
name: code-planner
package:
description: Clarifies remaining technical decisions and writes an INVEST-sized implementation plan with progress checkboxes. Use for the implementation-planning phase of end-to-end-orchestrator-detailed.
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-5.6-sol
fallbackModels: gpt-5.6-sol
thinking: high
systemPromptMode: replace
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
