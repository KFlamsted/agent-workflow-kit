---
name: review-findings-to-plan
description: Explicitly invoked workflow for discussing review findings one by one and converting agreed fixes into an implementation plan.
---

# Review Findings To Plan

Discuss findings first. Do not change code.

## Input
- A list of review findings, usually from a prior review session.

## Process
1. Take findings one at a time.
2. For each finding, explain the issue, potential tradeoffs and recommended solution concisely.
3. Wait for the user's response before moving to the next finding.
4. Track the agreed outcome for each finding.
5. After all findings are discussed, create a concrete implementation plan.

## Output
- Write the plan to `PLAN.md`.
- If `PLAN.md` already exists, use a non-overwriting name.
- Include agreed decisions, affected files, implementation steps, and tests.
- Make sure the plan is detailed enough so it will be implemented with consistency and quality without further questions.
