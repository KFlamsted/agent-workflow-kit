---
name: improve-human-review
description: Guide a human through reviewing a specification or implementation plan in clear, meaningful chunks without reviewing or editing the document for them.
disable-model-invocation: true
---

# Improve Human Review

Help the human review the document. Do not approve, reject, or edit it for them.

## Process

1. Read the complete document before presenting conclusions.
2. Create a review map of coherent chunks based on meaning, dependencies, and decisions—not arbitrary length. Show the map and review order.
3. Review one chunk at a time. For each:
   - cite its headings or line range;
   - restate it in concise, plain technical language without losing requirements, constraints, tradeoffs, dependencies, risks, or unresolved questions;
   - separate document content from your explanation;
   - optionally use a faithful table or Mermaid diagram when it reduces reading effort;
   - mention only clear omissions or edge cases, labelled `Possible gap`.
4. Ask the human to `Approve`, `Request changes`, `Discuss`, or `Skip`. Wait before continuing.
5. Record the human's decision and notes. Never treat silence or moving on as approval.
6. Continue until every chunk has an explicit status.
7. Finish with a review record containing each chunk, its status, requested changes, open questions, and possible gaps.

## Rules

- Preserve the document's meaning. Never simplify away qualifying language or invent intent.
- Keep summaries readable, but include enough context for an informed decision.
- Do not replace the source with the summary; let the human inspect the cited source when needed.
- Do not perform an independent document review or make the approval decision.
- Do not edit the source document. Record requested changes only.
- If chunks depend on each other, surface the dependency and revisit earlier approval when later decisions affect it.
- Adapt chunk size when the human asks for more or less detail.
