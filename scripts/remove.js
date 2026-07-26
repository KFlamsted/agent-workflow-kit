#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const repositoryDir = path.resolve(__dirname, '..');

// Removal methods are deliberately dispatched by name so other repository
// entry types can be added without changing the command-line plumbing.
const removeMethods = {
  skill: removeSkill,
};

function parseArgs(args) {
  let method;
  let name;
  let envFile;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') continue;

    if (arg === '--env') {
      envFile = args[++index];
      if (!envFile) throw new Error('Missing value for --env');
    } else if (arg.startsWith('--env=')) {
      envFile = arg.slice('--env='.length);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!method) {
      method = arg;
    } else if (!name) {
      name = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }

  if (!method || !removeMethods[method]) {
    throw new Error(`Unknown or missing remove method: ${method || '(none)'}`);
  }
  if (!name) throw new Error(`Missing name for remove method: ${method}`);

  return { method, name, envFile };
}

function validateEntryName(name) {
  if (name === '.' || name === '..' || path.basename(name) !== name || /[\\/]/.test(name)) {
    throw new Error(`Invalid entry name: ${name}`);
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`.env file not found: ${filePath}`);

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch (_) {
    // Accept the same relaxed list format as scripts/copy-skills.js.
  }
  let list = value.trim();
  if (list.startsWith('[') && list.endsWith(']')) list = list.slice(1, -1);
  return list.split(/[;,\n]/).map((item) => item.trim()).map((item) => {
    if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
      return item.slice(1, -1);
    }
    return item;
  }).filter(Boolean);
}

function resolveTargetFolder(folder, baseDir) {
  let expanded = folder;
  if (/^%USERPROFILE%($|[\\/])/.test(expanded.toUpperCase())) {
    const profile = process.env.USERPROFILE ||
      (process.env.HOMEDRIVE && process.env.HOMEPATH
        ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
        : undefined);
    if (!profile) throw new Error('%USERPROFILE% is used but USERPROFILE is not set');
    expanded = `${profile}${expanded.slice('%USERPROFILE%'.length)}`;
  }
  if (expanded === '~') expanded = os.homedir();
  else if (expanded.startsWith('~/') || expanded.startsWith('~\\')) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }
  if (/^[A-Za-z]:[\\/]/.test(expanded)) return path.win32.normalize(expanded);
  return path.resolve(baseDir, expanded);
}

function moveDirectory(source, destination) {
  try {
    fs.renameSync(source, destination);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    try {
      fs.cpSync(source, destination, { recursive: true, errorOnExist: true, force: false });
    } catch (copyError) {
      // The destination was known not to exist before this operation, so only
      // a partial copy created by this attempt can be removed here.
      fs.rmSync(destination, { recursive: true, force: true });
      throw copyError;
    }
    fs.rmSync(source, { recursive: true });
  }
}

function askToRemoveTargets() {
  const prompt = 'Do you want to remove the skills from all of your skill folder? [Y/N]';
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    input.question(prompt, (answer) => {
      input.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function removeSkill(name, options) {
  validateEntryName(name);
  const source = path.join(repositoryDir, 'skills', name);
  const sourceExists = fs.existsSync(source);
  if (sourceExists && !fs.lstatSync(source).isDirectory()) {
    throw new Error(`Local skill folder not found: ${source}`);
  }

  if (sourceExists) {
    const legacyRoot = path.join(repositoryDir, '.legacy-skills');
    const destination = path.join(legacyRoot, name);
    if (fs.existsSync(destination)) {
      throw new Error(`Legacy destination already exists: ${destination}`);
    }
    fs.mkdirSync(legacyRoot, { recursive: true });
    moveDirectory(source, destination);
    console.log(`Moved local skill to ${destination}`);
  } else {
    console.log(`Local skill folder not found; continuing with configured targets: ${source}`);
  }

  if (!(await askToRemoveTargets())) {
    console.log('Skipped configured skill target folders.');
    return;
  }

  const envPath = path.resolve(options.envFile || path.join(repositoryDir, '.env'));
  const env = readEnvFile(envPath);
  const targets = parseTargetFolders(env.SKILL_TARGET_FOLDERS);
  if (targets.length === 0) {
    console.log('No target folders configured in SKILL_TARGET_FOLDERS.');
    return;
  }

  for (const configuredTarget of targets) {
    const targetRoot = resolveTargetFolder(configuredTarget, path.dirname(envPath));
    const targetSkill = path.join(targetRoot, name);
    if (!fs.existsSync(targetSkill)) {
      console.log(`Skill not found in target; skipped: ${targetSkill}`);
      continue;
    }
    const stat = fs.lstatSync(targetSkill);
    if (!stat.isDirectory() && !stat.isSymbolicLink()) {
      throw new Error(`Refusing to remove non-folder target: ${targetSkill}`);
    }
    fs.rmSync(targetSkill, { recursive: true, force: false });
    console.log(`Removed target skill: ${targetSkill}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await removeMethods[options.method](options.name, options);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
