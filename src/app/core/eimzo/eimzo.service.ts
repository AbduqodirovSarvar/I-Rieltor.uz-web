import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiClient } from '../http/api-client';
import { EIMZO_PROVIDER, EimzoKey, EimzoProvider } from './eimzo.provider';
import { FakeEimzoProvider } from './fake-eimzo';
import { RealEimzoProvider } from './real-eimzo';

export const FAKE_EIMZO_FLAG = 'irieltor.dev.fake-eimzo';
/** Optional: the PINFL of one more key the stand-in offers (end-to-end tests make a new person each time). */
export const FAKE_EIMZO_PINFL = 'irieltor.dev.fake-eimzo-pinfl';

/** The real library, unless this browser asked for the stand-in (local testing, end-to-end tests). */
export function createEimzoProvider(document: Document): EimzoProvider {
  try {
    const storage = document.defaultView?.localStorage;
    if (storage?.getItem(FAKE_EIMZO_FLAG) === '1')
      return new FakeEimzoProvider(storage.getItem(FAKE_EIMZO_PINFL) ?? undefined);
  } catch {
    // Storage blocked: the real one.
  }
  return new RealEimzoProvider(document, environment.eimzoApiKeys);
}

/** Signing with E-IMZO for the pages: the keys of this computer, a sign-in challenge, an application text. */
@Injectable({ providedIn: 'root' })
export class EimzoService {
  private readonly api = inject(ApiClient);
  private readonly document = inject(DOCUMENT);
  private readonly provider: EimzoProvider =
    inject(EIMZO_PROVIDER, { optional: true }) ?? createEimzoProvider(this.document);

  get isFake(): boolean {
    return this.provider.kind === 'fake';
  }

  keys(): Promise<EimzoKey[]> {
    return this.provider.listKeys();
  }

  /** A fresh one-time challenge from the backend, signed with the key: what sign-in, sign-up, reset and linking send. */
  async signChallenge(key: EimzoKey): Promise<string> {
    const answer = await firstValueFrom(
      this.api.get<{ challenge: string }>('api/Auth/eimzo/challenge'),
    );
    return this.provider.sign(key, { kind: 'challenge', challenge: answer.challenge });
  }

  /** The text of an application, signed: the backend checks that it is exactly the text it showed. */
  signDocument(key: EimzoKey, text: string, textBase64: string): Promise<string> {
    return this.provider.sign(key, { kind: 'document', text, textBase64 });
  }
}
