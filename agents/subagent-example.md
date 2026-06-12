---
name: <INSERT AGENT_NAME>
# Optional: registers this as code-analysis.scout while preserving name: scout
package: code-analysis
description: Fast codebase recon
tools: read, grep, find, ls, bash
extensions:
model: claude-haiku-4-5
fallbackModels: openai/gpt-5-mini, anthropic/claude-sonnet-4
thinking: high
systemPromptMode: append
inheritProjectContext: true
inheritSkills: true
skills: safe-bash, chrome-devtools
output: context.md
defaultReads: context.md
defaultProgress: true
completionGuard: false
interactive: true
maxSubagentDepth: 1
maxExecutionTimeMs: 600000
maxTokens: 150000
---

Your system prompt goes here.