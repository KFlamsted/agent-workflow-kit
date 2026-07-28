'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryDir = path.resolve(__dirname, '..');
const scriptPath = path.join(repositoryDir, 'scripts', 'setup-hology-game-engine-suite.js');
const suiteSource = path.join(repositoryDir, 'test', 'hology-game-engine-test');
const skillSource = path.join(
  repositoryDir,
  'in-progress',
  'skills',
  'hology-game-engine'
);

function runSetup(cwd, target) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    input: `${target}\n`,
    encoding: 'utf8',
  });
}

function assertSetup(target, result) {
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Hology game engine test suite set up/);
  assert.match(result.stderr, /WARNING: If you use another agent harness/);

  const agentsExample = fs.readFileSync(path.join(suiteSource, 'AGENTS.md.example'), 'utf8');
  assert.equal(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8'), agentsExample);
  assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8'), agentsExample);
  assert.equal(
    fs.readFileSync(path.join(target, 'hology-game-engine-test-prompt.md'), 'utf8'),
    fs.readFileSync(path.join(suiteSource, 'hology-game-engine-test-prompt.md'), 'utf8')
  );

  for (const entry of fs.readdirSync(suiteSource, { withFileTypes: true })) {
    if (!entry.isFile() || !/^\d{2}_.+\.md$/.test(entry.name)) continue;
    assert.equal(
      fs.readFileSync(path.join(target, entry.name), 'utf8'),
      fs.readFileSync(path.join(suiteSource, entry.name), 'utf8')
    );
  }

  for (const harnessDirectory of ['.agents', '.claude']) {
    const copiedSkill = path.join(target, harnessDirectory, 'skills', 'hology-game-engine');
    assert.equal(
      fs.readFileSync(path.join(copiedSkill, 'SKILL.md'), 'utf8'),
      fs.readFileSync(path.join(skillSource, 'SKILL.md'), 'utf8')
    );
    assert.ok(fs.existsSync(path.join(copiedSkill, 'references', 'physics.md')));
    assert.ok(fs.existsSync(path.join(copiedSkill, 'templates', 'actor.ts')));
  }
}

test('interactive setup supports relative and absolute target folders', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'hology-test-setup-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const relativeTarget = path.join('targets', 'relative');
  const relativeResult = runSetup(sandbox, relativeTarget);
  assertSetup(path.join(sandbox, relativeTarget), relativeResult);

  const absoluteTarget = path.join(sandbox, 'targets', 'absolute');
  const absoluteResult = runSetup(sandbox, absoluteTarget);
  assertSetup(absoluteTarget, absoluteResult);
});

test('setup prefers the released skill folder over the in-progress fallback', (t) => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'hology-skill-source-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  fs.mkdirSync(path.join(sandbox, 'scripts'), { recursive: true });
  fs.copyFileSync(scriptPath, path.join(sandbox, 'scripts', path.basename(scriptPath)));

  const testSource = path.join(sandbox, 'test', 'hology-game-engine-test');
  fs.mkdirSync(testSource, { recursive: true });
  fs.writeFileSync(path.join(testSource, 'README.md'), '# Tests\n');
  fs.writeFileSync(path.join(testSource, '01_example.md'), '## Prompt\n\n> Test\n');
  fs.writeFileSync(path.join(testSource, 'AGENTS.md.example'), 'Use the skill.\n');
  fs.writeFileSync(path.join(testSource, 'hology-game-engine-test-prompt.md'), '# Run\n');

  const releasedSkill = path.join(sandbox, 'skills', 'hology-game-engine');
  const inProgressSkill = path.join(
    sandbox,
    'in-progress',
    'skills',
    'hology-game-engine'
  );
  fs.mkdirSync(releasedSkill, { recursive: true });
  fs.mkdirSync(inProgressSkill, { recursive: true });
  fs.writeFileSync(path.join(releasedSkill, 'SKILL.md'), 'released\n');
  fs.writeFileSync(path.join(inProgressSkill, 'SKILL.md'), 'in-progress\n');

  const target = path.join(sandbox, 'target');
  const result = spawnSync(
    process.execPath,
    [path.join(sandbox, 'scripts', path.basename(scriptPath))],
    { cwd: sandbox, input: `${target}\n`, encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(target, '.agents', 'skills', 'hology-game-engine', 'SKILL.md'), 'utf8'),
    'released\n'
  );
});
