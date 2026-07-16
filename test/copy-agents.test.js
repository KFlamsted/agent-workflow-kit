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

  fs.copyFileSync(
    path.join(repositoryDir, 'copy-skills.js'),
    path.join(sandbox, 'copy-skills.js')
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
  };
  const envPath = path.join(sandbox, '.env');
  fs.writeFileSync(
    envPath,
    [
      `PI_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.pi])}`,
      `CODEX_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.codex])}`,
      `CLAUDE_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.claude])}`,
      `OPENCODE_AGENTS_TARGET_FOLDER=${JSON.stringify([targets.opencode])}`,
      '',
    ].join('\n')
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(sandbox, 'copy-skills.js'),
      '--pi-agents',
      '--codex-agents',
      '--claude-agents',
      '--opencode-agents',
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

  const codexOutput = fs.readFileSync(
    path.join(targets.codex, 'code-implementer.toml'),
    'utf8'
  );
  const codexInstructions = `developer_instructions = '''\n${implementerPrompt}'''\n`;
  assert.ok(codexOutput.endsWith(codexInstructions));
  assert.equal(countOccurrences(codexOutput, 'developer_instructions ='), 1);

  for (const agentName of ['code-implementer', 'code-reviewer']) {
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
  }

  assert.equal(fs.readFileSync(opencodeSourcePath, 'utf8'), opencodeSource);
  assert.equal(fs.readFileSync(unmatchedSourcePath, 'utf8'), unmatchedSource);
  for (const sourcePath of [
    path.join(sandbox, 'agents', 'claude', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'claude', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'opencode', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'opencode', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'pi', 'code-implementer', 'code-implementer.md'),
    path.join(sandbox, 'agents', 'pi', 'code-reviewer', 'code-reviewer.md'),
    path.join(sandbox, 'agents', 'codex', 'code-implementer.toml'),
    path.join(sandbox, 'agents', 'codex', 'code-reviewer.toml'),
  ]) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.equal(source.includes('# Code Implementer'), false);
    assert.equal(source.includes('# Code Reviewer'), false);
    assert.equal(source.includes('developer_instructions ='), false);
  }
});
