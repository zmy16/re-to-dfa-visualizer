// Membuat og-image.png (1200x630) untuk pratinjau tautan.
//
// Kartunya digambar sebagai HTML lalu dirender Chrome headless. Isinya dibuat
// dari data sungguhan: ekspresi, jumlah state, dan diagramnya dihitung oleh
// kode yang sama dengan aplikasi (src/engine.js dan src/diagram.js), sehingga
// angka pada kartu tidak pernah berbeda dari yang dilihat pengguna.
//
// Halaman disajikan lewat server HTTP sementara karena browser memblokir modul
// ES dari file://. Server dijalankan sebagai proses terpisah: bila server dan
// Chrome berjalan di satu proses, keduanya saling menunggu dan menggantung.

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

// Warna diambil dari styles.css agar kartu dan aplikasi memakai bahasa visual
// yang sama: kanvas hangat, tinta gelap, satu aksen terracotta.
const isi = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><style>
  @page { margin: 0 }
  * { box-sizing: border-box; margin: 0; padding: 0 }
  html, body { width: 1200px; height: 630px; overflow: hidden }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background: #F7F6F2;
    color: #121212;
    display: flex;
    flex-direction: column;
  }
  /* Kartu mengisi penuh kanvas tanpa bingkai luar dan tanpa sudut membulat,
     supaya tidak ada garis gelap di tepi gambar pratinjau. */
  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  /* Bilah atas: identitas alat di kiri, penanda status di kanan. */
  .top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 46px;
    background: #1C1B19; color: #F7F6F2;
  }
  .top .title { display: flex; align-items: center; gap: 14px }
  .mark {
    width: 38px; height: 38px; border-radius: 9px;
    background: #C85A32; color: #fff;
    display: grid; place-items: center;
    font-family: ui-monospace, Consolas, monospace; font-size: 19px; font-weight: 700;
  }
  .top .name { font-size: 17px; font-weight: 650; letter-spacing: 0.02em }
  .meta {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
    color: #A5A099;
  }
  .badge {
    display: flex; align-items: center; gap: 9px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
    color: #E8BC77;
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #7FC79B }

  /* Bagian tengah: judul besar di kiri, diagram di kanan. */
  .mid { flex: 1; display: flex; padding: 34px 46px 0; gap: 24px; min-height: 0 }
  .left { width: 560px; flex: none; display: flex; flex-direction: column }
  h1 {
    font-size: 54px; line-height: 1.0; font-weight: 700; letter-spacing: -0.035em;
  }
  h1 .accent { color: #C85A32 }
  .lead {
    margin-top: 14px; font-size: 19px; line-height: 1.45; color: #55524C; max-width: 38ch;
  }
  .expr {
    margin-top: 20px;
    display: inline-flex; align-items: center; gap: 12px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 25px; font-weight: 650;
    background: #fff; border: 1.5px solid #8A8277; border-radius: 9px;
    padding: 8px 16px; width: fit-content;
  }
  .expr .cmp { color: #66666E; font-weight: 400; font-size: 17px }
  .expr .in { font-weight: 700 }
  /* Kalimat penutup mengisi ruang bawah kolom kiri supaya tidak kosong. */
  .note {
    margin-top: auto; padding-bottom: 22px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 14px; color: #66666E; letter-spacing: 0.02em;
  }
  .right { flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0 }
  /* Diagram diberi bingkai tipis agar tidak tampak melayang di ruang kosong. */
  #diagram {
    border: 1.5px solid #D4CFC7; border-radius: 12px; background: #fff;
    padding: 4px;
  }
  #diagram svg { display: block; width: 390px; height: auto }

  /* Baris statistik: angkanya dihitung dari hasil konversi sungguhan. */
  .stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: #1C1B19; color: #F7F6F2;
  }
  .stat { padding: 14px 46px; border-right: 1px solid #3A3833 }
  .stat:last-child { border-right: none }
  .stat .k {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #A5A099;
  }
  .stat .v {
    margin-top: 4px;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 25px; font-weight: 700; color: #C85A32;
  }
  .stat .v small { font-size: 14px; color: #A5A099; font-weight: 400; margin-left: 6px }

  /* Gaya diagram disalin dari styles.css supaya tampilannya identik. */
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
  <div class="card">
    <div class="top">
      <div class="title">
        <div class="mark">ε</div>
        <div class="name">RE to DFA Visualizer</div>
      </div>
      <div class="meta">Syntax tree &middot; followpos</div>
      <div class="badge"><span class="dot"></span> Berjalan di peramban</div>
    </div>

    <div class="mid">
      <div class="left">
        <h1>Regular expression <span class="accent">menjadi DFA</span>, tanpa NFA perantara.</h1>
        <p class="lead">Setiap tahap perhitungan ditampilkan, dari syntax tree sampai tabel transisi.</p>
        <div class="expr"><span class="cmp">Masukan</span> <span class="in" id="masukan"></span></div>
        <div class="note" id="catatan"></div>
      </div>
      <div class="right">
        <div id="diagram"></div>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><div class="k">State minimum</div><div class="v" id="s-min"></div></div>
      <div class="stat"><div class="k">Konstruksi langsung</div><div class="v" id="s-raw"></div></div>
      <div class="stat"><div class="k">Posisi daun</div><div class="v" id="s-pos"></div></div>
      <div class="stat"><div class="k">Alfabet</div><div class="v" id="s-alfa"></div></div>
    </div>
  </div>
  <script type="module">
    import { convert } from './src/engine.js';
    import { buildDiagramSvg } from './src/diagram.js';

    const EXPRESI = '(a|b)*ab(a|b)*';
    const hasil = convert(EXPRESI);
    const min = hasil.views.min;
    const raw = hasil.views.raw;

    document.getElementById('masukan').textContent = EXPRESI;
    document.getElementById('diagram').appendChild(buildDiagramSvg(min));
    document.getElementById('s-min').textContent = min.states.length;
    document.getElementById('s-raw').innerHTML = raw.states.length + '<small>state</small>';
    document.getElementById('s-pos').innerHTML = hasil.leaves.length + '<small>posisi</small>';
    document.getElementById('s-alfa').innerHTML = hasil.alphabet.length + '<small>simbol</small>';

    // Kalimat ini dihitung dari data, bukan ditulis tetap, supaya tidak pernah
    // berbeda dari kenyataan. Kalau tidak ada penghematan, bunyinya berubah.
    document.getElementById('catatan').textContent = min.states.length < raw.states.length
      ? 'Minimisasi menggabungkan ' + raw.states.length + ' state konstruksi langsung menjadi ' + min.states.length + ' state.'
      : 'Konstruksi langsung sudah menghasilkan DFA minimum: ' + min.states.length + ' state.';
  </script>
</body></html>`;

fs.writeFileSync(HALAMAN, isi);

const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
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
