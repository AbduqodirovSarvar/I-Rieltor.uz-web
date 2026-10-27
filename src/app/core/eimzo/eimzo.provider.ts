import { InjectionToken } from '@angular/core';

/** A key (certificate) found on the person's computer, as the page shows it. */
export interface EimzoKey {
  id: string;
  /** The person's name on the certificate. */
  owner: string;
  /** The organisation, for a key of a legal entity. */
  organisation: string | null;
  /** The last day the key is valid (ISO date), if known. */
  validTo: string | null;
  /** What the provider needs to use the key again (the object of the E-IMZO library, or the fake's data). */
  handle: unknown;
}

/** What is to be signed: the one-time challenge of a sign-in, or the text of a document (an application). */
export type EimzoSignInput =
  { kind: 'challenge'; challenge: string } | { kind: 'document'; text: string; textBase64: string };

export type EimzoErrorCode =
  | 'library-missing' // e-imzo.js is not on the site
  | 'not-installed' // the E-IMZO program does not answer on this computer
  | 'outdated' // the E-IMZO program is older than the library works with
  | 'no-keys'
  | 'cancelled'
  | 'bad-password'
  | 'failed';

export class EimzoError extends Error {
  constructor(
    readonly code: EimzoErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'EimzoError';
  }
}

/** The way to the E-IMZO program: the real library, or a stand-in for local testing. */
export abstract class EimzoProvider {
  abstract readonly kind: 'real' | 'fake';
  /** The keys on this computer. Throws an `EimzoError`. */
  abstract listKeys(): Promise<EimzoKey[]>;
  /** Signs with the key (the program asks the person for the password). Returns the PKCS#7 the backend verifies. */
  abstract sign(key: EimzoKey, input: EimzoSignInput): Promise<string>;
}

export const EIMZO_PROVIDER = new InjectionToken<EimzoProvider>('EIMZO_PROVIDER');
