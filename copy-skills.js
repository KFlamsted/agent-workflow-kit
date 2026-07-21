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
    entryType: 'directory',
  },
  piAgents: {
    sourcePath: ['agents', 'pi'],
    targetEnvKey: 'PI_AGENTS_TARGET_FOLDER',
    label: 'Pi agents',
    entryType: 'directory',
    injectPrompts: true,
  },
  codexAgents: {
    sourcePath: ['agents', 'codex'],
    targetEnvKey: 'CODEX_AGENTS_TARGET_FOLDER',
    label: 'codex agents',
    entryType: 'file',
    injectPrompts: true,
  },
  claudeAgents: {
    sourcePath: ['agents', 'claude'],
    targetEnvKey: 'CLAUDE_AGENTS_TARGET_FOLDER',
    label: 'claude agents',
    entryType: 'file',
    fileExtension: '.md',
    injectPrompts: true,
  },
  opencodeAgents: {
    sourcePath: ['agents', 'opencode'],
    targetEnvKey: 'OPENCODE_AGENTS_TARGET_FOLDER',
    label: 'OpenCode agents',
    entryType: 'file',
    fileExtension: '.md',
    injectPrompts: true,
  },
  copilotAgents: {
    sourcePath: ['agents', 'copilot'],
    targetEnvKey: 'COPILOT_AGENTS_FOLDER',
    label: 'Copilot agents',
    entryType: 'file',
    fileExtension: '.md',
    injectPrompts: true,
  },
};

function parseArgs(args) {
  const modes = [];
  let envFile;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--skills' || arg === 'skills') {
      modes.push('skills');
      continue;
    }

    if (
      arg === '--pi-agents' ||
      arg === 'pi-agents' ||
      arg === '--piAgents' ||
      arg === 'piAgents'
    ) {
      modes.push('piAgents');
      continue;
    }

    if (
      arg === '--codex-agents' ||
      arg === 'codex-agents' ||
      arg === '--codexAgents' ||
      arg === 'codexAgents'
    ) {
      modes.push('codexAgents');
      continue;
    }

    if (
      arg === '--claude-agents' ||
      arg === 'claude-agents' ||
      arg === '--claudeAgents' ||
      arg === 'claudeAgents'
    ) {
      modes.push('claudeAgents');
      continue;
    }

    if (
      arg === '--opencode-agents' ||
      arg === 'opencode-agents' ||
      arg === '--opencodeAgents' ||
      arg === 'opencodeAgents'
    ) {
      modes.push('opencodeAgents');
      continue;
    }

    if (
      arg === '--copilot-agents' ||
      arg === 'copilot-agents' ||
      arg === '--copilotAgents' ||
      arg === 'copilotAgents'
    ) {
      modes.push('copilotAgents');
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

  if (modes.length === 0) {
    modes.push('skills');
  }

  return { modes, envFile };
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

function copyFile(filePath, targetRoot) {
  const fileName = path.basename(filePath);
  const destination = path.join(targetRoot, fileName);

  fs.rmSync(destination, { recursive: true, force: true });
  fs.copyFileSync(filePath, destination);

  return destination;
}

function getCopyEntries(sourceDir, entryType, fileExtension) {
  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => {
      if (entry.name.startsWith('.')) return false;
      if (entryType === 'directory') return entry.isDirectory();
      if (entryType === 'file') {
        return (
          entry.isFile() &&
          (!fileExtension || path.extname(entry.name) === fileExtension)
        );
      }

      throw new Error(`Unsupported copy entry type: ${entryType}`);
    })
    .map((entry) => path.join(sourceDir, entry.name));
}

function copyEntry(entryPath, targetRoot, entryType) {
  if (entryType === 'directory') {
    return copyFolder(entryPath, targetRoot);
  }

  if (entryType === 'file') {
    return copyFile(entryPath, targetRoot);
  }

  throw new Error(`Unsupported copy entry type: ${entryType}`);
}

