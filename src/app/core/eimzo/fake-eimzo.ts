import { EimzoKey, EimzoProvider, EimzoSignInput } from './eimzo.provider';

interface FakeHandle {
  pinfl: string;
  legalInn: string | null;
  organisation: string | null;
}

/**
 * A stand-in for the E-IMZO program, for trying the pages without it (and for the end-to-end tests). It "signs" the way the
 * test E-IMZO server accepts (`development/tools/fake_eimzo_server.py`, `docker-compose.eimzo-fake.yml`): the result is plain
 * text, not a real signature, so a real server refuses it. Switched on in a browser only, by
 * `localStorage['irieltor.dev.fake-eimzo'] = '1'`.
 */
export class FakeEimzoProvider extends EimzoProvider {
  readonly kind = 'fake' as const;

  /** `ownPinfl`: one more key with this PINFL, first in the list (a test makes a new person each time). */
  constructor(ownPinfl?: string) {
    super();
    if (ownPinfl)
      this.keys.unshift(
        this.key(`fake-${ownPinfl}`, 'TEST FOYDALANUVCHI', null, {
          pinfl: ownPinfl,
          legalInn: null,
          organisation: null,
        }),
      );
  }

  /** The keys it offers: a person, and a person acting for an organisation. */
  private readonly keys: EimzoKey[] = [
    this.key('fake-person', 'VALIYEV ALI', null, {
      pinfl: '31234567890123',
      legalInn: null,
      organisation: null,
    }),
    this.key('fake-legal', 'VALIYEV ALI', 'RIELTOR SERVIS MCHJ', {
      pinfl: '31234567890123',
      legalInn: '301234567',
      organisation: 'RIELTOR SERVIS MCHJ',
    }),
  ];

  /** Other keys can be added by a test: a new person each time. */
  add(pinfl: string, owner = 'TEST FOYDALANUVCHI'): EimzoKey {
    const key = this.key(`fake-${pinfl}`, owner, null, {
      pinfl,
      legalInn: null,
      organisation: null,
    });
    this.keys.push(key);
    return key;
  }

  async listKeys(): Promise<EimzoKey[]> {
    return [...this.keys];
  }

  async sign(key: EimzoKey, input: EimzoSignInput): Promise<string> {
    const who = key.handle as FakeHandle;
    const legal = who.legalInn ?? '';
    return input.kind === 'challenge'
      ? `SIGNED|${input.challenge}|${who.pinfl}|${legal}|${who.organisation ?? ''}`
      : `ATT|${input.textBase64}|${who.pinfl}|${legal}`;
  }

  private key(
    id: string,
    owner: string,
    organisation: string | null,
    handle: FakeHandle,
  ): EimzoKey {
    return { id, owner, organisation, validTo: '2030-01-10', handle };
  }
}
