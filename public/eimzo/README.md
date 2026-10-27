# E-IMZO library files

`e-imzo.js` (the WebSocket link to the E-IMZO program, `CAPIWS`) and `e-imzo-client.js` (`EIMZOClient`: keys, PKCS#7) are the
files of the E-IMZO developers, taken from their demo (`example.uz/php/demo`). The site loads them from `/eimzo/` the first
time a page needs a signature (`src/app/core/eimzo/real-eimzo.ts`). Replace them when the developers publish new ones.

Keys that E-IMZO issues for each domain are in `eimzoApiKeys` of `src/environments/environment*.ts`
(`['i-rieltor.uz', '<key>', ...]`). The two keys already there (`localhost`, `127.0.0.1`) are the public ones of the demo, good
for local pages only. A production domain needs its own key; a test domain or IP uses "developer mode" in the E-IMZO tray menu.
