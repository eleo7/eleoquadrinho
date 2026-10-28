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
fs.copyFileSync(path.join(root, 'supabase/community.sql'), path.join(out, 'assets/community.sql'));
fs.copyFileSync(path.join(root,'supabase/transfers.sql'),path.join(out,'assets/transfers.sql'));
console.log('Site gerado em dist; configurações e código de servidor não são publicados como arquivos estáticos.');

fs.copyFileSync(path.join(root, 'node_modules/jszip/dist/jszip.min.js'), path.join(out, 'js/jszip.min.js'));
fs.copyFileSync(path.join(root, 'node_modules/jszip/LICENSE.markdown'), path.join(out, 'js/jszip-LICENSE.txt'));

require('esbuild').buildSync({
  entryPoints: [path.join(root, 'scripts/cbr-worker.js')],
  outfile: path.join(out, 'js/cbr-worker.js'),
  bundle: true, platform: 'browser', format: 'iife', target: 'es2020', minify: true
});
fs.copyFileSync(path.join(root, 'node_modules/node-unrar-js/esm/js/unrar.wasm'), path.join(out, 'js/unrar.wasm'));
fs.copyFileSync(path.join(root, 'node_modules/node-unrar-js/LICENSE.md'), path.join(out, 'js/node-unrar-LICENSE.md'));
