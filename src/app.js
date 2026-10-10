// Lapisan tampilan: memakai satu hasil konversi dari engine untuk semua visualisasi.
import { convert, simulate, EPSILON } from './engine.js';
import { buildDiagramSvg } from './diagram.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const el = (id) => document.getElementById(id);

const dom = {
  form: el('re-form'),
  input: el('re-input'),
  clear: el('re-clear'),
  status: el('re-status'),
  augmented: el('re-augmented'),
  astCanvas: el('ast-canvas'),
  followposTable: el('followpos-table'),
  dfaTables: el('dfa-tables'),
  positionNote: el('position-note'),
  dfaCanvas: el('dfa-canvas'),
  simForm: el('sim-form'),
  simInput: el('sim-input'),
  simOutput: el('sim-output'),
  themeToggle: el('theme-toggle'),
  presets: document.querySelectorAll('[data-preset]'),
};

let result = null;
let highlightedPosition = null;
let activeStateId = null;
let activeTransition = null; // { from, symbol, to }

// Automaton yang ditampilkan tabel, diagram, dan simulator: DFA minimum.
// Hasil minimisasi menerima bahasa yang sama persis dengan hasil konstruksi
// langsung, hanya dengan jumlah state paling sedikit, jadi inilah yang dipakai.
function activeView() {
  if (!result) return null;
  return result.views?.min ?? result;
}

/* ---------------- utilitas SVG ---------------- */

function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

// Perkiraan lebar teks monospace untuk menentukan ukuran kotak.
const charWidth = (size) => size * 0.6;
const textWidth = (str, size) => String(str).length * charWidth(size);

function clear(node) {
  node.replaceChildren();
}

function emptyBox(message) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = message;
  return p;
}

function setSet(set) {
  const items = [...set].sort((a, b) => a - b);
  return items.length === 0 ? '∅' : `{${items.join(',')}}`;
}

/* ---------------- status pesan ---------------- */

function showError(message) {
  dom.status.className = 'note note--error';
  dom.status.textContent = message;
  dom.status.hidden = false;
}

function showWarnings(list) {
  if (list.length === 0) {
    dom.status.hidden = true;
    return;
  }
  dom.status.className = 'note note--warn';
  clear(dom.status);
  const lead = document.createElement('p');
  lead.textContent = 'Catatan:';
  const ul = document.createElement('ul');
  for (const item of list) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  dom.status.append(lead, ul);
  dom.status.hidden = false;
}

/* ---------------- LANGKAH 2: syntax tree ---------------- */

