---
sidebar_position: 1
title: Home
description: n8n-as-code V2 gives VS Code, Cursor, and AI agents live n8n workflow context plus a real n8n runtime through n8n-manager.
slug: /
---

# n8n-as-code V2

**n8n-as-code** is the n8n workspace for AI agents. It lets you build, edit, sync, deploy, test, and debug workflows from local files while staying connected to a real n8n instance.

The recommended path is the VS Code/Cursor extension. It includes an n8n sidebar, embedded canvas, integrated Agent Workbench, and runtime operations powered by `n8n-manager`.

## What V2 Adds

- **Integrated VS Code/Cursor Agent** that works with the current workflow, selected node, active instance, selected project, and local workspace.
- **`n8n-manager` runtime layer** for instance registration, API keys, managed local n8n, project selection, credentials, activation, execution, and inspection.
- **Grounded n8n knowledge** from bundled schemas, docs, examples, templates, snippets, and validation rules.
- **Explicit Git-like sync** so pull, push, resolve, and conflict decisions stay reviewable.
- **One workflow loop** from idea to file edit to n8n deployment to execution debugging.

## How It Works

1. **Choose an n8n runtime**: create a managed local n8n instance or connect an existing n8n Cloud/self-hosted instance.
2. **Bind the workspace**: select the n8n project and local sync folder.
3. **Work locally**: pull workflows, create new files, open the canvas, and commit changes with Git.
4. **Use the Agent**: ask it to build, refactor, explain, validate, or fix workflows with live context.
5. **Ship intentionally**: push changes, provision missing credentials, activate, run supported workflows, and inspect executions.

## Choose Your Entry Point

| If you use... | Start here |
|---|---|
| **VS Code / Cursor** | [VS Code Extension](/docs/usage/vscode-extension) - the full V2 Agent Workbench and visual workflow workspace |
| **Terminal / CI** | [CLI](/docs/usage/cli) - explicit sync, validation, AI context generation, and automation |
| **Claude Code / Claude Desktop** | [Claude Plugin](/docs/usage/claude-plugin) - n8n skills and MCP-backed workflow work in Claude environments |
| **OpenClaw** | [OpenClaw Plugin](/docs/usage/openclaw) - portable n8n skills and setup inside OpenClaw |
| **Runtime setup** | [n8n-manager](/docs/usage/n8n-manager) - instances, credentials, managed runtimes, deployment, execution, and inspection |

## Quick Start

Install the VS Code extension, open the `n8n` view, run `n8n: Configure`, and select how you want to use n8n:

```text
[Recommended] Create and manage a local n8n automatically
[Connect an existing n8n]
[Use generation-only mode]
```

After the workspace context is saved, pull an existing workflow or create a new one. Then ask the Agent for the workflow change you want, for example:

```text
Create a workflow that receives a webhook, validates the payload, stores it in Google Sheets, and sends a Slack alert when validation fails.
```

For a complete walkthrough, see [Getting Started](/docs/getting-started).

## Documentation

- [**Getting Started**](/docs/getting-started) - installation, setup modes, and your first agent-assisted workflow loop
- [**Usage Guides**](/docs/usage) - VS Code, CLI, Claude, OpenClaw, n8n-manager, and TypeScript workflows
- [**Troubleshooting**](/docs/troubleshooting) - common issues and fixes
- [**Community**](/docs/community) - GitHub Discussions, issues, and contributions
- [**Contribution**](/docs/contribution) - development setup and internals

## Get Involved

n8n-as-code is open source under the MIT License.

- [Report a bug](https://github.com/EtienneLescot/n8n-as-code/issues)
- [Request a feature or ask a question](https://github.com/EtienneLescot/n8n-as-code/discussions)
- [Contribute](https://github.com/EtienneLescot/n8n-as-code/blob/main/CONTRIBUTING.md)
