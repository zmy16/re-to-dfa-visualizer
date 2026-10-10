// Menyalin berkas aplikasi ke public/ untuk diterbitkan.
//
// Aplikasi ini statis dan tanpa dependensi, jadi tidak ada langkah build.
// Tujuannya hanya memisahkan apa yang terbit dari apa yang tidak: Design/,
// tests/, dan dokumen .md tetap di repositori tapi tidak ikut terbit.

import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public';

// Berkas dan folder yang membentuk aplikasi.
// og-image.png ikut karena dipakai meta tag Open Graph saat tautan dibagikan.
const ENTRIES = [
  'index.html',
  'styles.css',
  'src',
  'og-image.png',
  'robots.txt',
  'sitemap.xml',
];

fs.rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
fs.mkdirSync(OUT, { recursive: true });

let berkas = 0;
const salin = (dari, ke) => {
  const info = fs.statSync(dari);
  if (info.isDirectory()) {
    fs.mkdirSync(ke, { recursive: true });
    for (const isi of fs.readdirSync(dari)) salin(path.join(dari, isi), path.join(ke, isi));
    return;
  }
  fs.copyFileSync(dari, ke);
  berkas += 1;
};

for (const entri of ENTRIES) {
  if (!fs.existsSync(entri)) throw new Error(`Berkas wajib tidak ditemukan: ${entri}`);
  salin(entri, path.join(OUT, entri));
}

console.log(`public/ siap: ${berkas} berkas disalin.`);
