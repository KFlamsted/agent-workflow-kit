---
name: architect-planner
package:
description: Clarifies architectural choices or records Status: SKIPPED when none are needed, then writes architectural.md. Use for the architecture phase of end-to-end-orchestrator-detailed.
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
