// Server statis untuk pengembangan lokal.
//
// index.html memuat src/app.js sebagai modul ES, dan browser memblokir modul
// dari file:// karena kebijakan CORS. Jadi aplikasi harus dibuka lewat server,
// bukan dengan klik dua kali pada index.html.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 4173);

const TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relatif = url === '/' ? 'index.html' : url.slice(1);
  const berkas = path.resolve(ROOT, relatif);

  // Menolak lintasan yang keluar dari folder proyek.
  if (!berkas.startsWith(ROOT + path.sep) && berkas !== path.join(ROOT, 'index.html')) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Akses ditolak.');
    return;
  }

  fs.readFile(berkas, (error, isi) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`Tidak ditemukan: ${relatif}`);
      return;
    }
    res.writeHead(200, {
      'content-type': TIPE[path.extname(berkas)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(isi);
  });
}).listen(PORT, () => {
  console.log(`RE to DFA Visualizer berjalan di http://localhost:${PORT}`);
});
