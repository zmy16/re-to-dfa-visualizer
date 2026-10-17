// Membuat gambar banner 1200x630 untuk README dan pratinjau tautan.
//
// Kenapa me-render lewat aplikasinya sendiri, bukan menggambar ulang:
// geometri pohon dan diagram DFA sudah ada di src/app.js dan src/diagram.js.
// Kalau gambarnya digambar ulang di sini, bentuknya lama-lama berbeda dari
// aplikasi. Jadi halaman aplikasi dibuka di Chrome, diisi ekspresi, lalu
// bagian yang dibutuhkan dipindahkan ke panggung 1200x630 dan dipotret.
//
// Data yang dipakai: (a|b)*abb. Dihitung engine sungguhan, bukan ditulis
// manual: 12 node pohon, 6 baris followpos, 4 state, 8 transisi.
//
// Pakai: node scripts/make-banner.mjs
// Hasil: banner-github.png

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const KEMUNGKINAN = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
];
const chrome = KEMUNGKINAN.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Chrome tidak ditemukan.');

const PORT = 4199;
const SEMENTARA = 'banner-server.tmp.mjs';
const PROFIL = 'banner-profil.tmp';
const KELUAR = path.resolve('banner-github.png');

// Server sebagai proses sendiri; Chrome dan server tidak boleh satu proses.
fs.writeFileSync(SEMENTARA, `
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const JENIS = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x').pathname;
  // Halaman banner disajikan dari asal yang sama dengan aplikasi, supaya
  // skrip boleh membaca isi iframe. Kalau halaman dibuka lewat file://,
  // Chrome memblokir akses lintas-asal dan semua SVG jadi null.
  const p = u === '/banner' ? 'banner.tmp.html' : (u === '/' ? 'index.html' : u.slice(1));
  if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': JENIS[path.extname(p)] || 'text/plain' });
  s.end(fs.readFileSync(p));
}).listen(${PORT}, '127.0.0.1', () => console.log('siap'));
`);

const server = spawn(process.execPath, [SEMENTARA], { stdio: 'ignore' });
await new Promise((ok) => setTimeout(ok, 1200));

