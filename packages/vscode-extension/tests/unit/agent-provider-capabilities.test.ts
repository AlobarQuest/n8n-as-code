import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildLangChainReasoningOptions,
    getReasoningCapability,
    getReasoningOptions,
    normalizeReasoningEffortForCapability,
    shouldDisableModelStreamingForToolCalling,
} from '../../src/services/agent-provider-capabilities.js';

test('provider capabilities: OpenAI reasoning is limited to reasoning models', () => {
    assert.equal(getReasoningCapability('openai', 'gpt-4o-mini').supported, false);
    assert.equal(getReasoningCapability('openai', 'gpt-5.4-mini').supported, true);
    assert.equal(getReasoningCapability('openai-compatible', 'o3-mini').supported, true);

    assert.deepEqual(buildLangChainReasoningOptions('openai', 'gpt-5.4-mini', 'xhigh'), {
        reasoning: { effort: 'high' },
        useResponsesApi: true,
    });
});

test('provider capabilities: Anthropic thinking maps to adaptive or budgeted thinking', () => {
    assert.equal(getReasoningCapability('anthropic', 'claude-sonnet-4-6').supported, true);
    assert.deepEqual(buildLangChainReasoningOptions('anthropic', 'claude-sonnet-4-6', 'xhigh'), {
        thinking: { type: 'adaptive', display: 'summarized' },
        outputConfig: { effort: 'xhigh' },
    });
    assert.deepEqual(buildLangChainReasoningOptions('anthropic', 'claude-3-7-sonnet-latest', 'medium'), {
        thinking: { type: 'enabled', budget_tokens: 4000, display: 'summarized' },
    });
});

test('provider capabilities: OpenRouter uses model kwargs and conservative model detection', () => {
    assert.equal(getReasoningCapability('openrouter', 'anthropic/claude-sonnet-4-6').supported, true);
    assert.equal(getReasoningCapability('openrouter', 'openai/gpt-4o-mini').supported, false);
    assert.deepEqual(buildLangChainReasoningOptions('openrouter', 'deepseek/deepseek-r1', 'minimal'), {
        modelKwargs: {
            reasoning: { effort: 'low' },
            include_reasoning: true,
        },
    });
});

test('provider capabilities: Gemini thinking maps to native and OpenAI-compatible options', () => {
    assert.equal(getReasoningCapability('google', 'gemini-2.5-flash').supported, true);
    assert.equal(getReasoningCapability('google', 'gemini-3-flash-preview').supported, true);
    assert.equal(getReasoningCapability('google', 'gemini-1.5-pro').supported, false);
    assert.equal(shouldDisableModelStreamingForToolCalling('google', 'gemini-3-flash-preview'), true);
    assert.equal(shouldDisableModelStreamingForToolCalling('google', 'gemini-2.5-flash'), false);
    const options = buildLangChainReasoningOptions('google', 'gemini-2.5-flash', 'high');
    assert.deepEqual(options.thinkingConfig, {
        includeThoughts: true,
        thinkingLevel: 'HIGH',
        thinkingBudget: 8192,
    });
    assert.deepEqual(options.modelKwargs, {
        extra_body: {
            google: {
                thinking_config: {
                    include_thoughts: true,
                    thinking_budget: 8192,
                },
            },
        },
    });
});

test('provider capabilities: UI options reflect provider-supported levels', () => {
    assert.deepEqual(getReasoningOptions('openai-oauth', 'gpt-5.4', 'minimal').map((option) => option.id), ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    assert.deepEqual(getReasoningOptions('openai', 'gpt-5.4', 'medium').map((option) => option.id), ['none', 'low', 'medium', 'high']);
    assert.equal(normalizeReasoningEffortForCapability('xhigh', getReasoningCapability('openai', 'gpt-5.4')), 'high');
});
