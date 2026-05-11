import test from 'node:test';
import assert from 'node:assert';

test('Configuration webview HTML: embedded script parses', () => {
    const { getConfigurationHtml } = require('../../src/ui/configuration-webview-html.js');
    const html: string = getConfigurationHtml('nonce');
    const script = html.match(/<script[^>]*>([\s\S]*)<\/script>/)?.[1];

    assert.ok(script, 'Must render an embedded webview script');
    assert.doesNotThrow(() => new Function(script));
    assert.ok(script.includes("split('\\\\').join('/')"), 'Must preserve backslash normalization in generated JavaScript');
    assert.ok(script.includes("selected.mode === 'managed' ? '' : normalizeHost(els.environmentRemoteUrl.value)"), 'Managed environment selection must not be treated as typed remote URL');
    assert.ok(script.includes("selected.mode === 'managed' ? '' : selected.url || ''"), 'Managed environment selection must keep the remote URL input empty');
    assert.ok(script.includes("url: isManagedTarget ? '' : target.kind === 'external-instance'"), 'Managed environment targets must not expose a remote URL candidate');
});
