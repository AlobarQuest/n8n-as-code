type RecordLike = Record<string, unknown>;

export function normalizeToolOutputForDisplay(output: unknown): string | undefined {
    const text = extractToolOutputText(output, new Set());
    return text?.trim() || undefined;
}

export function withNormalizedToolEndOutput(event: unknown): { event: unknown; displayText?: string; suppressBody?: boolean } {
    if (!isRecord(event) || event.event !== 'on_tool_end' || !isRecord(event.data)) {
        return { event };
    }

    const displayText = normalizeToolOutputForDisplay(event.data.output);
    if (!displayText) {
        return { event };
    }

    return {
        event: {
            ...event,
            data: {
                ...event.data,
                output: displayText,
            },
        },
        displayText,
        suppressBody: isLangGraphCommandUpdate(event.data.output),
    };
}

function extractToolOutputText(value: unknown, seen: Set<unknown>): string | undefined {
    if (typeof value === 'string') {
        return extractSerializedDisplayString(value, seen) || value;
    }
    if (value === null || value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return joinDisplayParts(value.map((item) => extractToolOutputText(item, seen)));
    }
    if (!isRecord(value)) {
        return undefined;
    }
    if (seen.has(value)) {
        return undefined;
    }
    seen.add(value);

    const langChainToolMessage = extractLangChainToolMessageText(value, seen);
    if (langChainToolMessage) {
        return langChainToolMessage;
    }

    const commandUpdate = extractLangGraphCommandDisplayText(value);
    if (commandUpdate) {
        return commandUpdate;
    }

    if (typeof value.text === 'string') {
        return value.text;
    }
    if (typeof value.output === 'string') {
        return value.output;
    }
    if (typeof value.stdout === 'string' || typeof value.stderr === 'string') {
        return joinDisplayParts([value.stdout, value.stderr]);
    }
    if ('content' in value) {
        const content = extractToolOutputText(value.content, seen);
        if (content) {
            return content;
        }
    }

    return undefined;
}

function extractSerializedDisplayString(value: string, seen: Set<unknown>): string | undefined {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || (!trimmed.includes('ToolMessage') && !trimmed.includes('"lg_name"'))) {
        return undefined;
    }
    try {
        return extractToolOutputText(JSON.parse(trimmed), seen);
    } catch {
        return undefined;
    }
}

function extractLangGraphCommandDisplayText(value: RecordLike): string | undefined {
    const update = value.update;
    if (!isLangGraphCommandUpdate(value) || !isRecord(update)) {
        return undefined;
    }
    if (Array.isArray(update.todos)) {
        return 'Updated todos';
    }
    if (Array.isArray(update.messages)) {
        return 'Updated messages';
    }
    return 'Updated state';
}

function isLangGraphCommandUpdate(value: unknown): boolean {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.startsWith('{') || !trimmed.includes('"lg_name"')) {
            return false;
        }
        try {
            return isLangGraphCommandUpdate(JSON.parse(trimmed));
        } catch {
            return false;
        }
    }
    return isRecord(value) && value.lg_name === 'Command' && isRecord(value.update);
}

function extractLangChainToolMessageText(value: RecordLike, seen: Set<unknown>): string | undefined {
    const isSerializedToolMessage =
        value.lc === 1 &&
        value.type === 'constructor' &&
        Array.isArray(value.id) &&
        value.id.some((part) => part === 'ToolMessage');

    if (isSerializedToolMessage && isRecord(value.kwargs)) {
        return extractToolOutputText(value.kwargs.content, seen);
    }

    const lcDirectType = typeof value._getType === 'function'
        ? safelyCallStringGetter(value._getType.bind(value))
        : undefined;
    if (lcDirectType === 'tool' && 'content' in value) {
        return extractToolOutputText(value.content, seen);
    }

    return undefined;
}

function safelyCallStringGetter(getter: () => unknown): string | undefined {
    try {
        const value = getter();
        return typeof value === 'string' ? value : undefined;
    } catch {
        return undefined;
    }
}

function joinDisplayParts(parts: unknown[]): string | undefined {
    const text = parts
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join('\n');
    return text || undefined;
}

function isRecord(value: unknown): value is RecordLike {
    return Boolean(value) && typeof value === 'object';
}
