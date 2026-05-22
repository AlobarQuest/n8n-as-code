import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const vsixPath = process.argv[2];
if (!vsixPath) {
  console.error('Usage: node scripts/smoke-vsix-runtime.mjs <path-to.vsix>');
  process.exit(1);
}

const absoluteVsixPath = path.resolve(vsixPath);
if (!fs.existsSync(absoluteVsixPath)) {
  console.error(`VSIX not found: ${absoluteVsixPath}`);
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8nac-vsix-smoke-'));
try {
  execFileSync('unzip', ['-q', absoluteVsixPath, '-d', tempRoot], { stdio: 'pipe' });
  const extensionRoot = path.join(tempRoot, 'extension');
  const outDir = path.join(extensionRoot, 'out');
  const nodeModulesDir = path.join(outDir, 'node_modules');

  assertFile(path.join(outDir, 'extension.js'));
  assertFile(path.join(outDir, 'extension-runtime.mjs'));
  assertMissing(path.join(outDir, 'extension-runtime.js'));
  assertFile(path.join(nodeModulesDir, 'n8nac', 'dist', 'lib.js'));
  assertFile(path.join(nodeModulesDir, 'is-network-error', 'index.js'));
  assertFile(path.join(nodeModulesDir, '@langchain', 'langgraph-sdk', 'node_modules', 'p-retry', 'index.js'));

  installVscodeMock(extensionRoot);
  verifyDependencyClosure(nodeModulesDir);

  globalThis.__vscodeSmokeOutput = [];
  const extension = await import(pathToFileURL(path.join(outDir, 'extension.js')).href);
  const context = createExtensionContext(extensionRoot);
  await extension.activate(context);
  const activationLog = globalThis.__vscodeSmokeOutput.join('\n');
  if (activationLog.includes('Activation completed with degraded functionality')) {
    throw new Error(`Extension activation degraded during VSIX smoke test:\n${activationLog}`);
  }
  await import(pathToFileURL(path.join(nodeModulesDir, '@langchain', 'langgraph-sdk', 'node_modules', 'p-retry', 'index.js')).href);

  console.log('VSIX runtime smoke test passed.');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assertFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Expected file missing: ${filePath}`);
  }
}

function assertMissing(filePath) {
  if (fs.existsSync(filePath)) {
    throw new Error(`Unexpected stale file in VSIX: ${filePath}`);
  }
}

function verifyDependencyClosure(rootNodeModulesDir) {
  const packageJsonPaths = collectPackageJsonPaths(rootNodeModulesDir);
  const missing = [];
  for (const packageJsonPath of packageJsonPaths) {
    const packageDir = path.dirname(packageJsonPath);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    for (const dependencyName of Object.keys(pkg.dependencies || {})) {
      if (!resolvePackageJsonFrom(packageDir, dependencyName, rootNodeModulesDir)) {
        missing.push(`${pkg.name || packageDir} -> ${dependencyName}`);
      }
    }
  }
  if (missing.length) {
    throw new Error(`Missing packaged runtime dependencies:\n${missing.map((item) => `  - ${item}`).join('\n')}`);
  }
}

function collectPackageJsonPaths(directory) {
  const results = [];
  const entries = fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }) : [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.name.startsWith('@')) {
      results.push(...collectPackageJsonPaths(entryPath));
      continue;
    }
    const packageJsonPath = path.join(entryPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      results.push(packageJsonPath);
    }
    const nestedNodeModules = path.join(entryPath, 'node_modules');
    if (fs.existsSync(nestedNodeModules)) {
      results.push(...collectPackageJsonPaths(nestedNodeModules));
    }
  }
  return results;
}

function resolvePackageJsonFrom(fromDir, packageName, rootNodeModulesDir) {
  const parts = packageName.startsWith('@') ? packageName.split('/') : [packageName];
  let current = fromDir;
  while (current.startsWith(path.dirname(rootNodeModulesDir))) {
    const candidate = path.join(current, 'node_modules', ...parts, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const rootCandidate = path.join(rootNodeModulesDir, ...parts, 'package.json');
  return fs.existsSync(rootCandidate) ? rootCandidate : undefined;
}

function installVscodeMock(extensionRoot) {
  const vscodeDir = path.join(extensionRoot, 'node_modules', 'vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(path.join(vscodeDir, 'package.json'), JSON.stringify({ name: 'vscode', version: '0.0.0', main: 'index.js' }));
  fs.writeFileSync(path.join(vscodeDir, 'index.js'), `
const path = require('node:path');
class EventEmitter {
  constructor() { this.listeners = new Set(); this.event = (listener) => { this.listeners.add(listener); return { dispose: () => this.listeners.delete(listener) }; }; }
  fire(value) { for (const listener of this.listeners) listener(value); }
  dispose() { this.listeners.clear(); }
}
class TreeItem { constructor(label, collapsibleState) { this.label = label; this.collapsibleState = collapsibleState; } }
class ThemeIcon { constructor(id, color) { this.id = id; this.color = color; } }
class ThemeColor { constructor(id) { this.id = id; } }
class Uri {
  constructor(fsPath, value) { this.fsPath = fsPath; this._value = value || fsPath; }
  toString() { return this._value; }
  static file(filePath) { return new Uri(filePath, 'file://' + filePath); }
  static parse(value) { return new Uri(value.startsWith('file://') ? value.slice(7) : value, value); }
  static joinPath(base, ...parts) { return Uri.file(path.join(base.fsPath || String(base), ...parts)); }
}
class RelativePattern { constructor(base, pattern) { this.base = base; this.pattern = pattern; } }
const disposable = { dispose() {} };
const configuration = { get() { return undefined; }, update() { throw new Error('VSIX smoke test forbids VS Code settings writes'); } };
module.exports = {
  version: '1.99.0-smoke',
  EventEmitter,
  TreeItem,
  ThemeIcon,
  ThemeColor,
  Uri,
  RelativePattern,
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ProgressLocation: { Notification: 15 },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  window: {
    createStatusBarItem() { return { ...disposable, show() {}, hide() {}, text: '', tooltip: '', command: undefined, backgroundColor: undefined }; },
    createOutputChannel() { return { ...disposable, appendLine(value) { global.__vscodeSmokeOutput?.push(String(value)); }, show() {} }; },
    createTreeView() { return { ...disposable, reveal() {}, title: '' }; },
    registerFileDecorationProvider() { return disposable; },
    createWebviewPanel() { return { ...disposable, webview: { options: {}, html: '', asWebviewUri: (uri) => uri, onDidReceiveMessage: () => disposable, postMessage: async () => true }, onDidDispose: () => disposable, onDidChangeViewState: () => disposable, reveal() {}, visible: true }; },
    showErrorMessage: async () => undefined,
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showInputBox: async () => undefined,
    showQuickPick: async () => undefined,
    withProgress: async (_options, task) => task({ report() {} }),
  },
  workspace: {
    workspaceFolders: undefined,
    getConfiguration() { return configuration; },
    registerTextDocumentContentProvider() { return disposable; },
    createFileSystemWatcher() { return { ...disposable, onDidCreate: () => disposable, onDidChange: () => disposable, onDidDelete: () => disposable }; },
    onDidChangeConfiguration() { return disposable; },
    openTextDocument: async () => ({}),
  },
  commands: { registerCommand() { return disposable; }, executeCommand: async () => undefined },
  env: { isTelemetryEnabled: false, onDidChangeTelemetryEnabled: () => disposable, clipboard: { readText: async () => '', writeText: async () => undefined }, asExternalUri: async (uri) => uri, openExternal: async () => true },
};
`);
}

function createExtensionContext(extensionRoot) {
  const globalState = createMemento();
  const workspaceState = createMemento();
  const globalStoragePath = path.join(extensionRoot, '.smoke-global-storage');
  fs.mkdirSync(globalStoragePath, { recursive: true });
  return {
    subscriptions: [],
    extensionUri: { fsPath: extensionRoot, toString: () => `file://${extensionRoot}` },
    globalStorageUri: { fsPath: globalStoragePath, toString: () => `file://${globalStoragePath}` },
    storageUri: { fsPath: globalStoragePath, toString: () => `file://${globalStoragePath}` },
    logUri: { fsPath: globalStoragePath, toString: () => `file://${globalStoragePath}` },
    extension: { packageJSON: JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8')) },
    globalState,
    workspaceState,
    secrets: createSecretStorage(),
  };
}

function createMemento() {
  const values = new Map();
  return { get: (key, defaultValue) => values.has(key) ? values.get(key) : defaultValue, update: async (key, value) => { value === undefined ? values.delete(key) : values.set(key, value); } };
}

function createSecretStorage() {
  const values = new Map();
  return { get: async (key) => values.get(key), store: async (key, value) => { values.set(key, value); }, delete: async (key) => { values.delete(key); } };
}
