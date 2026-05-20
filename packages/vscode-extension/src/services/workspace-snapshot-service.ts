import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type WorkspaceSnapshotLogger = (message: string) => void;

export class WorkspaceSnapshotService {
    private readonly snapshotRoot: string;

    constructor(
        storageRoot: string,
        private readonly log: WorkspaceSnapshotLogger = () => {},
    ) {
        this.snapshotRoot = path.join(storageRoot, 'agent-workspace-snapshots');
    }

    async capture(workspaceRoot: string | undefined, label: string): Promise<string | undefined> {
        if (!workspaceRoot) return undefined;
        const resolvedRoot = path.resolve(workspaceRoot);
        if (!fs.existsSync(resolvedRoot)) return undefined;
        try {
            await this.ensureSnapshotRepo(resolvedRoot);
            await this.git(resolvedRoot, ['add', '-A', '--', '.']);
            const message = `${label}\n\nworkspace: ${resolvedRoot}`;
            const { stdout } = await this.git(resolvedRoot, ['commit', '--allow-empty', '-m', message]);
            const match = stdout.match(/\[[^\s]+(?:\s+\([^)]+\))?\s+([a-f0-9]+)\]/i);
            if (match?.[1]) {
                return await this.revParse(resolvedRoot, match[1]);
            }
            return this.revParse(resolvedRoot, 'HEAD');
        } catch (error: any) {
            this.log(`[n8n-agent] Workspace snapshot failed: ${error?.message || String(error)}`);
            return undefined;
        }
    }

    async restore(workspaceRoot: string | undefined, snapshotId: string | undefined): Promise<void> {
        if (!snapshotId) return;
        if (!workspaceRoot) {
            throw new Error('Cannot restore workspace snapshot without an open workspace.');
        }
        const resolvedRoot = path.resolve(workspaceRoot);
        await this.ensureSnapshotRepo(resolvedRoot);
        await this.capture(resolvedRoot, 'Before checkpoint rewind restore');
        await this.git(resolvedRoot, ['reset', '--hard', snapshotId]);
    }

    private async ensureSnapshotRepo(workspaceRoot: string): Promise<void> {
        const gitDir = this.gitDir(workspaceRoot);
        if (!fs.existsSync(gitDir)) {
            await fs.promises.mkdir(path.dirname(gitDir), { recursive: true });
            await execFileAsync('git', ['init', '--bare', gitDir], { maxBuffer: 10 * 1024 * 1024 });
        }
        await fs.promises.mkdir(path.join(gitDir, 'info'), { recursive: true });
        await fs.promises.writeFile(
            path.join(gitDir, 'info', 'exclude'),
            [
                '.git',
                '.git/',
                '.git/**',
                '',
            ].join('\n'),
            'utf8',
        );
        await this.git(workspaceRoot, ['config', 'user.name', 'n8n Agent Workbench']);
        await this.git(workspaceRoot, ['config', 'user.email', 'n8n-agent-workbench@localhost']);
        await this.git(workspaceRoot, ['config', 'commit.gpgsign', 'false']);
        await this.git(workspaceRoot, ['config', 'core.autocrlf', 'false']);
    }

    private async revParse(workspaceRoot: string, ref: string): Promise<string> {
        const { stdout } = await this.git(workspaceRoot, ['rev-parse', ref]);
        return stdout.trim();
    }

    private async git(workspaceRoot: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
        const result = await execFileAsync('git', [
            `--git-dir=${this.gitDir(workspaceRoot)}`,
            `--work-tree=${workspaceRoot}`,
            ...args,
        ], {
            cwd: workspaceRoot,
            maxBuffer: 50 * 1024 * 1024,
        });
        return {
            stdout: String(result.stdout || ''),
            stderr: String(result.stderr || ''),
        };
    }

    private gitDir(workspaceRoot: string): string {
        const id = createHash('sha256').update(path.resolve(workspaceRoot)).digest('hex').slice(0, 32);
        return path.join(this.snapshotRoot, `${id}.git`);
    }
}
