import { createExtractorFromData } from '../node_modules/node-unrar-js/esm/index.esm.js';
import JSZip from 'jszip';
const MAX = 500 * 1024 * 1024;
self.onmessage = async ({data}) => {
  try {
    const response = await fetch('unrar.wasm?v=cbr-20261018-17');
    if (!response.ok) throw new Error('Não foi possível carregar o leitor CBR. Tente novamente com conexão.');
    const extractor = await createExtractorFromData({ data, wasmBinary: await response.arrayBuffer() });
    const list = extractor.getFileList();
    const headers = [...list.fileHeaders];
    if (list.arcHeader.flags.volume) throw new Error('CBR dividido em volumes não é suportado. Use um arquivo completo.');
    if (list.arcHeader.flags.headerEncrypted || headers.some(h => h.flags.encrypted)) throw new Error('CBR protegido por senha não é suportado. Remova a senha antes de importar.');
    // Bound all entries, including skipped files in solid archives, before decompression.
    if (headers.length > 10000 || headers.some(h => !Number.isSafeInteger(h.unpSize) || h.unpSize < 0 || h.unpSize > 50 * 1024 * 1024) || headers.reduce((sum,h)=>sum+h.unpSize,0) > MAX) throw new Error('CBR muito grande após descompactar: limite de 500 MB no total e 50 MB por arquivo.');
    const images = headers.filter(h => !h.flags.directory && /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(h.name) && !/(^|[\\/])(__MACOSX|\._)/.test(h.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
    if (!images.length) throw new Error('O CBR não contém páginas em formato de imagem suportado.');
    if (images.length > 2000) throw new Error('Use um CBR com até 2.000 páginas.');
    const order = new Map(images.map((h,i)=>[h.name,i]));
    if (order.size !== images.length) throw new Error('CBR inválido: páginas com nomes duplicados.');
    const zip = new JSZip(); let count = 0;
    for (const file of extractor.extract({files:h=>order.has(h.name)}).files) {
      if (!file.extraction) continue;
      const name = file.fileHeader.name;
      const index = order.get(name);
      if (index === undefined || file.extraction.length !== file.fileHeader.unpSize) throw new Error('Uma página do CBR está incompleta.');
      // Safe generated paths preserve natural page order and original image bytes.
      zip.file(String(index+1).padStart(5,'0') + '.' + name.split('.').pop().toLowerCase(), file.extraction);
      count++;
    }
    if (count !== images.length) throw new Error('Não foi possível extrair todas as páginas do CBR.');
    const bytes = await zip.generateAsync({type:'uint8array',compression:'STORE'});
    if (bytes.byteLength > MAX) throw new Error('O arquivo convertido ultrapassa o limite de 500 MB. Divida a HQ.');
    self.postMessage({bytes}, [bytes.buffer]);
  } catch(error) {
    const messages = {
      ERAR_MISSING_PASSWORD:'CBR protegido por senha. Remova a senha antes de importar.',
      ERAR_BAD_PASSWORD:'CBR protegido por senha. Remova a senha antes de importar.',
      ERAR_BAD_ARCHIVE:'CBR inválido ou danificado.',
      ERAR_BAD_DATA:'O CBR contém dados danificados ou incompletos.',
      ERAR_UNKNOWN_FORMAT:'Este arquivo não é um CBR/RAR válido.',
      ERAR_EOPEN:'CBR incompleto ou dividido em volumes. Use um arquivo completo.'
    };
    self.postMessage({error:messages[error.reason] || (error.reason ? 'Não foi possível abrir este CBR. Verifique se ele está completo e sem senha.' : error.message || 'Falha ao converter o CBR.')});
  }
};
