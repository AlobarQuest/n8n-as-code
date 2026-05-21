#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

function usage() {
  return `Usage:
  npm run vscode:bisect-publish -- --ref <git-ref> --version <2.13.xxx> [--publish] [--keep]

Examples:
  npm run vscode:bisect-publish -- --ref 84cefbe --version 2.13.124
  VSCE_TOKEN=... npm run vscode:bisect-publish -- --ref 84cefbe --version 2.13.124 --publish

Options:
  --ref <git-ref>      Commit, tag, or branch to package in an isolated worktree.
  --version <semver>   Exact VS Code extension version to publish.
  --publish            Publish to Visual Studio Marketplace as a pre-release.
  --keep               Keep the temporary worktree after completion.
  --out-dir <path>     Persist VSIX and preflight report in this directory.
  --extension-build-only
                       Run npm run build:extension instead of the full root build.
  --skip-install       Reuse existing dependency state in the worktree when possible.
  --skip-preflight     Skip scripts/vsix-security-preflight.mjs.
`;
}

function fail(message) {
  console.error(`Error: ${message}`);
  console.error('');
  console.error(usage());
  process.exit(1);
}

function run(command, args, options = {}) {
  const displayedArgs = args.map((arg, index) => {
    const previous = args[index - 1];
    return previous === '--pat' ? '<redacted>' : arg;
  });
  console.error(`$ ${[command, ...displayedArgs].join(' ')}`);
  return execFileSync(command, args, {
    cwd: options.cwd || workspaceRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function runCapture(command, args, options = {}) {
  return run(command, args, { ...options, capture: true }).trim();
}

function quoteForShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function runNodeTool(command, args, options = {}) {
  if (process.versions.node.startsWith('22.')) {
    return run(command, args, options);
  }

  const shellCommand = [command, ...args].map(quoteForShell).join(' ');
  return run('npx', [
    '-y',
    '-p', 'node@22',
    '-p', 'npm@11.6.4',
    '-c', shellCommand,
  ], options);
}

function assertVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`Unsupported version "${version}". Expected plain semver, for example 2.13.124.`);
  }
}

function assertVersionIsFree(version) {
  const payload = JSON.stringify({
    filters: [{ criteria: [{ filterType: 7, value: 'etienne-lescot.n8n-as-code' }] }],
    flags: 529,
  });
  const response = runCapture('curl', [
    '-fsS',
    '-X', 'POST',
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1',
    '-H', 'Content-Type: application/json',
    '-d', payload,
  ]);
  const versions = JSON.parse(response)
    .results?.[0]?.extensions?.[0]?.versions
    ?.map(item => item.version)
    ?.filter(Boolean) || [];

  if (versions.includes(version)) {
    fail(`Version ${version} already exists on Visual Studio Marketplace.`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function patchExtensionManifest(worktreePath, version) {
  const packageJsonPath = path.join(worktreePath, 'packages/vscode-extension/package.json');
  const packageJson = readJson(packageJsonPath);
  packageJson.version = version;
  delete packageJson.private;
  writeJson(packageJsonPath, packageJson);
}

function disableVscodePrepublish(worktreePath) {
  const packageJsonPath = path.join(worktreePath, 'packages/vscode-extension/package.json');
  const packageJson = readJson(packageJsonPath);
  packageJson.scripts = {
    ...packageJson.scripts,
    'vscode:prepublish': 'echo "prepublish disabled for marketplace bisect packaging"',
  };
  writeJson(packageJsonPath, packageJson);
}

function hasExtensionScript(worktreePath, scriptName) {
  const packageJsonPath = path.join(worktreePath, 'packages/vscode-extension/package.json');
  const packageJson = readJson(packageJsonPath);
  return Boolean(packageJson.scripts?.[scriptName]);
}

function createWorktree(ref, version) {
  const shortRef = runCapture('git', ['rev-parse', '--short', ref]);
  const safeVersion = version.replaceAll('.', '-');
  const worktreePath = path.join(os.tmpdir(), `n8n-as-code-vsix-bisect-${safeVersion}-${shortRef}`);

  if (fs.existsSync(worktreePath)) {
    run('git', ['worktree', 'remove', '--force', worktreePath]);
  }

  run('git', ['worktree', 'add', '--detach', worktreePath, ref]);
  return { worktreePath, shortRef };
}

function main() {
  const args = parseArgs(process.argv);
  const ref = args.ref || args._[0];
  const version = args.version || args._[1];
  const shouldPublish = Boolean(args.publish);

  if (!ref || !version || args.help) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  assertVersion(version);
  runCapture('git', ['rev-parse', '--verify', `${ref}^{commit}`]);
  assertVersionIsFree(version);

  const vsceToken = process.env.VSCE_TOKEN || process.env.VSCE_PAT;

  if (shouldPublish && !vsceToken) {
    fail('VSCE_TOKEN or VSCE_PAT is required when --publish is used.');
  }

  const { worktreePath, shortRef } = createWorktree(ref, version);
  const extensionPath = path.join(worktreePath, 'packages/vscode-extension');
  const vsixPath = path.join(extensionPath, `n8n-as-code-${version}.vsix`);
  const reportPath = path.join(extensionPath, `vsix-security-preflight-${version}.md`);
  const preflightScriptPath = path.join(workspaceRoot, 'scripts/vsix-security-preflight.mjs');
  const outputDir = path.resolve(workspaceRoot, args['out-dir'] || path.join('.tmp', 'vsix-bisect', version));
  const persistedVsixPath = path.join(outputDir, path.basename(vsixPath));
  const persistedReportPath = path.join(outputDir, path.basename(reportPath));

  try {
    patchExtensionManifest(worktreePath, version);

    if (!args['skip-install']) {
      run('npm', ['install', '--ignore-scripts'], { cwd: worktreePath });
    }

    runNodeTool('npm', ['run', args['extension-build-only'] ? 'build:extension' : 'build'], { cwd: worktreePath });
    if (hasExtensionScript(worktreePath, 'prune-package-artifacts')) {
      runNodeTool('npm', ['run', 'prune-package-artifacts'], { cwd: extensionPath });
    }
    disableVscodePrepublish(worktreePath);
    run('npx', ['@vscode/vsce', 'package', '--no-dependencies', '--pre-release', '--out', vsixPath], { cwd: extensionPath });

    if (!args['skip-preflight']) {
      runNodeTool('node', [
        preflightScriptPath,
        vsixPath,
        '--report',
        reportPath,
        '--max-findings',
        '400',
      ], { cwd: workspaceRoot });
    }

    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(vsixPath, persistedVsixPath);
    if (!args['skip-preflight']) {
      fs.copyFileSync(reportPath, persistedReportPath);
    }

    if (shouldPublish) {
      run('npx', [
        '@vscode/vsce',
        'publish',
        '--packagePath',
        persistedVsixPath,
        '--pre-release',
        '--pat',
        vsceToken,
      ], { cwd: extensionPath });
    } else {
      console.error('');
      console.error('Dry run complete. Re-run with --publish and VSCE_TOKEN or VSCE_PAT to publish this pre-release.');
    }

    console.error('');
    console.error(`Bisect candidate: ${version}`);
    console.error(`Source ref: ${ref} (${shortRef})`);
    console.error(`VSIX: ${persistedVsixPath}`);
    if (!args['skip-preflight']) {
      console.error(`Preflight report: ${persistedReportPath}`);
    }
  } finally {
    if (args.keep) {
      console.error(`Keeping worktree: ${worktreePath}`);
    } else {
      run('git', ['worktree', 'remove', '--force', worktreePath]);
    }
  }
}

main();
