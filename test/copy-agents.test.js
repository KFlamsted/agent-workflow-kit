'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryDir = path.resolve(__dirname, '..');

function countOccurrences(content, value) {
  return content.split(value).length - 1;
}

test('copy-agents injects matching prompts into copied harness configurations', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-agents-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  fs.mkdirSync(path.join(sandbox, 'scripts'));
  fs.copyFileSync(
    path.join(repositoryDir, 'scripts', 'copy-skills.js'),
    path.join(sandbox, 'scripts', 'copy-skills.js')
  );
  fs.cpSync(path.join(repositoryDir, 'agents'), path.join(sandbox, 'agents'), {
    recursive: true,
  });

  const unmatchedSource = '---\nname: unmatched\n---\n';
  const unmatchedSourcePath = path.join(
    sandbox,
    'agents',
    'opencode',
    'unmatched.md'
  );
  fs.writeFileSync(unmatchedSourcePath, unmatchedSource);

  const targets = {
    pi: path.join(sandbox, 'targets', 'pi'),
    codex: path.join(sandbox, 'targets', 'codex'),
    claude: path.join(sandbox, 'targets', 'claude'),
    opencode: path.join(sandbox, 'targets', 'opencode'),
    copilot: path.join(sandbox, 'targets', 'copilot'),
    cursor: path.join(sandbox, 'targets', 'cursor'),
  };
  const envPath = path.join(sandbox, '.env');
  fs.writeFileSync(
    envPath,
    [
      `PI_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.pi])}`,
      `CODEX_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.codex])}`,
      `CLAUDE_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.claude])}`,
      `OPENCODE_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.opencode])}`,
      `COPILOT_AGENTS_FOLDER=${JSON.stringify([targets.copilot])}`,
      `CURSOR_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.cursor])}`,
      '',
    ].join('\n')
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(sandbox, 'scripts', 'copy-skills.js'),
      '--pi-agents',
      '--codex-agents',
      '--claude-agents',
      '--opencode-agents',
      '--copilot-agents',
      '--cursor-agents',
      '--env',
      envPath,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);

  const implementerPrompt = fs.readFileSync(
    path.join(sandbox, 'agents', 'code-implementer.txt'),
    'utf8'
  );
  const opencodeSourcePath = path.join(
    sandbox,
    'agents',
    'opencode',
    'code-implementer.md'
  );
  const opencodeSource = fs.readFileSync(opencodeSourcePath, 'utf8');
  const opencodeOutput = fs.readFileSync(
    path.join(targets.opencode, 'code-implementer.md'),
    'utf8'
  );
  assert.ok(opencodeOutput.startsWith(opencodeSource));
  assert.ok(opencodeOutput.endsWith(implementerPrompt));
  assert.equal(countOccurrences(opencodeOutput, implementerPrompt), 1);

  const copilotSourcePath = path.join(
    sandbox,
    'agents',
    'copilot',
    'code-implementer.agent.md'
  );
  const copilotSource = fs.readFileSync(copilotSourcePath, 'utf8');
  const copilotOutput = fs.readFileSync(
    path.join(targets.copilot, 'code-implementer.agent.md'),
    'utf8'
  );
  assert.ok(copilotOutput.startsWith(copilotSource));
  assert.ok(copilotOutput.endsWith(implementerPrompt));
  assert.equal(countOccurrences(copilotOutput, implementerPrompt), 1);

  const plannerPrompt = fs.readFileSync(
    path.join(sandbox, 'agents', 'task-planner.txt'),
    'utf8'
  );
  const copilotPlannerSourcePath = path.join(
    sandbox,
    'agents',
    'copilot',
    'task-planner.agent.md'
  );
  const copilotPlannerSource = fs.readFileSync(copilotPlannerSourcePath, 'utf8');
  const copilotPlannerOutput = fs.readFileSync(
    path.join(targets.copilot, 'task-planner.agent.md'),
    'utf8'
  );
  assert.ok(copilotPlannerOutput.startsWith(copilotPlannerSource));
  assert.ok(copilotPlannerOutput.endsWith(plannerPrompt));
  assert.equal(countOccurrences(copilotPlannerOutput, plannerPrompt), 1);
  assert.match(copilotPlannerOutput, /NEEDS_CLARIFICATION/);

  for (const harness of ['claude', 'opencode', 'cursor']) {
    const sourcePath = path.join(
      sandbox,
      'agents',
      harness,
      'task-planner.md'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');
    const output = fs.readFileSync(
      path.join(targets[harness], 'task-planner.md'),
      'utf8'
    );
    assert.ok(output.startsWith(source));
    assert.ok(output.endsWith(plannerPrompt));
    assert.equal(countOccurrences(output, plannerPrompt), 1);
  }

  const cursorImplementerSourcePath = path.join(
    sandbox,
    'agents',
    'cursor',
    'code-implementer.md'
  );
  const cursorImplementerSource = fs.readFileSync(cursorImplementerSourcePath, 'utf8');
  const cursorImplementerOutput = fs.readFileSync(
    path.join(targets.cursor, 'code-implementer.md'),
    'utf8'
  );
  assert.ok(cursorImplementerOutput.startsWith(cursorImplementerSource));
  assert.ok(cursorImplementerOutput.endsWith(implementerPrompt));
  assert.equal(countOccurrences(cursorImplementerOutput, implementerPrompt), 1);
  assert.match(cursorImplementerOutput, /composer-2\.5\[fast=false\]/);

  const cursorReviewerSourcePath = path.join(
    sandbox,
    'agents',
    'cursor',
    'code-reviewer.md'
  );
  const cursorReviewerSource = fs.readFileSync(cursorReviewerSourcePath, 'utf8');
  const reviewerPrompt = fs.readFileSync(
    path.join(sandbox, 'agents', 'code-reviewer.txt'),
    'utf8'
  );
  const cursorReviewerOutput = fs.readFileSync(
    path.join(targets.cursor, 'code-reviewer.md'),
    'utf8'
  );
  assert.ok(cursorReviewerOutput.startsWith(cursorReviewerSource));
  assert.ok(cursorReviewerOutput.endsWith(reviewerPrompt));
  assert.equal(countOccurrences(cursorReviewerOutput, reviewerPrompt), 1);
  assert.match(cursorReviewerOutput, /readonly: true/);
  assert.match(cursorReviewerOutput, /grok-4\.6\[effort=medium\]/);
  assert.match(
    fs.readFileSync(path.join(targets.cursor, 'task-planner.md'), 'utf8'),
    /grok-4\.6\[effort=medium\]/
  );

  const cleanSolidPrompt = fs.readFileSync(
    path.join(sandbox, 'agents', 'clean-solid-code-reviewer.txt'),
    'utf8'
  );
  const cursorCleanSolidSourcePath = path.join(
    sandbox,
    'agents',
    'cursor',
    'clean-solid-code-reviewer.md'
  );
  const cursorCleanSolidSource = fs.readFileSync(cursorCleanSolidSourcePath, 'utf8');
  const cursorCleanSolidOutput = fs.readFileSync(
    path.join(targets.cursor, 'clean-solid-code-reviewer.md'),
    'utf8'
  );
  assert.ok(cursorCleanSolidOutput.startsWith(cursorCleanSolidSource));
  assert.ok(cursorCleanSolidOutput.endsWith(cleanSolidPrompt));
  assert.equal(countOccurrences(cursorCleanSolidOutput, cleanSolidPrompt), 1);
  assert.match(cursorCleanSolidSource, /readonly: true/);
  assert.match(cursorCleanSolidSource, /grok-4\.6\[effort=medium\]/);
  assert.match(cursorCleanSolidSource, /name: clean-solid-code-reviewer/);
  assert.match(cursorCleanSolidSource, /Clean Code and SOLID/);
  assert.match(cursorCleanSolidSource, /Use after an implementation round/);

  for (const harness of ['claude', 'opencode']) {
    const sourcePath = path.join(
      sandbox,
      'agents',
      harness,
      'clean-solid-code-reviewer.md'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');
    const output = fs.readFileSync(
      path.join(targets[harness], 'clean-solid-code-reviewer.md'),
      'utf8'
    );
    assert.ok(output.startsWith(source));
    assert.ok(output.endsWith(cleanSolidPrompt));
    assert.equal(countOccurrences(output, cleanSolidPrompt), 1);
  }

  const claudeCleanSolidSource = fs.readFileSync(
    path.join(sandbox, 'agents', 'claude', 'clean-solid-code-reviewer.md'),
    'utf8'
  );
  assert.match(claudeCleanSolidSource, /tools: Read, Grep, Glob, Bash/);
  assert.match(claudeCleanSolidSource, /model: opus/);
  assert.match(claudeCleanSolidSource, /effort: high/);

  const copilotCleanSolidSourcePath = path.join(
    sandbox,
    'agents',
    'copilot',
    'clean-solid-code-reviewer.agent.md'
  );
  const copilotCleanSolidSource = fs.readFileSync(copilotCleanSolidSourcePath, 'utf8');
  const copilotCleanSolidOutput = fs.readFileSync(
    path.join(targets.copilot, 'clean-solid-code-reviewer.agent.md'),
    'utf8'
  );
  assert.ok(copilotCleanSolidOutput.startsWith(copilotCleanSolidSource));
  assert.ok(copilotCleanSolidOutput.endsWith(cleanSolidPrompt));
  assert.equal(countOccurrences(copilotCleanSolidOutput, cleanSolidPrompt), 1);
  assert.match(copilotCleanSolidSource, /model: claude-opus-5/);
  assert.match(copilotCleanSolidSource, /user-invocable: false/);
  assert.match(copilotCleanSolidSource, /disable-model-invocation: false/);
  assert.match(copilotCleanSolidSource, /tools: \[read, search, execute\]/);

  const codexCleanSolidSourcePath = path.join(
    sandbox,
    'agents',
    'codex',
    'clean-solid-code-reviewer.toml'
  );
  const codexCleanSolidSource = fs.readFileSync(codexCleanSolidSourcePath, 'utf8');
  const codexCleanSolidOutput = fs.readFileSync(
    path.join(targets.codex, 'clean-solid-code-reviewer.toml'),
    'utf8'
  );
  const codexCleanSolidInstructions = `developer_instructions = '''\n${cleanSolidPrompt}'''\n`;
  assert.ok(codexCleanSolidOutput.startsWith(codexCleanSolidSource));
  assert.ok(codexCleanSolidOutput.endsWith(codexCleanSolidInstructions));
  assert.equal(countOccurrences(codexCleanSolidOutput, 'developer_instructions ='), 1);
  assert.match(codexCleanSolidSource, /model = "gpt-5\.6-sol"/);
  assert.match(codexCleanSolidSource, /model_reasoning_effort = "medium"/);
  assert.match(codexCleanSolidSource, /sandbox_mode = "read-only"/);

  const opencodeCleanSolidSource = fs.readFileSync(
    path.join(sandbox, 'agents', 'opencode', 'clean-solid-code-reviewer.md'),
    'utf8'
  );
  assert.match(opencodeCleanSolidSource, /mode: subagent/);
  assert.match(opencodeCleanSolidSource, /openai\/gpt-5\.6-sol/);
  assert.match(opencodeCleanSolidSource, /variant: medium/);
  assert.match(opencodeCleanSolidSource, /edit: deny/);
  assert.match(opencodeCleanSolidSource, /task: deny/);
  assert.ok(!opencodeCleanSolidSource.match(/^name:/m));

  const piCleanSolidSource = fs.readFileSync(
    path.join(
      sandbox,
      'agents',
      'pi',
      'clean-solid-code-reviewer',
      'clean-solid-code-reviewer.md'
    ),
    'utf8'
  );
  assert.match(piCleanSolidSource, /thinking: medium/);
  assert.match(piCleanSolidSource, /systemPromptMode: append/);
  assert.match(piCleanSolidSource, /maxSubagentDepth: 1/);
  assert.match(piCleanSolidSource, /maxExecutionTimeMs: 3600000/);
  assert.match(piCleanSolidSource, /maxTokens: 270000/);

  const piPlannerSourcePath = path.join(
    sandbox,
    'agents',
    'pi',
    'task-planner',
    'task-planner.md'
  );
  const piPlannerSource = fs.readFileSync(piPlannerSourcePath, 'utf8');
  const piPlannerOutput = fs.readFileSync(
    path.join(targets.pi, 'task-planner', 'task-planner.md'),
    'utf8'
  );
  assert.ok(piPlannerOutput.startsWith(piPlannerSource));
  assert.ok(piPlannerOutput.endsWith(plannerPrompt));
  assert.equal(countOccurrences(piPlannerOutput, plannerPrompt), 1);

  const codexPlannerSourcePath = path.join(
    sandbox,
    'agents',
    'codex',
    'task-planner.toml'
  );
  const codexPlannerSource = fs.readFileSync(codexPlannerSourcePath, 'utf8');
  const codexPlannerOutput = fs.readFileSync(
    path.join(targets.codex, 'task-planner.toml'),
    'utf8'
  );
  const codexPlannerInstructions = `developer_instructions = '''\n${plannerPrompt}'''\n`;
  assert.ok(codexPlannerOutput.startsWith(codexPlannerSource));
  assert.ok(codexPlannerOutput.endsWith(codexPlannerInstructions));
  assert.equal(countOccurrences(codexPlannerOutput, 'developer_instructions ='), 1);

  const codexOutput = fs.readFileSync(
    path.join(targets.codex, 'code-implementer.toml'),
    'utf8'
  );
  const codexInstructions = `developer_instructions = '''\n${implementerPrompt}'''\n`;
  assert.ok(codexOutput.endsWith(codexInstructions));
  assert.equal(countOccurrences(codexOutput, 'developer_instructions ='), 1);

  for (const agentName of [
    'code-implementer',
    'code-reviewer',
    'clean-solid-code-reviewer',
  ]) {
    const piSource = fs.readFileSync(
      path.join(sandbox, 'agents', 'pi', agentName, `${agentName}.md`),
      'utf8'
    );
    const piOutput = fs.readFileSync(
      path.join(targets.pi, agentName, `${agentName}.md`),
      'utf8'
    );
    const prompt = fs.readFileSync(path.join(sandbox, 'agents', `${agentName}.txt`), 'utf8');

    assert.ok(piOutput.startsWith(piSource));
    assert.ok(piOutput.endsWith(prompt));
    assert.equal(countOccurrences(piOutput, prompt), 1);
  }
  assert.equal(
    fs.existsSync(
      path.join(targets.pi, 'code-implementation-loop-code-implementer')
    ),
    false
  );
  assert.equal(
    fs.existsSync(path.join(targets.pi, 'code-implementation-loop-code-reviewer')),
    false
  );

  assert.equal(
    fs.readFileSync(path.join(targets.opencode, 'unmatched.md'), 'utf8'),
    unmatchedSource
  );
  for (const target of Object.values(targets)) {
    assert.equal(fs.existsSync(path.join(target, 'code-implementer.txt')), false);
    assert.equal(fs.existsSync(path.join(target, 'code-reviewer.txt')), false);
    assert.equal(
      fs.existsSync(path.join(target, 'clean-solid-code-reviewer.txt')),
      false
    );
  }

  assert.equal(fs.readFileSync(opencodeSourcePath, 'utf8'), opencodeSource);
  assert.equal(fs.readFileSync(unmatchedSourcePath, 'utf8'), unmatchedSource);
  for (const sourcePath of [
    path.join(sandbox, 'agents', 'claude', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'claude', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'claude', 'task-planner.md'),
    path.join(sandbox, 'agents', 'opencode', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'opencode', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'opencode', 'task-planner.md'),
    path.join(sandbox, 'agents', 'copilot', 'code-implementer.agent.md'),
    path.join(sandbox, 'agents', 'copilot', 'code-reviewer.agent.md'),
    path.join(sandbox, 'agents', 'copilot', 'task-planner.agent.md'),
    path.join(sandbox, 'agents', 'cursor', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'cursor', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'cursor', 'task-planner.md'),
    path.join(sandbox, 'agents', 'pi', 'code-implementer', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'pi', 'code-reviewer', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'pi', 'task-planner', 'task-planner.md'),
    path.join(sandbox, 'agents', 'codex', 'code-implementer.toml'),
    path.join(sandbox, 'agents', 'codex', 'code-reviewer.toml'),
    path.join(sandbox, 'agents', 'codex', 'task-planner.toml'),
    path.join(sandbox, 'agents', 'claude', 'clean-solid-code-reviewer.md'),
    path.join(sandbox, 'agents', 'opencode', 'clean-solid-code-reviewer.md'),
    path.join(sandbox, 'agents', 'copilot', 'clean-solid-code-reviewer.agent.md'),
    path.join(sandbox, 'agents', 'cursor', 'clean-solid-code-reviewer.md'),
    path.join(
      sandbox,
      'agents',
      'pi',
      'clean-solid-code-reviewer',
      'clean-solid-code-reviewer.md'
    ),
    path.join(sandbox, 'agents', 'codex', 'clean-solid-code-reviewer.toml'),
  ]) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.equal(source.includes('# Code Implementer'), false);
    assert.equal(source.includes('# Code Reviewer'), false);
    assert.equal(source.includes('developer_instructions ='), false);
    assert.equal(source.includes('# Clean and SOLID code reviewer'), false);
    assert.equal(source.includes('Allowed principles'), false);
  }

  assert.match(cleanSolidPrompt, /# Clean and SOLID code reviewer/);
  assert.match(cleanSolidPrompt, /Single Responsibility/);
  assert.match(cleanSolidPrompt, /Open\/Closed/);
  assert.match(cleanSolidPrompt, /Liskov Substitution/);
  assert.match(cleanSolidPrompt, /Interface Segregation/);
  assert.match(cleanSolidPrompt, /Dependency Inversion/);
  assert.match(cleanSolidPrompt, /Meaningful Names/);
  assert.match(cleanSolidPrompt, /Functions/);
  assert.match(cleanSolidPrompt, /Comments/);
  assert.match(cleanSolidPrompt, /Formatting/);
  assert.match(cleanSolidPrompt, /Objects and Data Structures/);
  assert.match(cleanSolidPrompt, /Error Handling/);
  assert.match(cleanSolidPrompt, /Boundaries/);
  assert.match(cleanSolidPrompt, /Unit Tests/);
  assert.match(cleanSolidPrompt, /Classes/);
  assert.match(cleanSolidPrompt, /Principle:/);
  assert.match(cleanSolidPrompt, /Status: APPROVED \| CHANGES_REQUESTED/);
  assert.match(cleanSolidPrompt, /Out of scope/);
  assert.equal(
    cleanSolidPrompt.includes('correctness, bugs, and edge cases'),
    false
  );
});
