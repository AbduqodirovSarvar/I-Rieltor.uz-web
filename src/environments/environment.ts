export const environment = {
  production: true,
  /** The public address of the site, for canonical links and the sitemap. No trailing slash. */
  siteUrl: 'https://i-rieltor.uz',
  /**
   * Keys that E-IMZO issues for the addresses the site is served from, as `[domain, key, domain, key, ...]`. Given by the
   * E-IMZO developers for each domain; empty until they are.
   */
  eimzoApiKeys: [] as string[],
};
