const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const REQUIRED_AGENT_SKILLS = [
    path.join('n8n-architect', 'SKILL.md'),
];

const candidateDirs = [
    path.join(ROOT_DIR, 'packages', 'skills', 'dist', 'agent-skills'),
    path.join(ROOT_DIR, 'packages', 'skills', 'src', 'agent-skills'),
];

function hasRequiredAgentSkills(dir) {
    return REQUIRED_AGENT_SKILLS.every(file => fs.existsSync(path.join(dir, file)));
}

function rel(filePath) {
    return path.relative(ROOT_DIR, filePath) || '.';
}

const existingAgentSkillsDir = candidateDirs.find(hasRequiredAgentSkills);
if (existingAgentSkillsDir) {
    console.log(`✅ Agent skills available at ${rel(existingAgentSkillsDir)}`);
    process.exit(0);
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
if (nodeMajor >= 26) {
    console.error(
        '❌ Skills assets are missing and Node 26 cannot currently build n8n\'s isolated-vm dependency.\n' +
        '   Use Node 22 for the first asset generation, for example:\n' +
        '   npx -y -p node@22 -p pnpm@10.32.1 npm run build:extension',
    );
    process.exit(1);
}

console.log('🧱 Agent skills are missing; generating them from packages/skills...');
const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build', '--workspace=packages/skills'],
    {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: process.env,
    },
);

process.exit(result.status ?? 1);
