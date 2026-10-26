import { TestBed } from '@angular/core/testing';
import { EimzoError, EimzoKey } from './eimzo.provider';
import { FAKE_EIMZO_FLAG, createEimzoProvider } from './eimzo.service';
import { FakeEimzoProvider } from './fake-eimzo';
import { RealEimzoProvider } from './real-eimzo';

describe('the stand-in for E-IMZO', () => {
  it('offers a person and a person acting for an organisation', async () => {
    const keys = await new FakeEimzoProvider().listKeys();
    expect(keys.map((k) => k.organisation)).toEqual([null, 'RIELTOR SERVIS MCHJ']);
  });

  it('signs in the way the test server accepts: a challenge, and a document by its base64 text', async () => {
    const fake = new FakeEimzoProvider();
    const [person, legal] = await fake.listKeys();
    expect(await fake.sign(person, { kind: 'challenge', challenge: 'abc' })).toBe(
      'SIGNED|abc|31234567890123||',
    );
    expect(await fake.sign(legal, { kind: 'challenge', challenge: 'abc' })).toBe(
      'SIGNED|abc|31234567890123|301234567|RIELTOR SERVIS MCHJ',
    );
    expect(
      await fake.sign(person, { kind: 'document', text: 'Hello', textBase64: 'SGVsbG8=' }),
    ).toBe('ATT|SGVsbG8=|31234567890123|');
  });

  it('is chosen only when the browser asked for it', () => {
    localStorage.removeItem(FAKE_EIMZO_FLAG);
    expect(createEimzoProvider(document).kind).toBe('real');
    localStorage.setItem(FAKE_EIMZO_FLAG, '1');
    expect(createEimzoProvider(document).kind).toBe('fake');
    localStorage.removeItem(FAKE_EIMZO_FLAG);
  });
});

describe('the E-IMZO library adapter', () => {
  type Fail = (error: unknown, reason?: string) => void;
  let calls: string[];

  function install(over: Record<string, unknown> = {}) {
    calls = [];
    (window as unknown as { EIMZOClient: unknown }).EIMZOClient = {
      API_KEYS: [],
      checkVersion: (ok: () => void) => ok(),
      installApiKeys: (ok: () => void) => ok(),
      listAllUserKeys: (
        _id: unknown,
        _ui: unknown,
        ok: (items: unknown[], first: string) => void,
      ) => ok([{ serialNumber: 'AA11', CN: 'VALIYEV ALI', O: 'ORG', validTo: '2030-01-10' }], 'x'),
      loadKey: (_item: unknown, ok: (id: string) => void) => ok('loaded-1'),
      createPkcs7: (
        id: string,
        data: string,
        _t: null,
        ok: (p7: string) => void,
        _f: Fail,
        _d: boolean,
        b64: boolean,
      ) => {
        calls.push(`${id}|${data}|${b64}`);
        ok('PKCS7');
      },
      ...over,
    };
  }
  afterEach(() => delete (window as unknown as { EIMZOClient?: unknown }).EIMZOClient);

  const provider = () => new RealEimzoProvider(document, ['localhost', 'KEY']);

  it('hands the site keys to the library and lists the keys it finds', async () => {
    install();
    const keys = await provider().listKeys();
    expect(
      (window as unknown as { EIMZOClient: { API_KEYS: string[] } }).EIMZOClient.API_KEYS,
    ).toEqual(['localhost', 'KEY']);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({
      owner: 'VALIYEV ALI',
      organisation: 'ORG',
      validTo: '2030-01-10',
    });
  });

  it('signs a challenge as it is, and a document as base64', async () => {
    install();
    const p = provider();
    const [key] = await p.listKeys();
    expect(await p.sign(key, { kind: 'challenge', challenge: 'ch-1' })).toBe('PKCS7');
    expect(await p.sign(key, { kind: 'document', text: 'Hello', textBase64: 'SGVsbG8=' })).toBe(
      'PKCS7',
    );
    expect(calls).toEqual(['loaded-1|ch-1|false', 'loaded-1|SGVsbG8=|true']);
  });

  it('says "not installed" when the program does not answer, and "no keys" when there are none', async () => {
    install({ checkVersion: (_ok: () => void, fail: Fail) => fail('no program') });
    await expect(provider().listKeys()).rejects.toMatchObject({ code: 'not-installed' });

    install({
      listAllUserKeys: (_a: unknown, _b: unknown, ok: (items: unknown[], first: string) => void) =>
        ok([], ''),
    });
    await expect(provider().listKeys()).rejects.toMatchObject({ code: 'no-keys' });
  });

  it('tells a cancelled signing and a wrong key password from other failures', async () => {
    const withLoadFailure = (reason: string) =>
      install({ loadKey: (_i: unknown, _ok: unknown, fail: Fail) => fail('x', reason) });
    const key = { id: '1', owner: '', organisation: null, validTo: null, handle: {} } as EimzoKey;
    const attempt = () => provider().sign(key, { kind: 'challenge', challenge: 'c' });

    withLoadFailure('User cancelled');
    await expect(attempt()).rejects.toMatchObject({ code: 'cancelled' });
    withLoadFailure('BadPaddingException');
    await expect(attempt()).rejects.toMatchObject({ code: 'bad-password' });
    withLoadFailure('something else');
    const error = await attempt().catch((e) => e);
    expect(error).toBeInstanceOf(EimzoError);
    expect(error.code).toBe('failed');
  });

  it('a failing key search is reported, with the library reason', async () => {
    install({
      listAllUserKeys: (_a: unknown, _b: unknown, _ok: unknown, fail: Fail) =>
        fail('boom', 'reason'),
    });
    await expect(provider().listKeys()).rejects.toMatchObject({ code: 'failed' });
    TestBed.resetTestingModule();
  });
});
