---
sidebar_position: 1
title: Usage
description: Guides for using n8n-as-code V2 with the VS Code/Cursor Agent, n8n-manager, CLI, Claude, and OpenClaw.
---

# Usage

n8n-as-code V2 gives you multiple surfaces for the same workflow loop: grounded n8n knowledge, explicit local sync, real runtime context through `n8n-manager`, and AI agents that can work from your current workflow.

## VS Code / Cursor Extension

The recommended experience. Install the extension, configure `n8n-manager`, and use the integrated Agent Workbench with live editor context.

- Agent Workbench with current workflow, selected node, instance, project, and workspace context.
- n8n sidebar with local and remote workflow status.
- Split view with source file and n8n canvas side by side.
- Explicit pull, push, fetch, and conflict resolution controls.
- Runtime actions for credentials, activation, supported executions, and inspection through `n8n-manager`.

[**VS Code Extension Guide**](/docs/usage/vscode-extension)

## n8n-manager

The runtime foundation used by V2 surfaces. It owns n8n instances, API keys, managed local runtimes, tunnels, project selection, credential readiness, deployment, execution, and inspection.

Use this guide when you need to understand where instances are stored, how projects are selected, how credentials are prepared, or how runtime execution works.

[**n8n-manager Guide**](/docs/usage/n8n-manager)

## CLI

The terminal interface for direct workflow operations, scripts, and CI.

- explicit Git-like sync between local files and n8n
- workflow validation and format conversion
- AI context generation for local agents
- manager-backed credential provisioning, activation, execution, and inspection

[**CLI Guide**](/docs/usage/cli)

## Claude Plugin

Use the same n8n skills in Claude Code or connect Claude Desktop through MCP. This is useful when you want Claude to create, edit, or debug workflows while staying grounded in bundled n8n schemas and docs.

[**Claude Plugin Guide**](/docs/usage/claude-plugin)

## OpenClaw Plugin

Install the OpenClaw plugin for portable n8n skills, workspace setup, and natural-language workflow changes inside OpenClaw.

[**OpenClaw Plugin Guide**](/docs/usage/openclaw)

## TypeScript Workflows

An optional decorator-based format that makes workflow files easier to read, diff, and edit with agents. It works alongside standard n8n JSON workflows and can be converted in either direction.

[**TypeScript Workflows Guide**](/docs/usage/typescript-workflows)

## Typical Tasks

| Need | Best entry point |
|---|---|
| Build or edit workflows with live editor context | [VS Code Extension](/docs/usage/vscode-extension) |
| Manage instances, API keys, projects, credentials, and executions | [n8n-manager](/docs/usage/n8n-manager) |
| Script sync, validation, conversion, or CI/CD flows | [CLI Guide](/docs/usage/cli) |
| Ask Claude to create, update, or debug workflows | [Claude Plugin](/docs/usage/claude-plugin) |
| Use n8n skills inside OpenClaw | [OpenClaw Plugin](/docs/usage/openclaw) |
| Work in a more AI-readable source format | [TypeScript Workflows](/docs/usage/typescript-workflows) |
