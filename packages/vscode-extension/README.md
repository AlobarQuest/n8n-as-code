# <img src="https://raw.githubusercontent.com/EtienneLescot/n8n-as-code/main/res/logo.png" alt="n8n-as-code logo" width="32" height="32"> n8n-as-code

**The VS Code and Cursor workspace for building n8n workflows with an AI agent that has live n8n context.**

`n8n-as-code` V2 turns your editor into an n8n IDE: browse workflows, open the canvas beside source files, ask the integrated Agent to create or edit automations, and use `n8n-manager` to connect real n8n environments, credentials, deployment, execution, and inspection.

Published for both the Microsoft Marketplace and Open VSX.

![n8n-as-code demo](https://raw.githubusercontent.com/EtienneLescot/n8n-as-code/main/res/n8n-as-code.gif)

---

## Quick Start

1. Install `n8n-as-code` from the Microsoft Marketplace or Open VSX.
2. Open a folder or `.code-workspace` in VS Code, Cursor, Windsurf, or another compatible editor.
3. Open the `n8n` view and run `n8n: Configure`.
4. Create a managed local n8n instance or connect an existing n8n instance through `n8n-manager`.
5. Select the n8n project and sync folder, then save the workspace context.
6. Pull an existing workflow or create a new one, then ask the built-in Agent what you want to change.

Marketplace links:

- Microsoft Marketplace: https://marketplace.visualstudio.com/items?itemName=etienne-lescot.n8n-as-code
- Open VSX: https://open-vsx.org/extension/etienne-lescot/n8n-as-code

Prerelease builds are published on the VS Code Marketplace prerelease channel when available. If you use a prerelease extension with manual CLI commands or generated agent context, keep the CLI on the same prerelease line:

```bash
npx --yes n8nac@next <command>
npx --yes @n8n-as-code/n8n-manager@next <command>
```

Open VSX prereleases are not published; use the stable Open VSX extension unless you install from a local development build.

---

## What You Get

### Integrated Agent Workbench

The extension includes an n8n-focused Agent experience inside the editor. The Agent can use the context you already have open:

- current workflow file and workflow metadata
- selected node in the workflow or canvas context
- active n8n instance and project
- workspace sync folder and generated AI instructions
- embedded n8n node schemas, docs, examples, templates, and validation rules

Use it to create workflows, refactor nodes, explain failures, search integrations, validate changes, prepare pushes, and drive the workflow toward a real run.

### Runtime Backed By n8n-manager

Version 2 uses `n8n-manager` for the environment layer. The extension can work with an existing n8n Cloud or self-hosted instance, or a managed local n8n runtime when available.

`n8n-manager` owns instance registration, API keys, project selection, managed runtimes, credential readiness, activation, execution, and execution inspection. The extension stores only workspace-level overrides such as the pinned instance, project, and sync folder.

### Visual Workflow Workspace

- Browse local and remote workflows from the `n8n` sidebar.
- Open split view to inspect the n8n canvas beside the source file.
- Find workflows quickly by partial name, workflow ID, or local filename.
- Keep multiple instances and projects organized in one workspace.

### Explicit Sync And Conflict Protection

Sync is deliberate. Pull, push, fetch, and resolve actions happen when you trigger them, so the extension does not silently overwrite local or remote work.

If a workflow changed both locally and remotely, synchronization pauses and exposes conflict actions in the tree so you can inspect the diff and choose which side wins.

### Built-in AI Context

The editor integration uses the shared `n8nac` CLI and `@n8n-as-code/skills` package, so local agents receive the same grounded n8n knowledge used by the CLI, MCP server, Claude Code, and OpenClaw integrations:

- JSON schema validation for live feedback
- snippets for common nodes and workflow patterns
- generated `AGENTS.md` instructions for local coding agents
- local search across nodes, docs, examples, and workflow templates

---

## Configuration

### V2 Migration Note

Version 2 makes `n8n-manager` the source of truth for instance registration, API keys, managed Docker runtimes, tunnels, and project defaults. Existing workspace-local instance libraries are no longer migrated automatically; reconfigure the extension through `n8n: Configure`, then save explicit workspace overrides when the workspace should differ from the global default.

The extension reads global instances and API keys from n8n-manager. `n8nac-config.json` at the workspace root stores only workspace overrides such as pinned instance, selected project, and sync folder.

### Setup Modes

The product flow supports three setup choices:

- **Create and manage local n8n automatically** for a zero-setup local runtime when the manager runtime is available.
- **Connect an existing n8n** for n8n Cloud or self-hosted environments.
- **Use generation-only mode** when you only want embedded n8n knowledge and local workflow authoring without a connected runtime.

In the configuration screen:

- `Add instance` creates or updates a global n8n-manager instance.
- the global selector changes the global active instance.
- the workspace controls explicitly pin an instance, project, or sync folder for the current workspace.
- `Save workspace context` persists workspace-level project and sync context.

### Compatibility Settings

The legacy native editor settings still exist as fallbacks:

| Parameter | Description | Default |
| :--- | :--- | :--- |
| `n8n.host` | URL of your n8n instance | - |
| `n8n.apiKey` | Your n8n API Key | - |
| `n8n.syncFolder` | Local storage folder | `workflows` |

---

## Typical Workflow

1. Configure a managed local n8n runtime or connect an existing instance.
2. Select the project and sync folder for the workspace.
3. Pull a workflow or create a local workflow file.
4. Open split view to inspect the canvas next to the source.
5. Ask the Agent to add a trigger, change node parameters, explain an error, or build a new workflow.
6. Validate, push, provision missing credentials, activate, run supported workflows, and inspect executions when needed.
7. Commit the workflow files and `n8nac-config.json` workspace context to Git.

---

## Philosophy

`n8n-as-code` is not a browser companion. It is a local-first workflow environment for n8n where the editor, agent, files, Git history, and real n8n runtime stay connected.

That is why the same project can power VS Code, Cursor, CLI automation, MCP clients, Claude Code, and OpenClaw without changing the workflow model.

---

## License

MIT
