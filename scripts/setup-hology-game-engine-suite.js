#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const repositoryDir = path.resolve(__dirname, '..');
const testSourceDir = path.join(repositoryDir, 'test', 'hology-game-engine-test');
const skillSourceCandidates = [
  path.join(repositoryDir, 'skills', 'hology-game-engine'),
  path.join(repositoryDir, 'in-progress', 'skills', 'hology-game-engine'),
];

function askForTargetFolder() {
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    const ask = () => {
      input.question('Folder in which to set up the Hology test suite: ', (answer) => {
        const folder = answer.trim();
        if (!folder) {
          console.log('Please enter a folder path.');
          ask();
          return;
        }

        input.close();
        resolve(folder);
      });
    };

    ask();
  });
}

function assertSourceDirectory(source) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Source folder not found: ${source}`);
  }
}

function findSkillSourceDirectory() {
  const source = skillSourceCandidates.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
  );
  if (!source) {
    throw new Error(
      `Hology skill folder not found. Checked: ${skillSourceCandidates.join(', ')}`
    );
  }
  return source;
}

function copyFile(source, destination) {
  if (path.resolve(source) === path.resolve(destination)) return;
  fs.copyFileSync(source, destination);
}

function copySkill(skillSourceDir, targetRoot, harnessDirectory) {
  const destination = path.join(
    targetRoot,
    harnessDirectory,
    'skills',
    'hology-game-engine'
  );
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(skillSourceDir, destination, { recursive: true });
  return destination;
}

function setupTestFolder(configuredTarget) {
  assertSourceDirectory(testSourceDir);
  const skillSourceDir = findSkillSourceDirectory();

  const targetRoot = path.resolve(process.cwd(), configuredTarget);
  if (fs.existsSync(targetRoot) && !fs.statSync(targetRoot).isDirectory()) {
    throw new Error(`Target is not a folder: ${targetRoot}`);
  }
  fs.mkdirSync(targetRoot, { recursive: true });

  const testFiles = fs.readdirSync(testSourceDir, { withFileTypes: true }).filter(
    (entry) =>
      entry.isFile() &&
      (entry.name === 'README.md' || /^\d{2}_.+\.md$/.test(entry.name))
  );
  for (const testFile of testFiles) {
    copyFile(path.join(testSourceDir, testFile.name), path.join(targetRoot, testFile.name));
  }

  copyFile(
    path.join(testSourceDir, 'hology-game-engine-test-prompt.md'),
    path.join(targetRoot, 'hology-game-engine-test-prompt.md')
  );

  const agentsExample = path.join(testSourceDir, 'AGENTS.md.example');
  copyFile(agentsExample, path.join(targetRoot, 'AGENTS.md'));
  copyFile(agentsExample, path.join(targetRoot, 'CLAUDE.md'));

  const agentsSkill = copySkill(skillSourceDir, targetRoot, '.agents');
  const claudeSkill = copySkill(skillSourceDir, targetRoot, '.claude');

  console.log(`\nHology game engine test suite set up in: ${targetRoot}`);
  console.log(`  copied ${testFiles.length} test suite files`);
  console.log(`  copied skill to ${agentsSkill}`);
  console.log(`  copied skill to ${claudeSkill}`);
  console.warn(
    '\nWARNING: If you use another agent harness, manually copy the hology-game-engine skill into that harness\'s proper skill folder.'
  );
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error('This script does not accept arguments; enter the target folder when prompted.');
  }

  const target = await askForTargetFolder();
  setupTestFolder(target);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
