'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const entry of ['index.html', 'manifest.json', 'sw.js', 'js', 'css', 'assets']) {
  fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
}
console.log('Site gerado em dist; configurações e código de servidor não são publicados como arquivos estáticos.');

fs.copyFileSync(path.join(root, 'node_modules/jszip/dist/jszip.min.js'), path.join(out, 'js/jszip.min.js'));
fs.copyFileSync(path.join(root, 'node_modules/jszip/LICENSE.markdown'), path.join(out, 'js/jszip-LICENSE.txt'));
