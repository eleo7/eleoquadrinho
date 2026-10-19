'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Zip = require('jszip');
const { pack, unpack } = require('../js/hq-package');
const book = () => ({ nome: 'HQ teste', formato: 'pdf', blob: new Blob([new Uint8Array([0, 255, 33, 90])]), capa: 'data:image/png;base64,YQ==', serieNome: 'Coleção', id: 'local:old', usuario: { senha: 'private' }, historico: [1], salvos: { foo: true }, storagePath: 'private-server.pdf', role: 'admin' });
test('portable binary round trip keeps cover and labels, excludes all account and server fields', async () => {
  const bytes = await pack([book()], Zip);
  const zip = await Zip.loadAsync(bytes); const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  for (const field of ['usuario', 'historico', 'salvos', 'id', 'storagePath', 'role']) assert.equal(manifest.books[0][field], undefined);
  const [restored] = await unpack(bytes, Zip);
  assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()), new Uint8Array([0, 255, 33, 90]));
  assert.equal(restored.capa, book().capa); assert.equal(restored.serieNome, 'Coleção'); assert.equal(restored.localOnly, true);
  assert.equal(restored.id, undefined);
});
test('tampered data rejects entire package even when earlier entries are valid', async () => {
  const zip = await Zip.loadAsync(await pack([book(), book()], Zip));
  zip.file('files/1.pdf', new Uint8Array([0, 255, 33, 91]));
  await assert.rejects(unpack(await zip.generateAsync({ type: 'uint8array' }), Zip));
});
test('unsupported manifests, unexpected entries and metadata-injected account fields cannot be imported', async () => {
  const zip = await Zip.loadAsync(await pack([book()], Zip));
  const m = JSON.parse(await zip.file('manifest.json').async('string'));
  m.books[0].role = 'admin'; m.books[0].storagePath = 'secret'; m.books[0].id = 'existing';
  zip.file('manifest.json', JSON.stringify(m));
  const [restored] = await unpack(await zip.generateAsync({ type: 'uint8array' }), Zip);
  assert.equal(restored.role, undefined); assert.equal(restored.storagePath, undefined); assert.equal(restored.id, undefined);
  zip.file('profile.json', '{}');
  await assert.rejects(unpack(await zip.generateAsync({ type: 'uint8array' }), Zip));
});
test('image albums become portable CBZs and preserve their order', async () => {
  const bytes = await pack([{ nome: 'Álbum', formato: 'imagens', blobs: [new Blob(['one'], { type: 'image/png' }), new Blob(['two'], { type: 'image/jpeg' })] }], Zip);
  const [restored] = await unpack(bytes, Zip); assert.equal(restored.formato, 'cbz');
  const album = await Zip.loadAsync(await restored.blob.arrayBuffer());
  assert.equal(await album.file('00000.png').async('string'), 'one');
  assert.equal(await album.file('00001.jpg').async('string'), 'two');
});
test('mobile Blob import reads bounded slices, checks hashes and preserves metadata', async () => {
  const bytes = await pack([{ ...book(), blob: new Blob([new Uint8Array(100000)]) }, book()], Zip);
  const input = new Blob([bytes]);
  input.arrayBuffer = () => { throw new Error('Must not buffer the entire package'); };
  const restored = await unpack(input, Zip);
  assert.equal(restored.length, 2); assert.equal(restored[0].blob.size, 100000);
  assert.equal(restored[1].serieNome, 'Coleção');
  const damaged = new Uint8Array(bytes); damaged[1000] ^= 1;
  await assert.rejects(unpack(new Blob([damaged]), Zip));
});
test('Blob import preserves compressed compatibility and rejects invalid directory and extra files', async () => {
  const zip = await Zip.loadAsync(await pack([book()], Zip));
  assert.equal((await unpack(new Blob([await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })]), Zip)).length, 1);
  zip.file('profile.json', '{}');
  await assert.rejects(unpack(new Blob([await zip.generateAsync({ type: 'uint8array' })]), Zip));
  await assert.rejects(unpack(new Blob(['not a package']), Zip));
  const bytes = await pack([book()], Zip);
  const malformed = new Uint8Array(bytes); new DataView(malformed.buffer).setUint32(malformed.length - 6, 1, true);
  await assert.rejects(unpack(new Blob([malformed]), Zip));
});
