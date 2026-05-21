#!/usr/bin/env node
'use strict';

/**
 * Resolves the same n8n stable tag as ensure-n8n-cache.cjs and stamps it as the
 * `n8nVersion` field in packages/skills/package.json.
 *
 * This allows consumers to know which n8n version the skills index was built against
 * (visible on npm and in the CHANGELOG), addressing #271.
 *
 * The field is intentionally not touched by the workspace-release.mjs script (which only
 * updates `version` and `dependencies`), so it is safe across the custom release flow.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_METADATA_PATH = path.join(ROOT_DIR, '.n8n-cache', '.cache-metadata.json');
const SKILLS_PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'packages', 'skills', 'package.json');
const ENSURE_N8N_CACHE_PATH = path.join(ROOT_DIR, 'scripts', 'ensure-n8n-cache.cjs');

function readCacheMetadata() {
    if (!fs.existsSync(CACHE_METADATA_PATH)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(CACHE_METADATA_PATH, 'utf8'));
    } catch (error) {
        console.warn(`⚠️  Could not read cache metadata: ${error.message}`);
        return null;
    }
}

function resolveTagFromEnv() {
    return process.env.N8N_VERSION || process.env.N8N_STABLE_TAG || null;
}

function resolveTagFromStableResolver() {
    try {
        return execFileSync(process.execPath, [ENSURE_N8N_CACHE_PATH, '--print-tag'], {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim() || null;
    } catch (error) {
        console.warn(`⚠️  Could not resolve current n8n stable tag: ${error.message}`);
        return null;
    }
}

function resolveN8nTag() {
    return resolveTagFromEnv() || resolveTagFromStableResolver() || readCacheMetadata()?.resolvedTag || null;
}

function getJsonIndent(content) {
    const match = content.match(/^([ \t]+)"/m);
    return match ? match[1] : '    ';
}

function main() {
    const resolvedTag = resolveN8nTag();
    if (!resolvedTag) {
        console.warn('⚠️  No n8n tag found in env or cache metadata — skipping n8nVersion stamp.');
        return;
    }

    // Extract bare semver from tag formats like "n8n@1.88.0", "v1.88.0", or "1.88.0"
    const semverMatch = /(\d+\.\d+\.\d+.*)$/.exec(resolvedTag);
    if (!semverMatch) {
        console.warn(`⚠️  Could not extract semver from n8n tag "${resolvedTag}" — skipping n8nVersion stamp.`);
        return;
    }
    const n8nVersion = semverMatch[1];

    const existingContent = fs.readFileSync(SKILLS_PACKAGE_JSON_PATH, 'utf8');
    const packageJson = JSON.parse(existingContent);

    if (packageJson.n8nVersion === n8nVersion) {
        console.log(`✨ n8nVersion already set to ${n8nVersion} — nothing to do.`);
        return;
    }

    packageJson.n8nVersion = n8nVersion;
    const indent = getJsonIndent(existingContent);
    fs.writeFileSync(SKILLS_PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, indent)}\n`);
    console.log(`✅ Stamped n8nVersion=${n8nVersion} in packages/skills/package.json`);
}

main();
