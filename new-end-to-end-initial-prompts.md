I want to create a new skill (and multiple new agents). It is a more detailed version of `end-to-end-orchestrator`.
The new skill should be similar to `end-to-end-orchestrator` in terms of flow and idea, but I want the planning part to be split up more.
Most of the questions I get from the task-planner agent when using this skill are behaviourial questions, but I also want to discuss/plan technical details.

My idea was to split up the planning part into four parts:
1. Research codebase or existing solutions - This is purely research, no decisions are made here.
2. Behavioural plan - Gherkin format - Purely behavioural decisions, no technical decisions.
3. Architecture plan - Architectural decisions (optionally evaluated by the main orchestrator if this should be used) - Frameworks to select, tools / libraries to use, repo format (if applicable) and other architectual decisions.
4. Implementation plan - Technical decisions that doesn't fit into the architecture plan.

Research (1) is based on a mix of the codebase and the initial prompt given.
Behavioural (2) is based on research phase output, the feature request (or prompt rather)
Architecture (3) is a mix of research phase output and the Behavioural plan to try and see if
Implementation plan (4) is a using the output of 1,2 and 3 but creating the actual implementation plan for the next phase in end-to-end-orchestrator.
There should be a hard gate in each phase that we cannot continue wihtout the necessary documents from prior phases. Except the optional Architectural document.

For phases 2, 3 and 4 there should be a brainstorm sessions (ala Matt Pocock `grill-me` skill). You can see wording examples of this in task-planner.txt and `create-implementation-plan`.
Followed by output documents code-base.md, gherkin.md, architectural.md and implementation-plan.md. These should be added to a `tasks\xxxxx-<generated_task_name>\` folder "xxxxx" being an incremental number.
Ideally committing each file between each step - in case the workflow will be interrupted.
Maybe create a prompt.md initially that is quite literally the initial prompt verbatim from the human - Let me know what you think of this.

To avoid the main session getting filled up with context, I'd suggest new code-researcher, gherkin-planner, architect-planner and code-planner subagents with the same approach/style as the existing task-planner agent. However, remember the actual context of each individual subagent. I don't want four task-planner copies - Only copy the approach/style.
In terms of code-planner output you can be inspired by the task-planner step 8 - This sentence has been.

One issues I have with the existing task-planner is that it splits the implementation plan up into too many phases. The INVEST from Agile Software Development should be encouraged (look it up if necessary).

Once these four phases are done the typical code-implementer --> code-reviewer step by step (or phase by phase really) from the existing `end-to-end-orchestrator` should be done, based on the generated implementation-plan.md.
Different from the original end-to-end-orchestrator I want changes committed after each implementation phase has been approved by the code-reviewer.

Ideally we should be able to start up in any spot of the workflow without having to start over. Could be the orchestrators job, but some checkboxes in the implementation plan that gets updated during implementation is probably ideal.

A git-committer agent could be an idea to avoid using main agent/orchestrator context for all the commit work.
No commit should be pushed. This is the humans job.
git-committer should only be committing locally.

If you need to create skills (I don't necessarily think so as it's more agent based really), make sure to invoke the `create-skill` skill (if implementer subagent doesn't support it then pass it as part of the prompt).
The overall skill should be called `end-to-end-orchestrator-detailed` - unless you have a better named.

