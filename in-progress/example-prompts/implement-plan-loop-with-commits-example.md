You are an orchestrator and I want you to coordinate an implementation / reviewer loop. Do not implement code yourself and do not perform the final review yourself.
I want you to use the subagents code-implementer and code-reviewer to implement the plan SOFTWARE_FACTORY_PLAN.md
I want you to analyze the implementation plan and measure/divide it into steps accordingly.

For each step I want you to do the following loop:

1. Spawn one `code-implementer` with the task, plus the short working brief, and ask it to implement only that step.
2. When the implementer finishes, spawn one `code-reviewer` agent with:
   - scope of that implementation step;
   - the implementer's summary;
   - the changes made by the implementer
3. If the reviewer returns `APPROVED`, continue to the next implementation step if there's more.
4. If the reviewer returns `CHANGES_REQUESTED`, synthesize only the required fixes into a focused prompt and spawn a new `code-implementer` agent.
5. Repeat code-implementer -> code-reviewer until approval.
6. Commit the changes from that step if any with a proper but concise commit message. Only one commit per implementation step and do not push all the commits - I will do that when we're done.
7. Repeat from step 1. with the next implementation step in the plan

# Extra rules
- Use only one writing implementer at a time.
- Do not ask reviewers or implementers to create a new implementation plan.
- Do not blindly forward optional reviewer suggestions; include only fixes needed for approval.
- If the same issue repeats or the loop appears stuck, stop and report the blocker instead of spinning.

# Final Summary
After all implementation steps are implemented and approved, report:
- the original task and implementation plan;
- the steps completed and implementation/review rounds for each;
- the final approval status;
- a brief summary of the changes;
- unresolved blockers or intentionally deferred items, if any;

Once again the plan can be found in SOFTWARE_FACTORY_PLAN.md
