import { enAuth } from './en-auth';
import { enBase } from './en-base';
import { enDeals } from './en-deals';
import { enEimzo } from './en-eimzo';
import { enObject } from './en-object';
import { enPages } from './en-pages';
import type { Dictionary } from './uz';

/** English. The keys must match `uz.ts`: the compiler checks it. */
export const en: Dictionary = {
  ...enBase,
  ...enPages,
  ...enObject,
  ...enAuth,
  ...enDeals,
  ...enEimzo,
};
