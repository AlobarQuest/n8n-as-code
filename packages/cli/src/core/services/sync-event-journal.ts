import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const SYNC_EVENT_JOURNAL_FILENAME = '.n8n-sync-events.jsonl';

export type WorkflowPushSyncEvent = {
    v: 1;
    id: string;
    ts: string;
    op: 'workflow.push';
    status: 'success' | 'rejected' | 'failed';
    workflowId?: string;
    filename?: string;
    remoteChanged: boolean;
    remoteUpdatedAt?: string;
    reason?: string;
};

export type SyncEvent = WorkflowPushSyncEvent;

export type SyncEventInput = Omit<SyncEvent, 'v' | 'id' | 'ts'> & {
    id?: string;
    ts?: string;
};

export class SyncEventJournal {
    private readonly filePath: string;
    private readonly maxBytes = 256 * 1024;
    private readonly maxEvents = 500;

    constructor(directory: string) {
        this.filePath = path.join(directory, SYNC_EVENT_JOURNAL_FILENAME);
    }

    getFilePath(): string {
        return this.filePath;
    }

    append(input: SyncEventInput): SyncEvent {
        const event = {
            ...input,
            v: 1,
            id: input.id || randomUUID(),
            ts: input.ts || new Date().toISOString(),
        } as SyncEvent;

        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
        this.compactIfNeeded();
        return event;
    }

    private compactIfNeeded(): void {
        try {
            const stat = fs.statSync(this.filePath);
            if (stat.size <= this.maxBytes) return;

            const lines = fs.readFileSync(this.filePath, 'utf8')
                .split('\n')
                .filter(Boolean)
                .slice(-this.maxEvents);
            fs.writeFileSync(this.filePath, `${lines.join('\n')}\n`, 'utf8');
        } catch {
            // Journal compaction is best-effort; push success must not depend on it.
        }
    }
}
