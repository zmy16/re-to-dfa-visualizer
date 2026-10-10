// Membuat favicon dari logo.svg pada beberapa ukuran.
//
// Favicon ditampilkan sekecil 16 piksel di tab peramban, dan detail yang bagus
// pada 64 piksel sering menjadi noda pada 16 piksel. Skrip ini karena itu
// merender beberapa ukuran sekaligus supaya hasilnya bisa diperiksa, bukan
// diasumsikan.

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const KEMUNGKINAN_CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const chrome = KEMUNGKINAN_CHROME.find((jalur) => fs.existsSync(jalur));
if (!chrome) {
  console.error('Chrome/Edge tidak ditemukan.');
  process.exit(1);
}

const svg = fs.readFileSync('logo.svg', 'utf8');
// Hanya ukuran yang benar-benar dipakai halaman, plus 180 untuk ikon layar utama.
const UKURAN = [16, 32, 180];

// Satu halaman memuat semua ukuran berdampingan supaya bisa dibandingkan
// dalam sekali lihat.
const kotak = UKURAN.map((n) => `
  <div class="item">
    <div class="box" style="width:${n}px;height:${n}px">${svg.replace('<svg ', `<svg style="width:${n}px;height:${n}px" `)}</div>
    <div class="k">${n}px</div>
  </div>`).join('');

const halaman = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin:0; background:#F7F6F2; font-family:system-ui,sans-serif; padding:24px;
         display:flex; gap:32px; align-items:flex-end }
  .item { text-align:center }
  .box { display:grid; place-items:center }
  .box svg { display:block }
  .k { margin-top:10px; font-size:12px; color:#66666E; font-family:ui-monospace,monospace }
  /* Baris kedua: tampilan di tab peramban palsu, untuk menilai keterbacaan. */
  .tabbar { margin-top:28px; display:flex; gap:6px; align-items:center; background:#DEDAD2;
            padding:8px 8px 0; border-radius:10px 10px 0 0 }
  .tab { display:flex; align-items:center; gap:7px; background:#F7F6F2; padding:7px 14px;
         border-radius:8px 8px 0 0; font-size:13px; color:#121212 }
  .tab svg { width:16px; height:16px; display:block }
</style></head><body>
  <div style="display:flex;gap:32px;align-items:flex-end">${kotak}</div>
  <div class="tabbar"><div class="tab">${svg}RE to DFA Visualizer</div></div>
</body></html>`;

fs.writeFileSync('logo-preview.tmp.html', halaman);

const PORT = 4190;
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((selesai) => setTimeout(selesai, 1200));

try {
  // Pratinjau semua ukuran berdampingan.
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--window-size=760,300',
    '--screenshot=' + path.resolve('logo-preview.tmp.png'),
    `http://127.0.0.1:${PORT}/logo-preview.tmp.html`,
  ], { stdio: 'pipe', timeout: 60000 });

  // Favicon asli pada ukuran yang dipakai peramban.
  for (const n of UKURAN) {
    const satu = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:transparent}
      svg{display:block;width:${n}px;height:${n}px}
    </style></head><body>${svg}</body></html>`;
    fs.writeFileSync('logo-one.tmp.html', satu);
    execFileSync(chrome, [
      '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--default-background-color=00000000',
      `--window-size=${n},${n}`,
      `--screenshot=${path.resolve(n === 32 ? 'favicon-32.png' : n === 180 ? 'apple-touch-icon.png' : `icon-${n}.png`)}`,
      `http://127.0.0.1:${PORT}/logo-one.tmp.html`,
    ], { stdio: 'pipe', timeout: 60000 });
  }

  console.log('logo dan favicon dibuat.');
} finally {
  server.kill();
  fs.rmSync('logo-preview.tmp.html', { force: true });
  fs.rmSync('logo-one.tmp.html', { force: true });
}