function renderAst(node) {
  const canvas = dom.astCanvas;
  clear(canvas);

  if (!node) {
    canvas.appendChild(emptyBox('Jalankan konversi untuk melihat syntax tree.'));
    return;
  }

  const NODE_H = 80;
  const GAP_X = 26;
  const GAP_Y = 46;
  // Padding kiri/kanan harus menampung setengah lebar kotak node terjauh.
  const PAD_X = 64;
  const PAD_Y = 32;
  const boxes = new Map();
  let cursor = 0;

  // Tata letak: daun berurutan kiri ke kanan, node internal di tengah anaknya.
  function layout(n, depth) {
    if (n.type === 'leaf') {
      const x = cursor;
      cursor += 1;
      boxes.set(n, { x, depth });
      return x;
    }
    const xs = n.children.map((child) => layout(child, depth + 1));
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    boxes.set(n, { x, depth });
    return x;
  }
  layout(node, 0);

  const leafWidth = 74;
  const colWidth = leafWidth + GAP_X;

  const nodes = [];
  (function collect(n) {
    nodes.push(n);
    n.children.forEach(collect);
  })(node);

  const width = Math.max(1, cursor) * colWidth + PAD_X * 2 - GAP_X;
  const maxDepth = Math.max(...nodes.map((n) => boxes.get(n).depth));
  const height = (maxDepth + 1) * (NODE_H + GAP_Y) + PAD_Y * 2 - GAP_Y;

  const root = svg('svg', {
    viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`,
    width: Math.ceil(width),
    height: Math.ceil(height),
    role: 'img',
    'aria-label': 'Syntax tree beranotasi',
  });

  const px = (n) => PAD_X + boxes.get(n).x * colWidth;
  const py = (n) => PAD_Y + boxes.get(n).depth * (NODE_H + GAP_Y);

  // Sisi pohon digambar lebih dahulu agar berada di belakang kotak.
  for (const n of nodes) {
    for (const child of n.children) {
      const x1 = px(n);
      const y1 = py(n) + NODE_H;
      const x2 = px(child);
      const y2 = py(child);
      root.appendChild(svg('line', { x1, y1, x2, y2, class: 'edge' }));
    }
  }

  for (const n of nodes) {
    const isLeaf = n.type === 'leaf';
    const lines = [`N: ${n.nullable ? 'True' : 'False'}`, `F${setSet(n.firstpos)}`, `L${setSet(n.lastpos)}`];

    // Operator tetap memakai simbol, bukan kata, dengan ukuran lebih besar agar terbaca.
    const symbolLabel = n.value;
    const supLabel = isLeaf ? String(n.position) : '';
    const symbolSize = isLeaf ? 16 : 19;
    const widthNeeded = Math.max(
      textWidth(symbolLabel, symbolSize) + (isLeaf ? 12 : 0) + 20,
      ...lines.map((line) => textWidth(line, 10.5) + 16),      leafWidth,
    );
    const w = Math.ceil(widthNeeded);
    const h = NODE_H;
    const x = px(n) - w / 2;
    const y = py(n);

    const isHighlighted = isLeaf && highlightedPosition === n.position;
    const group = svg('g', { class: `node-group${isHighlighted ? ' is-highlighted' : ''}` });

    group.appendChild(svg('rect', {
      x, y, width: w, height: h, rx: 5,
      class: `node-box${isLeaf ? '' : ' is-internal'}`,
    }));

    const centerX = px(n);
    const symbolShift = isLeaf ? -5 : 0;
    group.appendChild(svg('text', {
      x: centerX + symbolShift, y: y + (isLeaf ? 23 : 26), 'text-anchor': 'middle',
      class: `node-symbol${isLeaf ? ' is-leaf' : ' is-operator'}`,
    }, symbolLabel));

    if (isLeaf) {
      group.appendChild(svg('text', {
        x: centerX + textWidth(symbolLabel, symbolSize) / 2 - 1, y: y + 18, 'text-anchor': 'start', class: 'node-pos',
      }, supLabel));
    }

    lines.forEach((line, index) => {
      group.appendChild(svg('text', {
        x: centerX, y: y + 46 + index * 14, 'text-anchor': 'middle', class: 'node-anno',
      }, line));
    });

    root.appendChild(group);
  }

  canvas.appendChild(root);
}

/* ---------------- LANGKAH 3: followpos ---------------- */

function renderFollowpos(table) {
  const host = dom.followposTable;
  clear(host);

  if (!table || table.length === 0) {
    host.appendChild(emptyBox('Belum ada tabel.'));
    return;
  }

  const wrapper = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Setiap baris adalah satu posisi daun. Aturan asal himpunan dijelaskan pada kolom terakhir.';
  wrapper.appendChild(caption);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Posisi', 'Simbol', 'followpos', 'Aturan']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  wrapper.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of table) {
    const tr = document.createElement('tr');
    if (row.position === highlightedPosition) tr.classList.add('is-highlighted');

    const posCell = document.createElement('td');
    posCell.className = 'mono';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link-btn';
    button.textContent = String(row.position);
    button.setAttribute('aria-pressed', String(row.position === highlightedPosition));
    button.setAttribute('aria-label', `Sorot posisi ${row.position} pada syntax tree`);
    button.addEventListener('click', () => toggleHighlight(row.position));
    posCell.appendChild(button);

    const symCell = document.createElement('td');
    symCell.className = 'sym';
    symCell.textContent = row.symbol === EPSILON ? `${EPSILON} (kosong)` : row.symbol;

    const setCell = document.createElement('td');
    setCell.className = 'set';
    setCell.textContent = setSet(row.followpos);

    const ruleCell = document.createElement('td');
    ruleCell.className = 'rule-text';
    ruleCell.textContent = row.rule;

    tr.append(posCell, symCell, setCell, ruleCell);
    tbody.appendChild(tr);
  }
  wrapper.appendChild(tbody);
  host.appendChild(wrapper);
}

function toggleHighlight(position) {
  highlightedPosition = highlightedPosition === position ? null : position;
  if (!result) return;
  renderAst(result.root);
  renderFollowpos(result.followposTable);
  // State DFA yang memuat posisi ini ikut disorot supaya hubungan keduanya terlihat.
  const view = activeView();
  renderDfaTables(view);
  renderDfaDiagram(view);
  renderPositionNote(view);
}

// Aturan sorotan posisi dihitung sekali di sini, lalu dipakai tabel maupun diagram,
// supaya keduanya tidak mungkin berbeda pendapat.
function positionHighlight(view) {
  if (!result || !view || highlightedPosition === null) {
    return { states: new Set(), transitions: new Set(), symbol: undefined };
  }
  const states = new Set(
    view.states.filter((s) => s.positions.includes(highlightedPosition)).map((s) => s.id),
  );
  const symbol = result.followposTable.find((row) => row.position === highlightedPosition)?.symbol;
  const transitions = new Set(
    symbol === undefined
      ? []
      : view.transitions
        .filter((t) => states.has(t.from) && t.symbol === symbol)
        .map((t) => `${t.from}|${t.symbol}|${t.to}`),
  );
  return { states, transitions, symbol };
}

// Keterangan ketika posisi yang disorot tidak muncul di state mana pun,
// misalnya daun epsilon yang tidak punya firstpos maupun lastpos.
function renderPositionNote(view) {
  const host = dom.positionNote;
  if (!host) return;
  if (highlightedPosition === null || !view) {
    host.hidden = true;
    return;
  }
  const { states } = positionHighlight(view);
  if (states.size > 0) {
    host.hidden = true;
    return;
  }
  const row = result.followposTable.find((r) => r.position === highlightedPosition);
  host.hidden = false;
  host.textContent = row?.symbol === EPSILON
    ? `Posisi ${highlightedPosition} (${EPSILON}) adalah string kosong: ia tidak punya firstpos maupun lastpos, jadi tidak muncul di state mana pun.`
    : `Posisi ${highlightedPosition} tidak muncul di state mana pun pada DFA ini.`;
}

/* ---------------- LANGKAH 4: tabel DFA ---------------- */

function renderDfaTables(data) {
  const host = dom.dfaTables;
  clear(host);

  if (!data) {
    return;
  }

  // Satu tabel gabungan: identitas state dan transisinya dalam satu baris.
  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  const table = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = `State DFA: ${data.states.length} state, alfabet {${data.alphabet.join(', ')}}. Setiap state ditulis lengkap sebagai nama dan himpunan posisinya. Kolom simbol berisi state tujuan; — berarti tidak ada transisi. State penerima ditandai *.`;
  table.appendChild(caption);

  // Teks himpunan posisi, dengan posisi yang sedang disorot ditandai.
  const positionsCell = (positions) => {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode('{'));
    positions.forEach((p, index) => {
      if (index > 0) fragment.appendChild(document.createTextNode(','));
      if (p === highlightedPosition) {
        const mark = document.createElement('mark');
        mark.className = 'pos-mark';
        mark.textContent = String(p);
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(String(p)));
      }
    });
    fragment.appendChild(document.createTextNode('}'));
    return fragment;
  };

  // Setiap nama state ditulis lengkap, misalnya "B = {1,2,3,4}".
  const withPositions = (id) => {
    const state = data.states.find((s) => s.id === id);
    if (!state) return id;
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(`${state.id} = `));
    fragment.appendChild(positionsCell(state.positions));
    return fragment;
  };

  const { states: highlightedStates, transitions: highlightedTransitions } = positionHighlight(data);
  const triggersFrom = (from, symbol) => [...highlightedTransitions]
    .some((key) => key.startsWith(`${from}|${symbol}|`));

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const columns = ['State', ...data.alphabet, 'Peran'];
  for (const label of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  }
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  for (const state of data.states) {
    const tr = document.createElement('tr');
    if (state.id === activeStateId) tr.classList.add('is-highlighted');
    if (highlightedStates.has(state.id)) tr.classList.add('is-position-match');

    const idCell = document.createElement('th');
    idCell.scope = 'row';
    idCell.className = 'state-id';
    idCell.appendChild(withPositions(state.id));
    if (state.isAccept) idCell.appendChild(document.createTextNode(' *'));
    tr.appendChild(idCell);

    const roleCell = document.createElement('td');
    if (state.isStart) {
      const tag = document.createElement('span');
      tag.className = 'tag tag--start';
      tag.textContent = 'awal';
      roleCell.appendChild(tag);
      roleCell.appendChild(document.createTextNode(' '));
    }
    if (state.isAccept) {
      const tag = document.createElement('span');
      tag.className = 'tag tag--accept';
      tag.textContent = 'menerima';
      roleCell.appendChild(tag);
    }
    if (!state.isStart && !state.isAccept) roleCell.textContent = 'perantara';

    for (const symbol of data.alphabet) {
      const cell = document.createElement('td');
      cell.className = 'set';
      const transition = data.transitions.find((t) => t.from === state.id && t.symbol === symbol);
      if (transition) {
        cell.appendChild(withPositions(transition.to));
      } else {
        cell.textContent = '—';
      }
      // Transisi yang bersumber dari posisi tersorot ditandai.
      if (transition && triggersFrom(transition.from, transition.symbol)) {
        cell.classList.add('is-position-match');
      }
      const isActive = transition && activeTransition
        && activeTransition.from === transition.from
        && activeTransition.symbol === transition.symbol
        && activeTransition.to === transition.to;
      if (isActive) cell.classList.add('is-active-cell');
      tr.appendChild(cell);
    }

    tr.appendChild(roleCell);
    body.appendChild(tr);
  }
  table.appendChild(body);
  wrap.appendChild(table);
  host.appendChild(wrap);
}

/* ---------------- LANGKAH 4: diagram DFA ---------------- */

// Kerangka SVG diagram: kotak gambar, kisi titik, dan penanda panah.
// Semuanya dilukis sekali per render, bukan per simulasi.
/* ---------------- LANGKAH 4: diagram DFA ---------------- */

// Membangun diagram lewat src/diagram.js supaya geometri dan tampilannya sama
// dengan yang dipakai gambar pratinjau. Fungsi ini hanya memasangnya ke kanvas.
function renderDfaDiagram(data) {
  const canvas = dom.dfaCanvas;
  clear(canvas);

  if (!data) {
    canvas.appendChild(emptyBox('Belum ada diagram.'));
    return;
  }

  const { states: markStates, transitions: markTransitions } = positionHighlight(data);
  canvas.appendChild(buildDiagramSvg(data, {
    markState: (id) => markStates.has(id),
    markEdge: (t) => markTransitions.has(`${t.from}|${t.symbol}|${t.to}`),
    activeState: activeStateId,
    activeTransition,
  }));
}

/* ---------------- LANGKAH 5: simulator ---------------- */

function renderSimulator() {
  const host = dom.simOutput;
  clear(host);

  const view = activeView();
  if (!view) {
    host.appendChild(emptyBox('Jalankan konversi lebih dahulu, lalu uji sebuah string.'));
    return;
  }

  const raw = dom.simInput.value;
  let run;
  try {
    run = simulate(view, raw);
  } catch (error) {
    host.appendChild(emptyBox(error.message));
    return;
  }

  const trace = document.createElement('ol');
  trace.className = 'trace';
  trace.setAttribute('aria-label', 'Jejak state selama membaca string');

  run.steps.forEach((step, index) => {
    const li = document.createElement('li');
    const isFinal = index === run.steps.length - 1;
    if (isFinal) li.classList.add('is-final', run.accepted ? 'ok' : 'bad');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link-btn';
    button.textContent = step.to;
    button.setAttribute('aria-label', `Sorot state ${step.to} pada diagram`);
    button.addEventListener('click', () => setActiveState(step.to));
    li.appendChild(button);

    if (step.symbol === null) {
      const label = document.createElement('span');
      label.textContent = 'state awal';
      li.appendChild(label);
    } else {
      const symbol = document.createElement('span');
      symbol.className = 'sym';
      symbol.textContent = `←${step.symbol}`;
      li.appendChild(symbol);
    }
    trace.appendChild(li);
  });
  host.appendChild(trace);

  const verdict = document.createElement('div');
  verdict.className = `verdict ${run.accepted ? 'ok' : 'bad'}`;
  const strong = document.createElement('strong');
  strong.textContent = run.accepted ? 'Diterima. ' : 'Ditolak. ';
  verdict.append(strong, document.createTextNode(run.reason));
  host.appendChild(verdict);

  if (raw === '') {
    const note = document.createElement('p');
    note.className = 'augmented';
    note.textContent = 'String kosong diuji apa adanya: hasilnya bergantung pada state awal.';
    host.appendChild(note);
  }
}

function setActiveState(stateId) {
  activeStateId = stateId;
  activeTransition = null;
  const view = activeView();
  if (view) {
    renderDfaDiagram(view);
    renderDfaTables(view);
  }
}

/* ---------------- orkestrasi ---------------- */

// Menyetel ulang seluruh keadaan turunan: sorotan dan state aktif.
function resetUiState() {
  highlightedPosition = null;
  activeStateId = null;
  activeTransition = null;
}

// Mengosongkan semua keluaran supaya hasil lama tidak tampak seperti hasil input baru.
function clearResults() {
  resetUiState();
  dom.augmented.hidden = true;
  dom.positionNote.hidden = true;
  renderAst(null);
  renderFollowpos(null);
  renderDfaTables(null);
  renderDfaDiagram(null);
  renderSimulator();
}

function runConversion(rawInput) {
  try {
    result = convert(rawInput);
  } catch (error) {
    result = null;
    clearResults();
    showError(error.message);
    return;
  }

  resetUiState();
  dom.positionNote.hidden = true;

  showWarnings(result.warnings);
  dom.augmented.hidden = false;
  dom.augmented.replaceChildren();
  const label = document.createTextNode('Bentuk augmented: ');
  const code = document.createElement('code');
  code.textContent = result.augmented;
  dom.augmented.append(label, code);

  const view = activeView();
  renderAst(result.root);
  renderFollowpos(result.followposTable);
  renderDfaTables(view);
  renderDfaDiagram(view);
  renderSimulator();
}

/* ---------------- tema terang / gelap ---------------- */

// Ikon inline: menghindari pustaka ikon dan tetap tajam di semua ukuran.
const MOON_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  dom.themeToggle.setAttribute('aria-pressed', String(isDark));
  dom.themeToggle.setAttribute(
    'aria-label',
    isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap',
  );
  // Ikon menunjukkan mode yang akan diaktifkan saat tombol ditekan.
  // innerHTML dipakai karena isinya konstanta SVG internal, bukan masukan pengguna.
  dom.themeToggle.innerHTML = isDark ? SUN_ICON : MOON_ICON;
}

function initTheme() {
  const saved = localStorage.getItem('re-to-dfa-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'));

  dom.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('re-to-dfa-theme', next);
    applyTheme(next);
  });
}

/* ---------------- pemasangan ---------------- */

function init() {
  initTheme();

  dom.form.addEventListener('submit', (event) => {
    event.preventDefault();
    runConversion(dom.input.value);
  });

  dom.clear.addEventListener('click', () => {
    dom.input.value = '';
    dom.simInput.value = '';
    result = null;
    clearResults();
    showError('Masukkan ekspresi reguler terlebih dahulu.');
    dom.input.focus();
  });

  // Preset hanya mengisi kolom ekspresi. Konversi tetap dijalankan lewat tombol
  // Konversi, dan fokus tidak dipindahkan supaya halaman tidak menggulir ke bawah.
  for (const chip of dom.presets) {
    chip.addEventListener('click', () => {
      dom.input.value = chip.dataset.preset;
      dom.input.focus({ preventScroll: true });
    });
  }

  dom.simForm.addEventListener('submit', (event) => {
    event.preventDefault();
    renderSimulator();
  });

  // Pemeriksaan awal: tampilkan status kosong, bukan hasil palsu.
  renderAst(null);
  renderFollowpos(null);
  renderDfaTables(null);
  renderDfaDiagram(null);
  renderSimulator();
  dom.input.focus();
}

init();
