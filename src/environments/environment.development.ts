export const environment = {
  production: false,
  siteUrl: 'http://localhost:4200',
  /**
   * Keys that E-IMZO issues for the addresses the site is served from, as `[domain, key, domain, key, ...]`. Given by the
   * E-IMZO developers for each domain; empty until they are.
   */
  eimzoApiKeys: [] as string[],
};
