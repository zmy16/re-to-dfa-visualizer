// Membuat og-image.png (1200x630) untuk pratinjau tautan.
//
// Gambar dirender Chrome headless dari halaman HTML yang memakai modul ES
// aplikasi (src/engine.js dan src/diagram.js). Pendekatan ini dipilih karena:
//
//  1. Font dan tema pasti sama dengan aplikasi, bukan tebakan gaya.
//  2. Geometri diagram dihitung kode yang sama dengan yang dipakai aplikasi,
//     jadi sisinya menempel dan labelnya tidak bertumpuk.
//
// Halaman disajikan lewat server HTTP sementara, karena browser memblokir modul
// ES dari file:// akibat kebijakan CORS.
//
// Catatan penting: server dijalankan sebagai proses terpisah, bukan di dalam
// proses Node yang sama. Bila server dan Chrome berjalan di satu proses,
// keduanya saling menunggu dan prosesnya menggantung tanpa pernah selesai.

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
  console.error('Chrome/Edge tidak ditemukan; tidak bisa merender og-image.png.');
  process.exit(1);
}

const PORT = 4189;
const HALAMAN = 'og-render.tmp.html';

// Font mengikuti aplikasi: sistem sans untuk teks, ui-monospace untuk simbol
// dan nama state. Gaya diagram disalin dari styles.css agar tampilannya identik.
const isi = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><style>
  @page { margin: 0 }
  * { box-sizing: border-box; margin: 0; padding: 0 }
  html, body { width: 1200px; height: 630px; overflow: hidden }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background: #F7F6F2;
    color: #121212;
    position: relative;
  }
  .grid {
    position: absolute; inset: 0;
    background-image: radial-gradient(#D4CFC7 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #C85A32 }
  .pad { position: relative; padding: 48px 72px }
  h1 { font-size: 44px; font-weight: 650; letter-spacing: -0.02em }
  .sub { margin-top: 10px; font-size: 20px; color: #66666E; max-width: 44ch; line-height: 1.4 }
  .two { display: flex; gap: 40px; margin-top: 30px; align-items: flex-start }
  .left { width: 480px; flex: none }
  .label {
    font-family: ui-monospace, Consolas, "Courier New", monospace;
    font-size: 13px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: #66666E;
  }
  .expr {
    margin-top: 10px;
    display: inline-block;
    font-family: ui-monospace, Consolas, "Courier New", monospace;
    font-size: 30px; font-weight: 650;
    background: #fff; border: 1.5px solid #8A8277; border-radius: 8px;
    padding: 10px 16px;
  }
  ol { margin-top: 26px; list-style: none; counter-reset: n }
  li {
    counter-increment: n;
    font-size: 17px; line-height: 1.3; padding-left: 26px; position: relative;
    margin-bottom: 10px; max-width: 38ch;
  }
  li::before { content: counter(n); position: absolute; left: 0; top: 0; color: #C85A32; font-weight: 700 }
  .right { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start }
  /* Lebar dikunci 340px: pada 420px diagramnya terpotong tepi bawah kanvas. */
  #diagram svg { display: block; width: 340px; height: auto; margin-top: 4px }
  .caption {
    margin-top: 8px;
    font-family: ui-monospace, Consolas, "Courier New", monospace;
    font-size: 13px; color: #66666E;
  }
  .state-circle { fill: #fff; stroke: #121212; stroke-width: 1.75 }
  .state-circle--accept-inner { fill: none; stroke: #121212; stroke-width: 1.75 }
  .state-group.is-accept .state-circle--accept-inner { stroke: #C85A32 }
  .state-label { font-family: ui-monospace, Consolas, monospace; font-size: 15px; font-weight: 650; fill: #121212 }
  .state-positions { font-family: ui-monospace, Consolas, monospace; font-size: 9.5px; fill: #66666E }
  .edge { stroke: #D4CFC7; stroke-width: 1.25; fill: none }
  .edge-label { font-family: ui-monospace, Consolas, monospace; font-size: 11px; fill: #121212 }
  .edge-label-bg { fill: #F7F6F2; stroke: #D4CFC7 }
  .start-arrow { stroke: #66666E; stroke-width: 1.5; fill: none }
  .arrow-head { fill: #6E6A62 }
  .grid-dot { fill: #D4CFC7 }
</style></head><body>
  <div class="grid"></div>
  <div class="bar"></div>
  <div class="pad">
    <h1>RE to DFA Visualizer</h1>
    <p class="sub">Konversi Regular Expression ke DFA lewat syntax tree dan followpos, tanpa NFA perantara.</p>

    <div class="two">
      <div class="left">
        <div class="label">Ekspresi</div>
        <div class="expr">(a|b)*abb</div>
        <ol>
          <li>Syntax tree beranotasi firstpos dan lastpos</li>
          <li>Tabel followpos dengan penjelasan tiap aturan</li>
          <li>Tabel dan diagram DFA minimum</li>
          <li>Simulator string langkah demi langkah</li>
        </ol>
      </div>
      <div class="right">
        <div class="label">DFA minimum</div>
        <div id="diagram"></div>
        <div class="caption" id="caption"></div>
      </div>
    </div>
  </div>
  <script type="module">
    import { convert } from './src/engine.js';
    import { buildDiagramSvg } from './src/diagram.js';

    const hasil = convert('(a|b)*abb');
    const view = hasil.views.min;
    document.getElementById('diagram').appendChild(buildDiagramSvg(view));
    document.getElementById('caption').textContent =
      view.states.length + ' state minimum dari ' + hasil.views.raw.states.length + ' state hasil konstruksi langsung';
  </script>
</body></html>`;

fs.writeFileSync(HALAMAN, isi);

// Server dijalankan sebagai proses terpisah lewat scripts/serve.mjs.
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

// Beri waktu server siap sebelum Chrome diminta membuka halaman.
await new Promise((selesai) => setTimeout(selesai, 1200));

try {
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--window-size=1200,630',
    '--screenshot=' + path.resolve('og-image.png'),
    `http://127.0.0.1:${PORT}/${HALAMAN}`,
  ], { stdio: 'pipe', timeout: 90000 });

  console.log(`og-image.png dibuat: ${(fs.statSync('og-image.png').size / 1024).toFixed(1)} KB`);
} finally {
  server.kill();
  fs.rmSync(HALAMAN, { force: true });
}
