import { EimzoError, EimzoKey, EimzoProvider, EimzoSignInput } from './eimzo.provider';

/**
 * The parts of the E-IMZO web library (`e-imzo.js` and `e-imzo-client.js`, from the E-IMZO developers) that this site uses.
 * Written from the library's public documentation; to be checked against the real files when they are added to
 * `public/eimzo/` (see the README there).
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
      validTo: item.validTo ? new Date(item.validTo).toISOString().slice(0, 10) : null,
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
        true,
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
        () => resolve(),
        () => reject(new EimzoError('not-installed')),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      client.installApiKeys(
        () => resolve(),
        (error, reason) => reject(new EimzoError('failed', reasonOf(error, reason))),
      ),
    );
    return client;
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
