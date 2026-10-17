/* Portable HQ files only: never profile, history, cookies or cloud references. */
(function (root) {
  'use strict';
  const LIMIT = 500 * 1024 * 1024;
  const formats = ['pdf', 'cbz', 'epub', 'txt'];
  const fail = () => { throw new Error('Pacote de HQs inválido, incompleto ou acima de 500 MB.'); };
  function metadata(o) {
    const result = {};
    for (const key of ['nome', 'sub', 'resumo', 'autor', 'colecao', 'formatoObra', 'serieNome', 'heroiNome']) {
      if (typeof o[key] === 'string') result[key] = o[key].slice(0, key === 'resumo' ? 10000 : 300);
    }
    for (const key of ['paginas', 'edicaoNum']) if (Number.isSafeInteger(o[key]) && o[key] >= 0) result[key] = o[key];
    if (typeof o.capa === 'string' && o.capa.length <= 2 * 1024 * 1024 && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(o.capa)) result.capa = o.capa;
    return result;
  }
  async function hash(bytes) {
    return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  }
  async function pack(items, Zip) {
    if (!items.length || items.length > 200) fail();
    let size = 0;
    for (const o of items) { size += o.blob?.size || o.blobs?.reduce((n, b) => n + b.size, 0) || 0; if (size > LIMIT) fail(); }
    const zip = new Zip(); const books = [];
    for (const [i, o] of items.entries()) {
      let blob = o.blob, format = o.formato;
      if (format === 'imagens' && o.blobs?.length) {
        const album = new Zip();
        for (const [n, image] of o.blobs.entries()) {
          const ext = ({'image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'})[image.type] || 'jpg';
          album.file(String(n).padStart(5, '0') + '.' + ext, await image.arrayBuffer());
        }
        blob = new Blob([await album.generateAsync({ type: 'uint8array', compression: 'STORE' })]); format = 'cbz';
      }
      if (!blob || !formats.includes(format)) fail();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const file = `files/${i}.${format}`;
      zip.file(file, bytes);
      books.push({ ...metadata(o), formato: format, file, size: bytes.length, hash: await hash(bytes) });
    }
    const manifest = JSON.stringify({ app: 'EleoQuadrinho-HQs', version: 1, books });
    if (manifest.length > 10 * 1024 * 1024 || books.reduce((n, b) => n + b.size, 0) > LIMIT) fail();
    zip.file('manifest.json', manifest);
    return zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  }
  async function unpack(bytes, Zip) {
    if (bytes.byteLength > LIMIT + 12 * 1024 * 1024) fail();
    const zip = await Zip.loadAsync(bytes);
    const files = Object.values(zip.files).filter(f => !f.dir);
    let expanded = 0;
    for (const f of files) {
      const n = f._data?.uncompressedSize;
      if (!Number.isSafeInteger(n) || n < 0) fail();
      expanded += n;
    }
    if (files.length > 201 || expanded > LIMIT + 10 * 1024 * 1024) fail();
    const entry = zip.file('manifest.json');
    if (!entry || entry._data.uncompressedSize > 10 * 1024 * 1024) fail();
    const manifest = JSON.parse(await entry.async('string'));
    if (manifest.app !== 'EleoQuadrinho-HQs' || manifest.version !== 1 || !Array.isArray(manifest.books) || !manifest.books.length || manifest.books.length > 200) fail();
    const books = []; const paths = new Set(); let total = 0;
    for (const b of manifest.books) {
      if (!b || !formats.includes(b.formato) || !new RegExp('^files/\\d+\\.' + b.formato + '$').test(b.file) || paths.has(b.file)) fail();
      paths.add(b.file);
      const file = zip.file(b.file);
      if (!file || !Number.isSafeInteger(b.size) || b.size <= 0 || file._data.uncompressedSize !== b.size || !/^[a-f0-9]{64}$/.test(b.hash)) fail();
      total += b.size; if (total > LIMIT) fail();
      const content = await file.async('uint8array');
      if (content.length !== b.size || await hash(content) !== b.hash) fail();
      books.push({ ...metadata(b), nome: metadata(b).nome || 'HQ importada', formato: b.formato, blob: new Blob([content]), packageHash: b.hash, localOnly: true });
    }
    if (files.length !== paths.size + 1) fail();
    return books;
  }
  const api = { pack, unpack, LIMIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EQHQPackage = api;
})(globalThis);
