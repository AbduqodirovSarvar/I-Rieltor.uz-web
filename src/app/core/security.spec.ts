import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts') && !name.endsWith('schema.d.ts')
      ? [path]
      : [];
  });
}

describe('security rules for the source', () => {
  const files = sources(join(process.cwd(), 'src'));
  const read = (f: string) => readFileSync(f, 'utf8');

  it('scans the real source tree', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never renders raw HTML or turns off Angular sanitization', () => {
    const offenders = files.filter((f) =>
      /\[innerHTML\]|\.innerHTML\s*=|bypassSecurityTrust|outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(
        read(f),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('does not write tokens or the session to the console', () => {
    const offenders = files.filter((f) =>
      /console\.\w+\([^)]*(accessToken|refreshToken|session)/i.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps tokens only in token-store', () => {
    for (const f of files.filter((f) => /localStorage|sessionStorage/.test(read(f)))) {
      const uses =
        read(f)
          .match(/(local|session)Storage\.\w+\([^)]*\)/g)
          ?.join(' ') ?? '';
      if (/Token|session/i.test(uses)) expect(f).toContain('token-store');
    }
  });

  it('opens links to other sites safely', () => {
    const offenders = files.filter((f) => {
      const text = read(f);
      return /target="_blank"/.test(text) && !/rel="noopener noreferrer"/.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it('touches window, document and localStorage only through DOCUMENT in core and shared code', () => {
    // A bare `window.` or `localStorage.` breaks on the server. The showcase is development-only and browser-only.
    const offenders = files
      .filter((f) => !f.includes('dev') && !f.endsWith('server.ts') && !f.includes('main'))
      .filter((f) =>
        /(^|[^.\w])(window|localStorage|sessionStorage|navigator)\./m.test(
          read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
