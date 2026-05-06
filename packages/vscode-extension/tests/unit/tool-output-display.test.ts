import test from 'node:test';
import assert from 'node:assert';

test('Tool output display: unwraps serialized LangChain ToolMessage content', () => {
    const { normalizeToolOutputForDisplay } = require('../../src/utils/tool-output-display.js');
    const output = {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'ToolMessage'],
        kwargs: {
            status: 'success',
            content: [
                { type: 'text', text: 'Shell\nexecute: npx --yes n8nac@next update-ai\ndone' },
            ],
        },
    };

    assert.equal(
        normalizeToolOutputForDisplay(output),
        'Shell\nexecute: npx --yes n8nac@next update-ai\ndone',
    );
});

test('Tool output display: normalizes on_tool_end output before stream adapter summarization', () => {
    const { withNormalizedToolEndOutput } = require('../../src/utils/tool-output-display.js');
    const event = {
        event: 'on_tool_end',
        data: {
            output: {
                lc: 1,
                type: 'constructor',
                id: ['langchain_core', 'messages', 'ToolMessage'],
                kwargs: {
                    content: 'real tool output',
                },
            },
        },
    };

    const normalized = withNormalizedToolEndOutput(event);

    assert.equal(normalized.displayText, 'real tool output');
    assert.equal((normalized.event as any).data.output, 'real tool output');
    assert.equal((event as any).data.output.kwargs.content, 'real tool output', 'must not mutate original event');
});

test('Tool output display: unwraps serialized ToolMessage strings only when recognized', () => {
    const { normalizeToolOutputForDisplay } = require('../../src/utils/tool-output-display.js');
    const serializedToolMessage = JSON.stringify({
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'ToolMessage'],
        kwargs: { content: 'command output' },
    });
    const regularJsonOutput = '{"workflowId":"wf-1","status":"ok"}';

    assert.equal(normalizeToolOutputForDisplay(serializedToolMessage), 'command output');
    assert.equal(normalizeToolOutputForDisplay(regularJsonOutput), regularJsonOutput);
});

test('Tool output display: hides LangGraph Command update JSON wrappers', () => {
    const { normalizeToolOutputForDisplay, withNormalizedToolEndOutput } = require('../../src/utils/tool-output-display.js');
    const commandUpdate = JSON.stringify({
        lg_name: 'Command',
        update: {
            todos: [{ content: 'Load instructions', status: 'in_progress' }],
        },
    });

    assert.equal(normalizeToolOutputForDisplay(commandUpdate), 'Updated todos');
    assert.equal(withNormalizedToolEndOutput({ event: 'on_tool_end', data: { output: commandUpdate } }).suppressBody, true);
});
