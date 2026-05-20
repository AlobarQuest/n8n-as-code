import test from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

test('WorkspaceSnapshotService restores tracked workspace files from an external git snapshot', async () => {
    const { WorkspaceSnapshotService } = require('../../src/services/workspace-snapshot-service.js');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'n8nac-snapshot-workspace-'));
    const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'n8nac-snapshot-storage-'));
    try {
        fs.writeFileSync(path.join(root, '.gitignore'), 'ignored.txt\n', 'utf8');
        fs.writeFileSync(path.join(root, 'workflow.json'), '{"name":"before"}\n', 'utf8');
        fs.writeFileSync(path.join(root, 'ignored.txt'), 'before ignored\n', 'utf8');

        const service = new WorkspaceSnapshotService(storage);
        const snapshotId = await service.capture(root, 'Before user message');
        assert.ok(snapshotId, 'snapshot id should be returned');

        fs.writeFileSync(path.join(root, 'workflow.json'), '{"name":"after"}\n', 'utf8');
        fs.writeFileSync(path.join(root, 'created.json'), '{"created":true}\n', 'utf8');
        fs.writeFileSync(path.join(root, 'ignored.txt'), 'after ignored\n', 'utf8');

        await service.restore(root, snapshotId);

        assert.equal(fs.readFileSync(path.join(root, 'workflow.json'), 'utf8'), '{"name":"before"}\n');
        assert.equal(fs.existsSync(path.join(root, 'created.json')), false);
        assert.equal(fs.readFileSync(path.join(root, 'ignored.txt'), 'utf8'), 'after ignored\n');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(storage, { recursive: true, force: true });
    }
});
