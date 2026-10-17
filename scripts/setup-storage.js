'use strict';
const { request } = require('../server/backend');
const { BUCKET, OBJECT_BYTES } = require('../server/comics');
(async () => {
  const buckets = await request('/storage/v1/bucket', { admin: true });
  const existing = buckets.find(bucket => bucket.id === BUCKET);
  if (existing) {
    if (existing.public) throw new Error('O bucket comics precisa ser privado. Revise a configuração no Supabase.');
    console.log('Bucket privado comics já disponível.');
    return;
  }
  await request('/storage/v1/bucket', { admin: true, method: 'POST', body: {
    id: BUCKET, name: BUCKET, public: false, file_size_limit: OBJECT_BYTES
  } });
  console.log('Bucket privado comics criado (50 MB por arquivo).');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
