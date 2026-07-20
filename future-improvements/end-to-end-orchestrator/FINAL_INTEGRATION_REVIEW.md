# Final Integration Review

Proposed section to add to the `end-to-end-orchestrator` skill after the implementation loop and before the final summary:

```md
## Final Integration Review
Spawn a new `code-reviewer` to conduct one final holistic integration review of the completed implementation against the original task and full implementation plan. Request changes only for material correctness, security, regression, integration, or requirement-completeness issues supported by concrete reasoning or evidence. Treat stylistic improvements, speculative concerns, and optional refactoring as non-blocking notes and do not implement them.

If the reviewer returns `CHANGES_REQUESTED`, spawn a new `code-implementer` to apply only the required fixes and validate them, then resume the same reviewer for a focused re-review. Repeat until the reviewer returns `APPROVED`, or stop and report a blocker if the loop becomes stuck. Do not initiate another unrestricted holistic review. Once approved, proceed to the [Final Summary](#final-summary).
```

When adopting this section, also update the end of the **Implement and Review Code loop** so that it proceeds to **Final Integration Review** rather than directly to **Final Summary**.
