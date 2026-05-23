#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const scriptDir = __dirname;
const envPath = path.resolve(process.argv[2] || path.join(scriptDir, '.env'));
const skillsDir = path.join(scriptDir, 'skills');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`.env file not found: ${filePath}`);
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function parseTargetFolders(value) {
  if (!value) return [];

  // Preferred format: SKILL_TARGET_FOLDERS=["/path/one", "/path/two"]
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch (_) {
    // Fall back to comma/newline/semicolon separated values below.
  }

  return value
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveTargetFolder(folder, baseDir) {
  let resolved = folder;

  if (resolved === '~') {
    resolved = os.homedir();
  } else if (resolved.startsWith(`~${path.sep}`) || resolved.startsWith('~/')) {
    resolved = path.join(os.homedir(), resolved.slice(2));
  }

  return path.resolve(baseDir, resolved);
}

function copySkill(skillPath, targetRoot) {
  const skillName = path.basename(skillPath);
  const destination = path.join(targetRoot, skillName);

  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(skillPath, destination, { recursive: true, force: true });

  return destination;
}

function main() {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    throw new Error(`Skills folder not found: ${skillsDir}`);
  }

  const env = readEnvFile(envPath);
  const targetFolders = parseTargetFolders(env.SKILL_TARGET_FOLDERS);

  if (targetFolders.length === 0) {
    throw new Error('No target folders configured. Set SKILL_TARGET_FOLDERS in the .env file.');
  }

  const envDir = path.dirname(envPath);
  const skills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => path.join(skillsDir, entry.name));

  if (skills.length === 0) {
    console.log(`No skills found in ${skillsDir}`);
    return;
  }

  for (const configuredTarget of targetFolders) {
    const targetRoot = resolveTargetFolder(configuredTarget, envDir);
    fs.mkdirSync(targetRoot, { recursive: true });

    console.log(`\nCopying skills to: ${targetRoot}`);
    for (const skillPath of skills) {
      const destination = copySkill(skillPath, targetRoot);
      console.log(`  copied ${path.basename(skillPath)} -> ${destination}`);
    }
  }

  console.log('\nDone.');
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
