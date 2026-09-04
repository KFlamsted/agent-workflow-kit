---
name: code-researcher
package:
description: Researches the codebase and existing solutions for a task and writes code-base.md. Use for the research phase of end-to-end-orchestrator-detailed. Makes no product or architecture decisions.
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
