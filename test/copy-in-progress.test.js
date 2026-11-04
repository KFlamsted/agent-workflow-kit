'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryDir = path.resolve(__dirname, '..');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createSandbox(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-in-progress-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  fs.mkdirSync(path.join(sandbox, 'scripts'));
  fs.copyFileSync(
    path.join(repositoryDir, 'scripts', 'copy-skills.js'),
    path.join(sandbox, 'scripts', 'copy-skills.js')
  );

  const targets = {
    skills: path.join(sandbox, 'targets', 'skills'),
    claude: path.join(sandbox, 'targets', 'claude'),
  };
  const envPath = path.join(sandbox, '.env');
  write(
    envPath,
    [
      `SKILL_TARGET_FOLDERS=${JSON.stringify([targets.skills])}`,
      `CLAUDE_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.claude])}`,
      '',
    ].join('\n')
  );

  return { sandbox, targets, envPath };
}

function run(sandbox, envPath, args) {
  return spawnSync(
    process.execPath,
    [path.join(sandbox, 'scripts', 'copy-skills.js'), ...args, '--env', envPath],
    { encoding: 'utf8' }
  );
}

function writeSkills(sandbox) {
  write(path.join(sandbox, 'skills', 'released', 'SKILL.md'), 'released');
  write(path.join(sandbox, 'skills', 'shared', 'SKILL.md'), 'released shared');
  write(path.join(sandbox, 'in-progress', 'skills', 'wip', 'SKILL.md'), 'wip');
  write(path.join(sandbox, 'in-progress', 'skills', 'shared', 'SKILL.md'), 'wip shared');
}

test('copy-skills excludes in-progress skills without the flag', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  writeSkills(sandbox);

  const result = run(sandbox, envPath, ['--skills']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(targets.skills, 'released')));
  assert.equal(fs.existsSync(path.join(targets.skills, 'wip')), false);
  assert.equal(result.stderr, '');
});

test('copy-skills includes in-progress skills with the flag', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  writeSkills(sandbox);

  const result = run(sandbox, envPath, ['--skills', '--include-in-progress']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(targets.skills, 'released')));
  assert.equal(fs.readFileSync(path.join(targets.skills, 'wip', 'SKILL.md'), 'utf8'), 'wip');
  assert.match(result.stdout, /copied wip \(in-progress\) ->/);
});

test('copy-skills prefers the released skill on name collision and warns', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  writeSkills(sandbox);

  const result = run(sandbox, envPath, ['--skills', '--include-in-progress']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(targets.skills, 'shared', 'SKILL.md'), 'utf8'),
    'released shared'
  );
  assert.match(result.stderr, /skipping in-progress shared: released version exists/);
});

test('copy-agents injects in-progress prompts into in-progress agents', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  write(path.join(sandbox, 'agents', 'claude', 'released.md'), 'released agent\n');
  write(path.join(sandbox, 'agents', 'released.txt'), 'released prompt\n');
  write(path.join(sandbox, 'agents', 'both.txt'), 'released both prompt\n');
  write(path.join(sandbox, 'in-progress', 'agents', 'claude', 'wip.md'), 'wip agent\n');
  write(path.join(sandbox, 'in-progress', 'agents', 'claude', 'both.md'), 'wip both\n');
  write(path.join(sandbox, 'in-progress', 'agents', 'wip.txt'), 'wip prompt\n');
  write(path.join(sandbox, 'in-progress', 'agents', 'released.txt'), 'wip override\n');

  const result = run(sandbox, envPath, ['--claude-agents', '--include-in-progress']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(targets.claude, 'wip.md'), 'utf8'),
    'wip agent\n\nwip prompt\n'
  );
  assert.equal(
    fs.readFileSync(path.join(targets.claude, 'released.md'), 'utf8'),
    'released agent\n\nreleased prompt\n'
  );
  assert.equal(
    fs.readFileSync(path.join(targets.claude, 'both.md'), 'utf8'),
    'wip both\n\nreleased both prompt\n'
  );
  assert.equal(fs.existsSync(path.join(targets.claude, 'wip.txt')), false);
  assert.match(result.stderr, /skipping in-progress prompt released: released version exists/);
});

test('copy-agents ignores in-progress agents without the flag', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  write(path.join(sandbox, 'agents', 'claude', 'released.md'), 'released agent\n');
  write(path.join(sandbox, 'in-progress', 'agents', 'claude', 'wip.md'), 'wip agent\n');

  const result = run(sandbox, envPath, ['--claude-agents']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(targets.claude, 'wip.md')), false);
});

test('missing in-progress folders are skipped without error', (t) => {
  const { sandbox, targets, envPath } = createSandbox(t);
  write(path.join(sandbox, 'skills', 'released', 'SKILL.md'), 'released');
  write(path.join(sandbox, 'agents', 'claude', 'released.md'), 'released agent\n');
  write(path.join(sandbox, 'agents', 'released.txt'), 'released prompt\n');

  const result = run(sandbox, envPath, [
    '--skills',
    '--claude-agents',
    '--include-in-progress',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(targets.skills, 'released')));
  assert.ok(fs.existsSync(path.join(targets.claude, 'released.md')));
});

test('a missing released source folder still errors with the flag', (t) => {
  const { sandbox, envPath } = createSandbox(t);
  write(path.join(sandbox, 'in-progress', 'skills', 'wip', 'SKILL.md'), 'wip');

  const result = run(sandbox, envPath, ['--skills', '--include-in-progress']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /skills folder not found/);
});
