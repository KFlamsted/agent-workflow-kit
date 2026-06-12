---
name: <INSERT_AGENT_NAME>
# Optional: registers this as <PACKAGE_NAME>.<INSERT_AGENT_NAME> while preserving name: <INSERT_AGENT_NAME>
package: <PACKAGE_NAME>
description: Fast codebase recon
tools: read, write, edit, grep, find, ls, bash
extensions:
model: gpt-5.5
fallbackModels: gpt-5.5-mini
thinking: medium
systemPromptMode: append
inheritProjectContext: true
inheritSkills: true
skills: 
output: context.md
defaultReads: context.md
defaultProgress: true
completionGuard: false
interactive: true
maxSubagentDepth: 1
# 30 minutes
maxExecutionTimeMs: 1800000
maxTokens: 270000
---

Your system prompt goes here.