// Halaman banner: memuat aplikasi, mengambil pohon dan diagramnya, lalu
// menyusunnya jadi satu komposisi 1200x630.
const HALAMAN = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { background: #F7F6F2; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #121212; }
  .panggung { position: relative; width: 1200px; height: 630px; }
  /* Kisi titik: sama dengan kanvas diagram di aplikasi, jadi bidangnya terasa satu keluarga. */
  .kisi { position: absolute; inset: 0;
    background-image: radial-gradient(#D4CFC7 1.5px, transparent 1.5px);
    background-size: 30px 30px; opacity: .55; }
  .cahaya { position: absolute; inset: 0;
    background: radial-gradient(52% 46% at 22% 30%, rgba(200,90,50,.10), transparent 70%),
                radial-gradient(46% 42% at 82% 74%, rgba(168,55,24,.07), transparent 72%); }
  .isi { position: absolute; inset: 0; padding: 46px 54px 40px; display: flex; flex-direction: column; }

  header { display: flex; align-items: center; gap: 14px; }
  header img { width: 34px; height: 34px; display: block; }
  header h1 { font-size: 25px; font-weight: 650; letter-spacing: -.015em; }
  .tahap { margin-top: 10px; font-size: 19px; color: #66666E; letter-spacing: .01em; }

  .jalur { flex: 1; display: grid; grid-template-columns: 268px 44px 336px 44px 1fr;
    align-items: center; gap: 0; margin-top: 6px; }

  .kotak { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .label { font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase; letter-spacing: .17em; color: #6B6B74;
    background: #F7F6F2; padding: 5px 9px; border-radius: 4px; }

  /* Ekspresi: monospace besar, seperti di kolom input aplikasi. */
  .ekspresi { font: 600 40px/1.1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: -.01em; }
  .aug { font: 400 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #6B6B74; text-align: center; }

  /* Panah antar tahap: satu garis dengan kepala, warna aksen. */
  .panah { display: flex; align-items: center; justify-content: center; }
  .panah svg { display: block; }

  /* Kanvas pohon: skala dari ukuran aslinya supaya tetap terbaca di banner. */
  .pohon, .panel-dfa { width: 100%; overflow: hidden; display: flex;
    align-items: center; justify-content: center; }
  .pohon svg, .panel-dfa svg { display: block; max-width: 100%; height: auto; }

  .kaki { display: flex; align-items: center; gap: 26px; padding-top: 6px;
    font-size: 15px; color: #66666E; }
  .kaki b { color: #A83718; font-weight: 650; }
  .kaki .pisah { width: 1px; height: 16px; background: #D4CFC7; }
</style>
<div class="panggung">
  <div class="kisi"></div>
  <div class="cahaya"></div>
  <div class="isi">
    <header>
      <span id="logo" style="width:34px;height:34px;display:block"></span>
      <h1>RE to DFA Visualizer</h1>
    </header>
    <div class="tahap">Setiap tahap perhitungan ditampilkan, bukan hanya hasil akhirnya</div>

    <div class="jalur">
      <div class="kotak">
        <span class="label">Ekspresi</span>
        <div class="ekspresi">(a|b)*abb</div>
        <div class="aug">((a|b)*<span style="color:#A83718">•</span>a<span style="color:#A83718">•</span>b<span style="color:#A83718">•</span>b)<span style="color:#A83718">•</span>#</div>
      </div>
      <div class="panah" id="p1"></div>
      <div class="kotak">
        <span class="label">Syntax tree beranotasi</span>
        <div class="pohon" id="pohon"></div>
      </div>
      <div class="panah" id="p2"></div>
      <div class="kotak">
        <span class="label">DFA, tanpa NFA perantara</span>
        <div class="panel-dfa" id="panel-dfa"></div>
      </div>
    </div>

    <div class="kaki">
      <span><b>12</b> node pohon</span><span class="pisah"></span>
      <span><b>6</b> baris followpos</span><span class="pisah"></span>
      <span><b>4</b> state DFA</span><span class="pisah"></span>
      <span><b>tanpa</b> dependensi</span>
    </div>
  </div>
  <iframe id="app" src="/" style="position:absolute;width:1400px;height:2400px;left:-9999px;top:0;border:0"></iframe>
</div>
<script>
  const panah = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '34'); s.setAttribute('height', '16'); s.setAttribute('viewBox', '0 0 34 16');
    s.innerHTML = '<path d="M2 8h22" stroke="#A83718" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M24 2.5 31 8l-7 5.5" fill="none" stroke="#A83718" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  };
  document.getElementById('p1').appendChild(panah());
  document.getElementById('p2').appendChild(panah());

  const frame = document.getElementById('app');
  const siap = () => {
    const d = frame.contentDocument;
    if (!d || !d.getElementById('re-input')) return false;
    const input = d.getElementById('re-input');
    if (input.value !== '(a|b)*abb') {
      input.value = '(a|b)*abb';
      d.getElementById('re-form').requestSubmit();
    }
    // Tunggu sampai aplikasi benar-benar selesai menggambar pohon dan DFA.
    const pohon = d.querySelector('#ast-canvas svg');
    const dfa = d.querySelector('#dfa-canvas svg');
    if (!pohon || !dfa || !pohon.querySelector('g') || !dfa.querySelector('circle')) return false;

    document.getElementById('pohon').replaceChildren(pohon.cloneNode(true));
    document.getElementById('panel-dfa').replaceChildren(dfa.cloneNode(true));

    const atur = (svg, targetW) => {
      const vb = svg.getAttribute('viewBox').split(' ').map(Number);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('width', targetW);
      svg.setAttribute('height', Math.round(targetW * (vb[3] / vb[2])));
    };
    // Logo disalin dari iframe, jadi bentuknya persis logo aslinya.
    const logo = d.querySelector('header .brand img, .brand-mark');
    const wadahLogo = document.getElementById('logo');
    if (logo && !wadahLogo.hasChildNodes()) {
      const svgLogo = d.querySelector('header .brand svg');
      if (svgLogo) {
        const klon = svgLogo.cloneNode(true);
        klon.setAttribute('width', '34');
        klon.setAttribute('height', '34');
        wadahLogo.appendChild(klon);
      } else if (logo.currentSrc) {
        const img = document.createElement('img');
        img.src = logo.currentSrc;
        img.width = 34;
        img.height = 34;
        img.style.display = 'block';
        wadahLogo.appendChild(img);
      }
    }

    atur(document.querySelector('#pohon svg'), 330);
    atur(document.querySelector('#panel-dfa svg'), 300);
    return true;
  };

  // Percobaan berulang; potret baru diambil setelah semua elemen terpasang.
  let n = 0;
  const cek = () => {
    n += 1;
    let beres = false;
    try { beres = siap(); } catch { beres = false; }
    if (beres || n > 80) {
      document.body.dataset.siap = beres ? 'ya' : 'tidak';
      document.title = beres ? 'siap' : 'gagal';
      return;
    }
    setTimeout(cek, 100);
  };
  frame.addEventListener('load', () => setTimeout(cek, 300));
  setTimeout(cek, 1500);
<\/script>`;

const halPath = path.resolve('banner.tmp.html');
fs.writeFileSync(halPath, HALAMAN);

try {
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=2',
    '--window-size=1200,630',
    '--virtual-time-budget=8000',
    `--screenshot=${KELUAR}`,
    `http://127.0.0.1:${PORT}/banner`,
  ], { stdio: 'pipe', timeout: 90000 });
} finally {
  server.kill();
  await new Promise((ok) => setTimeout(ok, 600));
  fs.rmSync(SEMENTARA, { force: true });
  fs.rmSync(PROFIL, { recursive: true, force: true, maxRetries: 5 });
  fs.rmSync(halPath, { force: true });
}

const ukuran = fs.statSync(KELUAR);
console.log(`banner-github.png dibuat: ${(ukuran.size / 1024).toFixed(0)} KB`);
