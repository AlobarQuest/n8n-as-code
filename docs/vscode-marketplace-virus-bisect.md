# VS Code Marketplace Virus-Check Bisect

This protocol publishes isolated Visual Studio Marketplace pre-release candidates
without using the normal release workflow. It is intended for diagnosing opaque
Marketplace validation failures such as:

> Extension failed Virus check. Please submit a valid extension.

Each attempt uses an exact git ref and an exact extension version. The script
creates a temporary detached worktree, patches only
`packages/vscode-extension/package.json`, runs the root build, packages a VSIX
as a pre-release, runs the local VSIX preflight scanner, and publishes only when
`--publish` is provided.

## Requirements

- A clean enough repository to resolve the requested git refs.
- Marketplace token exported as `VSCE_TOKEN` or `VSCE_PAT` for real publishes.
- A version number that does not already exist on Visual Studio Marketplace.
- Node 22 is used automatically for npm, build, vsce, and preflight steps when
  the current shell is running another Node major version.

## Baseline

Start by republishing the last accepted commit under the next available
pre-release version:

```sh
npm run vscode:bisect-publish -- --ref 84cefbe --version 2.13.124
VSCE_TOKEN=... npm run vscode:bisect-publish -- --ref 84cefbe --version 2.13.124 --publish
```

If this passes Microsoft validation, the packaging path is still accepted and
the rejection was introduced after `84cefbe`.

## Marketplace Artifact Control

When a rebuilt baseline fails, use the already accepted VSIX from the Marketplace
as the strongest control. Download the accepted package, decompress it when the
API returns gzip content, change only these two version fields, then repack and
publish under a fresh pre-release version:

- `extension/package.json` `version`
- `extension.vsixmanifest` `<Identity Version="...">`

Example used during the investigation:

```sh
curl -fsSL \
  https://marketplace.visualstudio.com/_apis/public/gallery/publishers/etienne-lescot/vsextensions/n8n-as-code/2.9.55/vspackage \
  -o .tmp/vsix-baseline/n8n-as-code-2.9.55-marketplace.vsix

gunzip -c .tmp/vsix-baseline/n8n-as-code-2.9.55-marketplace.vsix \
  > .tmp/vsix-baseline/n8n-as-code-2.9.55-marketplace.raw.vsix
```

If this repacked artifact fails the virus check, the evidence points to a
Marketplace scanner or policy change, because the extension payload is the
previously accepted package and only the version metadata changed.

## Candidate Loop

For each suspect block, create a commit or branch that contains the baseline plus
that block, then publish a new unique version:

```sh
npm run vscode:bisect-publish -- --ref <candidate-ref> --version 2.13.125
VSCE_TOKEN=... npm run vscode:bisect-publish -- --ref <candidate-ref> --version 2.13.125 --publish
```

Record each result:

| Version | Ref | Candidate change | Marketplace result |
| --- | --- | --- | --- |
| 2.13.124 | 84cefbe | Last accepted commit, extension-only build | failed virus check |
| 2.13.125 | 6607513 | First unvalidated line candidate | published, awaiting validation |
| 2.13.127 | 84cefbe | Last accepted commit, root build | failed virus check |
| 2.13.128 | Marketplace 2.9.55 VSIX | Accepted VSIX repacked with version-only metadata changes | accepted |
| 2.13.129 | 2.13.128 + assets from 2.13.127 | Isolate generated JSON assets from the failed rebuild | accepted |
| 2.13.130 | 2.13.128 + `extension.js` and `package.json` from 2.13.127 | Isolate rebuilt runtime code and extension metadata from the failed rebuild | failed virus check |
| 2.13.131 | 2.13.128 + `package.json` from 2.13.127 | Isolate extension metadata and dependency version strings | accepted |
| 2.13.132 | 2.13.128 + `extension/out/extension.js` from 2.13.127 | Isolate rebuilt runtime bundle only | failed virus check |
| 2.13.133 | 2.13.128 + blank telemetry build constants in `extension.js` | Isolate empty PostHog key/host/env constants | failed virus check |
| 2.13.134 | 2.13.128 + stable CLI/version constants in `extension.js` | Isolate `2.2.1`/non-`next` constants | failed virus check |
| 2.13.135 | 2.13.128 + neutral trailing comment in `extension.js` | Probe whether any `extension.js` content change triggers validation | failed virus check |
| 2.13.136 | 2.13.128 + blank PostHog key only in `extension.js` | Isolate one telemetry constant | failed virus check |
| 2.13.137 | 2.13.128 + stable `distTag` constant only in `extension.js` | Isolate one CLI/dist-tag constant | failed virus check |
| 2.13.138 | 2.13.128 + neutral trailing comment in `types.js` | Probe whether the scanner rejects any JS change or specifically `extension.js` | accepted |
| 2.13.139 | 2.13.128 + tiny `extension.js` wrapper + accepted bundle moved to `extension-bundle.js` | Test whether a small changed `extension.js` is accepted when the old bundle is renamed | failed virus check |
| 2.13.140 | 2.13.128 + tiny `extension.js` wrapper + failed 2.13.132 bundle moved to `extension-bundle.js` | Test whether the failed bundle content is accepted when no longer named `extension.js` | failed virus check |
| 2.13.141 | 2.13.128 + `main` changed to tiny `boot.js`, accepted `extension.js` unchanged | Test whether the declared entrypoint path is what triggers scanning | failed virus check |
| 2.13.142 | 2.13.128 + `main` changed to tiny `boot.js`, failed bundle renamed to `extension-bundle.js` | Test whether failed bundle content passes when not declared as entrypoint or `extension.js` | failed virus check |
| 2.13.143 | 2.13.128 + empty `extension.js` no-op activate/deactivate | Baseline for progressive code-splitting with `main` unchanged | accepted |
| 2.13.144 | 2.13.143 + `vscode` import, output channel, minimal `n8n.refresh` command | First functional VS Code API block with small `extension.js` | accepted |
| 2.13.145 | 2.13.143 + half A core workflow/sync/UI `require` surface | Bisect broad functional half: `n8nac`, workflow store/tree/webviews/config/utils | accepted |
| 2.13.146 | 2.13.143 + half B agent/proxy/AI/telemetry `require` surface | Bisect broad functional half: skills, manager adapter, telemetry, proxy, agent runtime/workbench | accepted |
| 2.13.147 | 2.13.143 + half A and half B combined through split chunks | Test whether small `extension.js` plus code-split functional surfaces avoids the monolithic-entrypoint failure | accepted |
| 2.13.148 | 2.13.147 + real TypeScript-compiled activation moved to `extension-runtime.js` | Test full activation/registration with a 413-byte `extension.js` and non-bundled runtime chunks | accepted |
| 2.13.149 | Current branch production split build | Validate the implemented build change: 525-byte `extension.js`, 107 KB `extension-runtime.js`, separate runtime modules/dependencies | accepted |

## Suggested Order

1. Last accepted commit: `84cefbe`.
2. Baseline plus agent provider runtime files.
3. Baseline plus `workspace-snapshot-service`.
4. Baseline plus both blocks.
5. Current `next` commit.

The script defaults to a dry run. A dry run still creates the VSIX and preflight
report, but does not publish anything to the Marketplace.

Use `--extension-build-only` only for quick local experiments. The default root
build is slower, but it matches the release workflow more closely and avoids
false baselines from missing generated assets.
