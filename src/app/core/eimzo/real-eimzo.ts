import { EimzoError, EimzoKey, EimzoProvider, EimzoSignInput } from './eimzo.provider';

/**
 * The parts of the E-IMZO web library (`e-imzo.js` and `e-imzo-client.js`, from the E-IMZO developers) that this site uses.
 * Checked against the demo of the E-IMZO developers (`e-imzo-doc`): the calls and their order are the ones of its
 * `e-imzo-init.js` and `e-imzo-client.js`.
 */
interface LibraryItem {
  serialNumber?: string;
  validTo?: string | Date;
  CN?: string;
  O?: string;
  [field: string]: unknown;
}

interface EimzoClientLibrary {
  API_KEYS: string[];
  checkVersion(
    success: (major: number, minor: number) => void,
    fail: (error: unknown, reason?: string) => void,
  ): void;
  installApiKeys(success: () => void, fail: (error: unknown, reason?: string) => void): void;
  listAllUserKeys(
    itemId: (item: LibraryItem, index: number) => string,
    itemUi: (id: string, item: LibraryItem) => LibraryItem,
    success: (items: LibraryItem[], firstId: string) => void,
    fail: (error: unknown, reason?: string) => void,
  ): void;
  loadKey(
    item: LibraryItem,
    success: (id: string) => void,
    fail: (error: unknown, reason?: string) => void,
    verifyPassword?: boolean,
  ): void;
  createPkcs7(
    id: string,
    data: string,
    timestamper: null,
    success: (pkcs7: string) => void,
    fail: (error: unknown, reason?: string) => void,
    detached?: boolean,
    isDataBase64Encoded?: boolean,
  ): void;
}

declare global {
  interface Window {
    EIMZOClient?: EimzoClientLibrary;
  }
}

/** The oldest E-IMZO program the library works with (3.37), as major * 100 + minor. */
const MIN_VERSION = 337;

/** A date of the library as `yyyy-mm-dd`; `null` when the certificate has none (the library gives an invalid date then). */
function isoDay(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

const SCRIPTS = ['/eimzo/e-imzo.js', '/eimzo/e-imzo-client.js'];

/** What the library says when it fails, in one line. */
function reasonOf(error: unknown, reason?: string): string {
  return [reason, typeof error === 'string' ? error : (error as Error | undefined)?.message]
    .filter(Boolean)
    .join(': ');
}

/** The E-IMZO program of the person's computer, through the library. */
export class RealEimzoProvider extends EimzoProvider {
  readonly kind = 'real' as const;

  private ready: Promise<EimzoClientLibrary> | null = null;

  constructor(
    private readonly document: Document,
    /** `[domain, key, domain, key, ...]`: the keys E-IMZO gives for each address the site is served from. */
    private readonly apiKeys: readonly string[],
  ) {
    super();
  }

  async listKeys(): Promise<EimzoKey[]> {
    const client = await this.prepare();
    const items = await new Promise<LibraryItem[]>((resolve, reject) =>
      client.listAllUserKeys(
        (item, index) => `${item.serialNumber ?? 'key'}-${index}`,
        (id, item) => ({ ...item, id }),
        (found) => resolve(found),
        (error, reason) => reject(new EimzoError('failed', reasonOf(error, reason))),
      ),
    );
    if (items.length === 0) throw new EimzoError('no-keys');
    return items.map((item) => ({
      id: String(item['id'] ?? item.serialNumber),
      owner: String(item.CN ?? ''),
      organisation: item.O ? String(item.O) : null,
      validTo: isoDay(item.validTo),
      handle: item,
    }));
  }

  async sign(key: EimzoKey, input: EimzoSignInput): Promise<string> {
    const client = await this.prepare();
    const loaded = await new Promise<string>((resolve, reject) =>
      client.loadKey(
        key.handle as LibraryItem,
        resolve,
        (error, reason) => reject(this.failure(error, reason)),
        // Not `true`: checking the password first opens the window twice and switches off "remember for 6 hours".
        false,
      ),
    );
    const data = input.kind === 'challenge' ? input.challenge : input.textBase64;
    return new Promise<string>((resolve, reject) =>
      client.createPkcs7(
        loaded,
        data,
        null,
        resolve,
        (error, reason) => reject(this.failure(error, reason)),
        false,
        input.kind === 'document',
      ),
    );
  }

  /** Loads the library once, hands it the site's keys and checks that the program answers. */
  private prepare(): Promise<EimzoClientLibrary> {
    this.ready ??= this.load().catch((error) => {
      this.ready = null;
      throw error;
    });
    return this.ready;
  }

  private async load(): Promise<EimzoClientLibrary> {
    if (!this.document.defaultView?.EIMZOClient) {
      try {
        // A missing file would be answered with the site's own page: look first, so nothing is loaded (and no error is
        // written to the console of every visitor) while the library is not on the site.
        for (const src of SCRIPTS)
          if (!(await this.exists(src))) throw new Error(`${src} is not on the site`);
        for (const src of SCRIPTS) await this.addScript(src);
      } catch {
        throw new EimzoError('library-missing');
      }
    }
    const client = this.document.defaultView?.EIMZOClient;
    if (!client) throw new EimzoError('library-missing');
    client.API_KEYS = [...this.apiKeys];
    await new Promise<void>((resolve, reject) =>
      client.checkVersion(
        (major, minor) =>
          Number(major) * 100 + Number(minor) < MIN_VERSION
            ? reject(new EimzoError('outdated'))
            : resolve(),
        () => reject(new EimzoError('not-installed')),
      ),
    );
    // With no keys of ours (a test address, "developer mode" of E-IMZO) E-IMZO v6 finds the key of the address itself.
    if (this.apiKeys.length > 0)
      await new Promise<void>((resolve, reject) =>
        client.installApiKeys(
          () => resolve(),
          (error, reason) => reject(new EimzoError('failed', reasonOf(error, reason))),
        ),
      );
    return client;
  }

  private async exists(src: string): Promise<boolean> {
    try {
      const answer = await fetch(src, { method: 'HEAD' });
      return answer.ok && /javascript|ecmascript/i.test(answer.headers.get('content-type') ?? '');
    } catch {
      return false;
    }
  }

  private addScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`${src} is not available`));
      this.document.head.appendChild(script);
    });
  }

  private failure(error: unknown, reason?: string): EimzoError {
    const text = reasonOf(error, reason);
    if (/cancel/i.test(text)) return new EimzoError('cancelled', text);
    if (/bad ?password|BadPadding|password/i.test(text))
      return new EimzoError('bad-password', text);
    return new EimzoError('failed', text);
  }
}
