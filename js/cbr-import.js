/* RAR decoding runs in a disposable worker; local imports never upload files. */
(function(root) {
  'use strict';
  async function convert(file) {
    if (!file.size || file.size > 500 * 1024 * 1024) throw new Error('O CBR deve ter entre 1 byte e 500 MB.');
    const bytes = await file.arrayBuffer();
    return new Promise((resolve,reject)=>{
      const worker = new Worker('/js/cbr-worker.js?v=cbr-20261018-17');
      const timer = setTimeout(()=>finish(new Error('A conversão do CBR demorou demais. Tente um arquivo menor.')),120000);
      function finish(error,result) { clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(result); }
      worker.onerror = () => finish(new Error('Não foi possível abrir o CBR neste dispositivo. Verifique a conexão e tente um arquivo menor.'));
      worker.onmessage = ({data}) => {
        if (data.error) return finish(new Error(data.error));
        if (!(data.bytes instanceof Uint8Array)) return finish(new Error('Falha ao converter o CBR.'));
        finish(null,new File([data.bytes],file.name.replace(/\.(cbr|rar)$/i,'.cbz'),{type:'application/zip',lastModified:file.lastModified}));
      };
      worker.postMessage(bytes,[bytes]);
    });
  }
  root.EQCBR = { convert };
})(globalThis);
