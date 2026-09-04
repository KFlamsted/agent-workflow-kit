---
name: gherkin-planner
package:
description: Clarifies behavioural requirements and writes a Gherkin behaviour spec. Use for the behaviour phase of end-to-end-orchestrator-detailed. Does not make technical or architecture decisions.
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
