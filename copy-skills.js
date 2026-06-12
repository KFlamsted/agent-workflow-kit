#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const scriptDir = __dirname;

const copyModes = {
  skills: {
    sourceFolderName: 'skills',
    targetEnvKey: 'SKILL_TARGET_FOLDERS',
    label: 'skills',
  },
  agents: {
    sourceFolderName: 'agents',
    targetEnvKey: 'AGENTS_TARGET_FOLDER',
    label: 'agents',
  },
};

function parseArgs(args) {
  let mode = 'skills';
  let envFile;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--skills' || arg === 'skills') {
      mode = 'skills';
      continue;
    }

    if (arg === '--agents' || arg === 'agents') {
      mode = 'agents';
      continue;
    }

    if (arg === '--env') {
      index += 1;
      if (!args[index]) {
        throw new Error('Missing value for --env');
      }
      envFile = args[index];
      continue;
    }

    if (arg.startsWith('--env=')) {
      envFile = arg.slice('--env='.length);
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (envFile) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    envFile = arg;
  }

  return { mode, envFile };
}

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

  // Preferred format: TARGET_ENV_KEY=["/path/one", "/path/two"]
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch (_) {
    // Fall back to comma/newline/semicolon separated values below.
  }

  let fallbackValue = value.trim();
  if (fallbackValue.startsWith('[') && fallbackValue.endsWith(']')) {
    fallbackValue = fallbackValue.slice(1, -1);
  }

  // This also accepts Windows paths written as ["C:\Users\me\.codex\skills"],
  // which is common in .env files but is not valid JSON because backslashes
  // are not escaped.
  const unquote = (item) => {
    if (
      (item.startsWith('"') && item.endsWith('"')) ||
      (item.startsWith("'") && item.endsWith("'"))
    ) {
      return item.slice(1, -1);
    }

    return item;
  };

  return fallbackValue
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .map(unquote)
    .filter(Boolean);
}

function getUserProfile() {
  if (process.env.USERPROFILE) {
    return process.env.USERPROFILE;
  }

  if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
    return `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`;
  }

  throw new Error('%USERPROFILE% is used in a target folder list but USERPROFILE is not set');
}

function expandWindowsEnvironmentVariables(folder) {
  if (/^%USERPROFILE%($|[\\/])/.test(folder.toUpperCase())) {
    return `${getUserProfile()}${folder.slice('%USERPROFILE%'.length)}`;
  }

  return folder;
}

function isWindowsDriveAbsolute(folder) {
  return /^[A-Za-z]:[\\/]/.test(folder);
}

function resolveTargetFolder(folder, baseDir) {
  let resolved = expandWindowsEnvironmentVariables(folder);

  if (resolved === '~') {
    resolved = os.homedir();
  } else if (resolved.startsWith('~/') || resolved.startsWith('~\\')) {
    resolved = path.join(os.homedir(), resolved.slice(2));
  }

  if (isWindowsDriveAbsolute(resolved)) {
    return path.win32.normalize(resolved);
  }

  return path.resolve(baseDir, resolved);
}

function copyFolder(folderPath, targetRoot) {
  const folderName = path.basename(folderPath);
  const destination = path.join(targetRoot, folderName);

  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(folderPath, destination, { recursive: true, force: true });

  return destination;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(options.envFile || path.join(scriptDir, '.env'));
  const copyMode = copyModes[options.mode];
  const sourceDir = path.join(scriptDir, copyMode.sourceFolderName);

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`${copyMode.label} folder not found: ${sourceDir}`);
  }

  const env = readEnvFile(envPath);
  const targetFolders = parseTargetFolders(env[copyMode.targetEnvKey]);

  if (targetFolders.length === 0) {
    throw new Error(
      `No target folders configured. Set ${copyMode.targetEnvKey} in the .env file.`
    );
  }

  const envDir = path.dirname(envPath);
  const folders = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(sourceDir, entry.name));

  if (folders.length === 0) {
    console.log(`No ${copyMode.label} found in ${sourceDir}`);
    return;
  }

  for (const configuredTarget of targetFolders) {
    const targetRoot = resolveTargetFolder(configuredTarget, envDir);
    fs.mkdirSync(targetRoot, { recursive: true });

    console.log(`\nCopying ${copyMode.label} to: ${targetRoot}`);
    for (const folderPath of folders) {
      const destination = copyFolder(folderPath, targetRoot);
      console.log(`  copied ${path.basename(folderPath)} -> ${destination}`);
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
