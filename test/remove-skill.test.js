'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repositoryDir = path.resolve(__dirname, '..');

function makeSandbox(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'remove-skill-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  fs.mkdirSync(path.join(sandbox, 'scripts'));
  fs.mkdirSync(path.join(sandbox, 'skills', 'sample'), { recursive: true });
  fs.copyFileSync(path.join(repositoryDir, 'scripts', 'remove.js'), path.join(sandbox, 'scripts', 'remove.js'));
  fs.writeFileSync(path.join(sandbox, 'skills', 'sample', 'SKILL.md'), '# Sample\n');
  fs.writeFileSync(path.join(sandbox, 'skills', 'sample', 'extra.txt'), 'extra\n');
  return sandbox;
}

test('archives a skill and skips targets on N', (t) => {
  const sandbox = makeSandbox(t);
  const result = spawnSync(process.execPath, [path.join(sandbox, 'scripts', 'remove.js'), 'skill', 'sample'], {
    encoding: 'utf8', input: 'N\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(sandbox, 'skills', 'sample')), false);
  assert.equal(fs.readFileSync(path.join(sandbox, '.legacy-skills', 'sample', 'extra.txt'), 'utf8'), 'extra\n');
  assert.match(result.stdout, /Do you want to remove the skills from all of your skill folder\? \[Y\/N\]/);
});

test('removes installed copies from sandbox targets on Y', (t) => {
  const sandbox = makeSandbox(t);
  const presentTarget = path.join(sandbox, 'targets', 'one');
  const absentTarget = path.join(sandbox, 'targets', 'two');
  fs.mkdirSync(path.join(presentTarget, 'sample'), { recursive: true });
  fs.writeFileSync(path.join(presentTarget, 'sample', 'installed.txt'), 'installed');
  const envPath = path.join(sandbox, 'test.env');
  fs.writeFileSync(envPath, `SKILL_TARGET_FOLDERS=${JSON.stringify([presentTarget, absentTarget])}\n`);

  const result = spawnSync(process.execPath, [path.join(sandbox, 'scripts', 'remove.js'), 'skill', 'sample', '--env', envPath], {
    encoding: 'utf8', input: 'Y\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(presentTarget, 'sample')), false);
  assert.equal(fs.existsSync(absentTarget), false);
});

test('does not overwrite an existing legacy folder', (t) => {
  const sandbox = makeSandbox(t);
  fs.mkdirSync(path.join(sandbox, '.legacy-skills', 'sample'), { recursive: true });
  const result = spawnSync(process.execPath, [path.join(sandbox, 'scripts', 'remove.js'), 'skill', 'sample'], {
    encoding: 'utf8', input: 'N\n',
  });
  assert.equal(result.status, 1);
  assert.equal(fs.existsSync(path.join(sandbox, 'skills', 'sample', 'SKILL.md')), true);
  assert.match(result.stderr, /Legacy destination already exists/);
});