function loadSharedPrompts() {
  const promptsDir = path.join(scriptDir, 'agents');

  if (!fs.existsSync(promptsDir) || !fs.statSync(promptsDir).isDirectory()) {
    throw new Error(`Shared prompts folder not found: ${promptsDir}`);
  }

  const prompts = new Map();
  for (const entry of fs.readdirSync(promptsDir, { withFileTypes: true })) {
    if (
      entry.name.startsWith('.') ||
      !entry.isFile() ||
      path.extname(entry.name) !== '.txt'
    ) {
      continue;
    }

    const promptPath = path.join(promptsDir, entry.name);
    prompts.set(path.basename(entry.name, '.txt'), fs.readFileSync(promptPath, 'utf8'));
  }

  return prompts;
}

function renderPromptedFile(filePath, prompts) {
  const extension = path.extname(filePath);
  const promptName = path.basename(
    filePath,
    filePath.endsWith('.agent.md') ? '.agent.md' : extension
  );
  const prompt = prompts.get(promptName);

  if (prompt === undefined || (extension !== '.md' && extension !== '.toml')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const separator = content.endsWith('\n') ? '\n' : '\n\n';

  if (extension === '.md' || extension === '.agent.md') {
    fs.writeFileSync(filePath, `${content}${separator}${prompt}`);
    return;
  }

  if (prompt.includes("'''")) {
    throw new Error(
      `Cannot render TOML developer_instructions for ${path.basename(filePath)}: prompt contains '''`
    );
  }

  const promptWithNewline = prompt.endsWith('\n') ? prompt : `${prompt}\n`;
  fs.writeFileSync(
    filePath,
    `${content}${separator}developer_instructions = '''\n${promptWithNewline}'''\n`
  );
}

function injectPrompts(destination, prompts) {
  const stat = fs.statSync(destination);

  if (stat.isFile()) {
    renderPromptedFile(destination, prompts);
    return;
  }

  if (!stat.isDirectory()) return;

  for (const entry of fs.readdirSync(destination, { withFileTypes: true })) {
    const entryPath = path.join(destination, entry.name);
    if (entry.isDirectory() || entry.isFile()) {
      injectPrompts(entryPath, prompts);
    }
  }
}

function runCopyMode(mode, env, envDir, allowMissingTarget, prompts) {
  const copyMode = copyModes[mode];
  const sourceDir = copyMode.sourcePath
    ? path.join(scriptDir, ...copyMode.sourcePath)
    : path.join(scriptDir, copyMode.sourceFolderName);

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`${copyMode.label} folder not found: ${sourceDir}`);
  }

  const targetFolders = parseTargetFolders(env[copyMode.targetEnvKey]);

  if (targetFolders.length === 0) {
    if (allowMissingTarget) {
      console.log(`Skipping ${copyMode.label}: ${copyMode.targetEnvKey} is not configured.`);
      return;
    }

    throw new Error(
      `No target folders configured. Set ${copyMode.targetEnvKey} in the .env file.`
    );
  }

  const entries = getCopyEntries(sourceDir, copyMode.entryType, copyMode.fileExtension);

  if (entries.length === 0) {
    console.log(`No ${copyMode.label} found in ${sourceDir}`);
    return;
  }

  for (const configuredTarget of targetFolders) {
    const targetRoot = resolveTargetFolder(configuredTarget, envDir);
    fs.mkdirSync(targetRoot, { recursive: true });

    console.log(`\nCopying ${copyMode.label} to: ${targetRoot}`);
    for (const entryPath of entries) {
      const destination = copyEntry(entryPath, targetRoot, copyMode.entryType);
      if (copyMode.injectPrompts) {
        injectPrompts(destination, prompts);
      }
      console.log(`  copied ${path.basename(entryPath)} -> ${destination}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(options.envFile || path.join(scriptDir, '.env'));
  const env = readEnvFile(envPath);
  const envDir = path.dirname(envPath);
  const allowMissingTarget = options.modes.length > 1;
  const prompts = options.modes.some((mode) => copyModes[mode].injectPrompts)
    ? loadSharedPrompts()
    : undefined;

  for (const mode of options.modes) {
    runCopyMode(mode, env, envDir, allowMissingTarget, prompts);
  }

  console.log('\nDone.');
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
