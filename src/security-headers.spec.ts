import { createHash } from 'node:crypto';
import { contentSecurityPolicy, inlineScripts, isHashedAsset } from './security-headers';

const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

describe('content security policy', () => {
  const html = `<html><head>
    <script>window.__jsaction_bootstrap(document.body)</script>
    <script type="text/javascript" id="ng-event-dispatch-contract">var a=1</script>
    <script id="ng-state" type="application/json">{"x":"</"}</script>
    <script type="application/ld+json">{"@type":"Thing"}</script>
    <script src="main-ABC12345.js" type="module"></script></head></html>`;

  it('finds only the inline scripts that run', () => {
    expect(inlineScripts(html)).toEqual(['window.__jsaction_bootstrap(document.body)', 'var a=1']);
  });

  it('allows those scripts by hash and nothing inline besides', () => {
    const csp = contentSecurityPolicy(html);
    expect(csp).toContain(hash('window.__jsaction_bootstrap(document.body)'));
    expect(csp).toContain(hash('var a=1'));
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toMatch(/script-src 'self' 'sha256-[^;]*;/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('forbids framing, plugins, foreign bases and foreign forms', () => {
    const csp = contentSecurityPolicy('');
    for (const part of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "default-src 'self'",
    ])
      expect(csp).toContain(part);
  });

  it('allows pictures from extra hosts only when configured', () => {
    expect(contentSecurityPolicy('')).toContain("img-src 'self' data: blob:;");
    expect(contentSecurityPolicy('', 'https://cdn.example.uz')).toContain(
      'blob: https://cdn.example.uz;',
    );
  });

  it('lets the page reach the E-IMZO program on the same computer and the live socket', () => {
    const csp = contentSecurityPolicy('');
    expect(csp).toContain('wss://127.0.0.1:64443');
    expect(csp).toMatch(/connect-src[^;]*\bwss:/);
  });
});

describe('static file caching', () => {
  it('only files with a content hash in the name are immutable', () => {
    expect(isHashedAsset('/x/main-ZIGM4UDS.js')).toBe(true);
    expect(isHashedAsset('/x/styles-FEJEWSIK.css')).toBe(true);
    expect(isHashedAsset('/x/chunk-5A2vjAB1.js')).toBe(true);
    expect(isHashedAsset('/x/favicon.ico')).toBe(false);
    expect(isHashedAsset('/x/og-default.png')).toBe(false);
  });
});
