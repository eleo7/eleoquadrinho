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
  async function readBlob(blob) {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
      reader.onabort = () => reject(new Error('A leitura do arquivo foi interrompida.'));
      reader.readAsArrayBuffer(blob);
    });
  }
  // Our exports use STORE. Read their directory first and each HQ separately,
  // instead of retaining a second copy of the entire package in mobile memory.
  async function openBlob(blob, Zip) {
    const tail = new Uint8Array(await readBlob(blob.slice(Math.max(0, blob.size - 65557))));
    const view = new DataView(tail.buffer); let end = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === tail.length) { end = i; break; }
    }
    if (end < 0) fail();
    const count = view.getUint16(end + 10, true), length = view.getUint32(end + 12, true), offset = view.getUint32(end + 16, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || count > 402 || length > 1024 * 1024 || offset + length !== blob.size - tail.length + end) fail();
    const directory = new Uint8Array(await readBlob(blob.slice(offset, offset + length)));
    const d = new DataView(directory.buffer), files = Object.create(null); let pos = 0, compressed = false;
    for (let n = 0; n < count; n++) {
      if (pos + 46 > length || d.getUint32(pos, true) !== 0x02014b50) fail();
      const flags = d.getUint16(pos + 8, true), method = d.getUint16(pos + 10, true);
      const packed = d.getUint32(pos + 20, true), size = d.getUint32(pos + 24, true);
      const nameLength = d.getUint16(pos + 28, true), extra = d.getUint16(pos + 30, true), comment = d.getUint16(pos + 32, true), local = d.getUint32(pos + 42, true);
      if (flags & 1 || ![0, 8].includes(method) || d.getUint16(pos + 34, true) || pos + 46 + nameLength + extra + comment > length || local + 30 > offset || (method === 0 && packed !== size)) fail();
      const name = new TextDecoder().decode(directory.subarray(pos + 46, pos + 46 + nameLength));
      if (Object.hasOwn(files, name)) fail();
      compressed ||= method !== 0;
      files[name] = { dir: name.endsWith('/'), _data: { uncompressedSize: size }, async: async type => {
        const header = new Uint8Array(await readBlob(blob.slice(local, local + 30)));
        const h = new DataView(header.buffer);
        if (h.getUint32(0, true) !== 0x04034b50 || h.getUint16(8, true) !== method || h.getUint16(6, true) !== flags) fail();
        const start = local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
        if (start + packed > offset) fail();
        const localName = new TextDecoder().decode(await readBlob(blob.slice(local + 30, local + 30 + h.getUint16(26, true))));
        if (localName !== name) fail();
        const data = new Uint8Array(await readBlob(blob.slice(start, start + packed)));
        return type === 'string' ? new TextDecoder().decode(data) : data;
      }};
      pos += 46 + nameLength + extra + comment;
    }
    if (pos !== length) fail();
    // Preserve compatibility with previously recompressed ZIP packages.
    return compressed ? Zip.loadAsync(await readBlob(blob)) : { files, file: name => files[name] };
  }
  async function unpack(bytes, Zip) {
    if ((bytes.size ?? bytes.byteLength) > LIMIT + 12 * 1024 * 1024) fail();
    const zip = bytes instanceof Blob ? await openBlob(bytes, Zip) : await Zip.loadAsync(bytes);
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
