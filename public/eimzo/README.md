# E-IMZO library files

Put the two files of the E-IMZO web library here (from the E-IMZO developers):

- `e-imzo.js`
- `e-imzo-client.js`

The site loads them from `/eimzo/` the first time a page needs a signature (`src/app/core/eimzo/real-eimzo.ts`). Also needed:
the keys that E-IMZO issues for each domain, in `eimzoApiKeys` of `src/environments/environment.ts` as
`['i-rieltor.uz', '<key>', 'localhost', '<key>']`.

Without the files the pages say that E-IMZO is not available on the site.
