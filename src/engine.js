// Mesin konversi Regular Expression ke DFA (konstruksi langsung via syntax tree + followpos).
// Murni: tidak menyentuh DOM, sehingga bisa diuji dengan node:test maupun dipakai di browser.

export const EPSILON = 'E';
// Simbol operator internal; tidak diekspor karena hanya dipakai di dalam modul ini.
const CONCAT = '•';
const ENDMARK = '#';

// Batas aman supaya subset construction tidak membekukan halaman pada ekspresi besar.
const MAX_STATES = 512;

function formatSet(set) {
  const items = [...set].sort((a, b) => a - b);
  return items.length === 0 ? '∅' : `{${items.join(', ')}}`;
}

/* ---------------- Langkah 1: tokenisasi ---------------- */

// Garis miring meneruskan karakter apa pun sebagai simbol literal, termasuk operator.
function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    if (ch === '\\') {
      const next = input[i + 1];
      if (next === undefined) {
        throw new SyntaxError('Garis miring "\\" di akhir ekspresi tidak diikuti karakter apa pun.');
      }
      tokens.push({ type: 'symbol', value: next, index: i, escaped: true, literal: true });
      i += 2;
      continue;
    }

    if (ch === '|' || ch === '*' || ch === '(' || ch === ')') {
      tokens.push({ type: 'op', value: ch, index: i });
      i += 1;
      continue;
    }

    // Titik dan bullet sama-sama operator konkatenasi eksplisit.
    if (ch === CONCAT || ch === '.') {
      tokens.push({ type: 'op', value: CONCAT, index: i, explicit: true });
      i += 1;
      continue;
    }

    if (ch === ENDMARK) {
      throw new SyntaxError(`Karakter "${ENDMARK}" dipakai sebagai penanda akhir. Tulis "\\${ENDMARK}" bila ingin memakainya sebagai simbol.`);
    }

    // "E" dicadangkan untuk string kosong; tulis "\E" bila ingin huruf E biasa.
    if (ch === EPSILON) {
      tokens.push({ type: 'symbol', value: EPSILON, index: i, epsilon: true });
      i += 1;
      continue;
    }

    tokens.push({ type: 'symbol', value: ch, index: i });
    i += 1;
  }
  return tokens;
}

/* ---------------- Langkah 2: konkatenasi eksplisit dan augmentasi ---------------- */

const endsOperand = (t) => t.type === 'symbol' || t.value === ')' || t.value === '*';
const startsOperand = (t) => t.type === 'symbol' || t.value === '(';

// Menampilkan token kembali sebagai teks; simbol hasil escape ditulis dengan garis miring.
export function tokensToText(tokens) {
  return tokens
    .map((t) => {
      if (t.type === 'op') return t.value;
      if (t.escaped || t.value === '|' || t.value === '*' || t.value === '(' || t.value === ')'
        || t.value === CONCAT || t.value === ENDMARK || t.value === '.' || t.value === '\\') {
        return `\\${t.value}`;
      }
      return t.value;
    })
    .join('');
}

function insertConcatTokens(tokens) {
  const out = [];
  for (const token of tokens) {
    const prev = out[out.length - 1];
    if (prev && endsOperand(prev) && startsOperand(token)) {
      out.push({ type: 'op', value: CONCAT, index: token.index, implicit: true });
    }
    out.push(token);
  }
  return out;
}

// Versi teks untuk ditampilkan: ekspresi setelah konkatenasi eksplisit disisipkan.
export function insertExplicitConcatenation(input) {
  return tokensToText(insertConcatTokens(tokenize(input)));
}

function augment(tokens, endIndex) {
  return [
    { type: 'op', value: '(', index: endIndex, implicit: true },
    ...tokens,
    { type: 'op', value: ')', index: endIndex, implicit: true },
    { type: 'op', value: CONCAT, index: endIndex, implicit: true },
    { type: 'symbol', value: ENDMARK, index: endIndex, implicit: true, endmark: true },
  ];
}

/* ---------------- Langkah 3: parser ---------------- */

function parse(tokens) {
  let i = 0;
  const peek = () => tokens[i];

  function parseAlternation() {
    let node = parseConcatenation();
    while (peek()?.value === '|' && peek().type === 'op') {
      i += 1;
      node = { type: 'or', value: '|', children: [node, parseConcatenation()] };
    }
    return node;
  }

  function parseConcatenation() {
    let node = parseFactor();
    while (peek()?.value === CONCAT && peek().type === 'op') {
      i += 1;
      node = { type: 'cat', value: CONCAT, children: [node, parseFactor()] };
    }
    return node;
  }

  function parseFactor() {
    let node = parseAtom();
    while (peek()?.value === '*' && peek().type === 'op') {
      i += 1;
      node = { type: 'star', value: '*', children: [node] };
    }
    return node;
  }

  function parseAtom() {
    const token = peek();
    if (!token) throw new SyntaxError('Ekspresi berakhir sebelum operand lengkap.');
    if (token.type === 'symbol') {
      i += 1;
      return {
        type: 'leaf',
        value: token.value,
        endmark: Boolean(token.endmark),
        literal: Boolean(token.literal),
        epsilon: Boolean(token.epsilon),
        children: [],
      };
    }
    if (token.value === '(') {
      i += 1;
      const node = parseAlternation();
      if (peek()?.value !== ')') throw new SyntaxError('Tanda kurung "(" tidak ditutup.');
      i += 1;
      return node;
    }
    if (token.value === ')') throw new SyntaxError('Tanda kurung ")" tidak memiliki pasangan "(".');
    if (token.value === '|') throw new SyntaxError('Operator "|" tidak memiliki operand di sebelah kiri.');
    if (token.value === '*') throw new SyntaxError('Operator "*" tidak memiliki operand di sebelah kiri.');
    throw new SyntaxError(`Operator "${token.value}" tidak memiliki operand.`);
  }

  const root = parseAlternation();
  if (i !== tokens.length) throw new SyntaxError(`Token tak terduga "${tokens[i].value}".`);
  return root;
}

/* ---------------- Langkah 4: nullable, firstpos, lastpos ---------------- */

function annotate(root) {
  const leaves = [];
  let counter = 0;

  function visit(node) {
    if (node.type === 'leaf') {
      counter += 1;
      node.position = counter;
      if (node.epsilon) {
        node.nullable = true;
        node.firstpos = new Set();
        node.lastpos = new Set();
      } else {
        node.nullable = false;
        node.firstpos = new Set([counter]);
        node.lastpos = new Set([counter]);
      }
      leaves.push(node);
      return;
    }

    node.children.forEach(visit);
    const [c1, c2] = node.children;

    if (node.type === 'or') {
      node.nullable = c1.nullable || c2.nullable;
      node.firstpos = new Set([...c1.firstpos, ...c2.firstpos]);
      node.lastpos = new Set([...c1.lastpos, ...c2.lastpos]);
    } else if (node.type === 'cat') {
      node.nullable = c1.nullable && c2.nullable;
      node.firstpos = c1.nullable ? new Set([...c1.firstpos, ...c2.firstpos]) : new Set(c1.firstpos);
      node.lastpos = c2.nullable ? new Set([...c1.lastpos, ...c2.lastpos]) : new Set(c2.lastpos);
    } else {
      node.nullable = true;
      node.firstpos = new Set(c1.firstpos);
      node.lastpos = new Set(c1.lastpos);
    }
  }

  visit(root);
  return leaves;
}

/* ---------------- Langkah 5: followpos ---------------- */

function computeFollowpos(root, leafByPosition) {
  const followpos = new Map();
  const reasons = new Map();

  const add = (from, targets, reason) => {
    if (!followpos.has(from)) followpos.set(from, new Set());
    const bucket = followpos.get(from);
    let changed = false;
    for (const t of targets) {
      if (!bucket.has(t)) {
        bucket.add(t);
        changed = true;
      }
    }
    if (changed) {
      if (!reasons.has(from)) reasons.set(from, []);
      reasons.get(from).push(reason);
    }
  };

  const visit = (node) => {
    if (node.type === 'cat') {
      const [c1, c2] = node.children;
      const targets = formatSet(c2.firstpos);
      for (const p of [...c1.lastpos].sort((a, b) => a - b)) {
        add(p, c2.firstpos, `${p} ∈ lastpos(kiri) dan node konkatenasi ${formatSet(c1.lastpos)}•${targets}: followpos(${p}) ⊇ firstpos(kanan) = ${targets}.`);
      }
    } else if (node.type === 'star') {
      const [c1] = node.children;
      const targets = formatSet(c1.firstpos);
      for (const p of [...c1.lastpos].sort((a, b) => a - b)) {
        add(p, c1.firstpos, `${p} ∈ lastpos(badan) dan node Kleene star: followpos(${p}) ⊇ firstpos(badan) = ${targets}.`);
      }
    }
    node.children.forEach(visit);
  };

  visit(root);

  return leafByPosition.map((leaf) => {
    const set = followpos.get(leaf.position) ?? new Set();
    const notes = reasons.get(leaf.position) ?? [];
    const rule = leaf.endmark
      ? 'Penanda akhir # tidak memiliki followpos.'
      : notes.length > 0
        ? notes.join(' ')
        : 'Tidak ada node konkatenasi atau star yang menambahkan followpos untuk posisi ini.';
    return { position: leaf.position, symbol: leaf.value, followpos: set, rule };
  });
}

// Nama state memakai pola S0, S1, S2 supaya tidak tertukar dengan simbol alfabet huruf.
function stateLabel(index) {
  return `S${index}`;
}

const setKey = (set) => [...set].sort((a, b) => a - b).join(',');

/* ---------------- Langkah 6: subset construction ---------------- */

function subsetConstruction(root, followposTable, leafByPosition) {
  const followposOf = new Map(followposTable.map((row) => [row.position, row.followpos]));
  const symbolOf = new Map(leafByPosition.map((leaf) => [leaf.position, leaf]));

  const seen = new Set();
  const alphabet = [];
  for (const leaf of leafByPosition) {
    // Penanda akhir dan epsilon tidak masuk alfabet; simbol literal apa pun masuk,
    // termasuk "#" dan "E" yang ditulis dengan escape.
    if (leaf.endmark) continue;
    if (leaf.epsilon) continue;
    if (seen.has(leaf.value)) continue;
    seen.add(leaf.value);
    alphabet.push(leaf.value);
  }
  // Alfabet diurutkan menaik, bukan mengikuti urutan kemunculan di ekspresi.
  // Tanpa pengurutan, "(1|0)*011" dan "(0|1)*011" menghasilkan urutan kolom
  // tabel yang berbeda padahal artinya sama, dan itu membingungkan di tabel.
  alphabet.sort();

  const states = [];
  const transitions = [];
  const byKey = new Map();

  const register = (set) => {
    const key = setKey(set);
    if (byKey.has(key)) return byKey.get(key).id;
    if (states.length >= MAX_STATES) {
      throw new Error(`Konversi dihentikan: jumlah state melewati batas ${MAX_STATES}. Sederhanakan ekspresi.`);
    }
    const id = stateLabel(states.length);
    const positions = [...set].sort((a, b) => a - b);
    const state = {
      id,
      positions,
      isStart: false,
      isAccept: positions.some((p) => symbolOf.get(p)?.endmark),
    };
    byKey.set(key, state);
    states.push(state);
    return id;
  };

  const start = new Set(root.firstpos);
  register(start);
  states[0].isStart = true;

  const queue = [start];
  const processed = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = setKey(current);
    if (processed.has(currentKey)) continue;
    processed.add(currentKey);
    const currentId = byKey.get(currentKey).id;

    for (const symbol of alphabet) {
      const target = new Set();
      for (const p of current) {
        if (symbolOf.get(p)?.value !== symbol) continue;
        for (const f of followposOf.get(p) ?? []) target.add(f);
      }
      if (target.size === 0) continue;
      const targetId = register(target);
      transitions.push({ from: currentId, symbol, to: targetId });
      if (!processed.has(setKey(target))) queue.push(target);
    }
  }

  return { alphabet, states, transitions };
}

/* ---------------- Langkah 7: minimisasi DFA ---------------- */

// State yang hanya berbeda pada transisi yang tidak ada dianggap berbeda dari state
// yang punya transisi ke sana, jadi transisi yang hilang diarahkan ke satu state mati virtual.
const DEAD = '\u0000mati';

function reachableFrom(states, transitions, startId) {
  const seen = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const t of transitions) {
      if (t.from !== current) continue;
      if (seen.has(t.to)) continue;
      seen.add(t.to);
      queue.push(t.to);
    }
  }
  return seen;
}

// Algoritma Moore: partisi awal menerima/bukan, lalu diperhalus sampai stabil.
// Setiap putaran diperhalusan dicatat supaya UI bisa menampilkan prosesnya bertahap.
export function minimizeAutomaton(view) {
  const reachable = reachableFrom(view.states, view.transitions, view.startState);
  const realIds = view.states.filter((s) => reachable.has(s.id)).map((s) => s.id);
  const accepting = new Set(
    view.states.filter((s) => reachable.has(s.id) && s.isAccept).map((s) => s.id),
  );

  const delta = new Map();
  for (const t of view.transitions) {
    if (reachable.has(t.from)) delta.set(`${t.from}|${t.symbol}`, t.to);
  }

  const nodes = [...realIds, DEAD];
  const step = (id, symbol) => {
    if (id === DEAD) return DEAD;
    return delta.get(`${id}|${symbol}`) ?? DEAD;
  };

  let group = new Map(nodes.map((id) => [id, accepting.has(id) ? 'acc' : 'rej']));
  const groupsOf = (map) => {
    const bucket = new Map();
    for (const [id, g] of map) {
      if (!bucket.has(g)) bucket.set(g, []);
      bucket.get(g).push(id);
    }
    return [...bucket.values()].map((members) => members.sort().join(',')).sort().join('#');
  };

  // Pembacaan partisi untuk tampilan: daftar kelompok beserta anggotanya.
  const asRounds = (map) => {
    const bucket = new Map();
    for (const id of nodes) {
      const g = map.get(id);
      if (!bucket.has(g)) bucket.set(g, []);
      bucket.get(g).push(id);
    }
    return [...bucket.values()]
      .map((members) => members.filter((id) => id !== DEAD).sort())
      .filter((members) => members.length > 0)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  };

  const rounds = [{ label: 'Partisi awal: menerima dan bukan menerima', groups: asRounds(group) }];

  for (;;) {
    const signature = new Map();
    for (const id of nodes) {
      signature.set(id, `${group.get(id)}|${view.alphabet.map((a) => group.get(step(id, a))).join(',')}`);
    }
    const renamed = new Map();
    const seen = new Map();
    for (const id of nodes) {
      const sig = signature.get(id);
      if (!seen.has(sig)) seen.set(sig, `g${seen.size}`);
      renamed.set(id, seen.get(sig));
    }
    if (groupsOf(renamed) === groupsOf(group)) break;
    group = renamed;
    // Putaran yang tidak memecah kelompok apa pun tidak perlu ditampilkan.
    const snapshot = asRounds(group);
    const previous = rounds[rounds.length - 1].groups;
    if (snapshot.length !== previous.length) {
      rounds.push({
        label: 'Perhalus partisi: pisahkan state yang transisinya menuju kelompok berbeda',
        groups: snapshot,
      });
    }
  }

  const blocks = new Map();
  for (const id of nodes) {
    const key = group.get(id);
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key).push(id);
  }

  const positionOf = new Map(view.states.map((s) => [s.id, s.positions]));
  const output = [];
  const blockToId = new Map();

  for (const [key, members] of blocks) {
    const real = members.filter((id) => id !== DEAD);
    // Blok yang hanya berisi state mati virtual tidak perlu ditampilkan.
    if (real.length === 0) continue;
    const positions = [...new Set(real.flatMap((id) => positionOf.get(id) ?? []))].sort((a, b) => a - b);
    const id = stateLabel(output.length);
    blockToId.set(key, id);
    output.push({
      id,
      positions,
      isStart: real.includes(view.startState),
      isAccept: real.some((rid) => accepting.has(rid)),
      mergedFrom: real,
    });
  }

  const transitions = [];
  for (const [key, members] of blocks) {
    if (!blockToId.has(key)) continue;
    const fromId = blockToId.get(key);
    const real = members.filter((id) => id !== DEAD);
    if (real.length === 0) continue;
    for (const symbol of view.alphabet) {
      const target = step(real[0], symbol);
      const targetKey = group.get(target);
      if (!blockToId.has(targetKey)) continue; // menuju state mati: biarkan tanpa transisi
      const to = blockToId.get(targetKey);
      if (transitions.some((t) => t.from === fromId && t.symbol === symbol)) continue;
      transitions.push({ from: fromId, symbol, to });
    }
  }

  // Pelabelan ulang mengikuti urutan penelusuran dari state awal supaya stabil.
  const startState = output.find((s) => s.isStart)?.id ?? output[0]?.id;
  const order = [];
  const visited = new Set([startState]);
  const queue = [startState];
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const symbol of view.alphabet) {
      const t = transitions.find((x) => x.from === current && x.symbol === symbol);
      if (t && !visited.has(t.to)) {
        visited.add(t.to);
        queue.push(t.to);
      }
    }
  }
  for (const s of output) if (!visited.has(s.id)) order.push(s.id);

  const rename = new Map(order.map((id, index) => [id, stateLabel(index)]));
  const states = order.map((id) => {
    const state = output.find((s) => s.id === id);
    return { ...state, id: rename.get(id) };
  });
  const relabelled = transitions.map((t) => ({
    from: rename.get(t.from),
    symbol: t.symbol,
    to: rename.get(t.to),
  }));

  return {
    alphabet: view.alphabet,
    states,
    transitions: relabelled,
    startState: rename.get(startState),
    // Jejak partisi untuk ditampilkan bertahap di UI.
    rounds: rounds.map((round) => ({
      label: round.label,
      groups: round.groups.map((members) => members.map((id) => (id === DEAD ? 'mati' : id))),
    })),
  };
}

/* ---------------- Titik masuk tunggal ---------------- */

const MISSING_START = 'Hasil konversi tidak memiliki state awal.';

function makeView(alphabet, states, transitions, extra = {}) {
  const start = states.find((s) => s.isStart);
  if (!start) throw new Error(MISSING_START);
  return {
    alphabet,
    states,
    transitions,
    startState: start.id,
    acceptingStates: new Set(states.filter((s) => s.isAccept).map((s) => s.id)),
    transitionMap: new Map(states.map((s) => [s.id, new Map()])),
    ...extra,
  };
}

export function convert(rawInput) {
  const input = String(rawInput ?? '');
  if (input.trim() === '') throw new SyntaxError('Masukkan ekspresi reguler terlebih dahulu.');

  const tokens = tokenize(input);
  // Setiap karakter spasi sudah dibuang tokenize, jadi ekspresi berisi spasi saja
  // (dan karena itu kosong) sudah ditangkap oleh pemeriksaan di atas.

  const explicitTokens = insertConcatTokens(tokens);
  const augmentedTokens = augment(explicitTokens, input.length);
  const root = parse(augmentedTokens);
  const leaves = annotate(root);
  const followposTable = computeFollowpos(root, leaves);
  const raw = subsetConstruction(root, followposTable, leaves);

  const rawView = makeView(raw.alphabet, raw.states, raw.transitions);
  for (const t of rawView.transitions) rawView.transitionMap.get(t.from)?.set(t.symbol, t.to);

  const minParts = minimizeAutomaton(rawView);
  const minView = makeView(minParts.alphabet, minParts.states, minParts.transitions, { rounds: minParts.rounds });
  for (const t of minView.transitions) minView.transitionMap.get(t.from)?.set(t.symbol, t.to);

  const warnings = [];
  if (minView.states.length < rawView.states.length) {
    warnings.push(`Minimisasi menggabungkan state: ${rawView.states.length} state hasil konstruksi langsung menjadi ${minView.states.length} state minimum.`);
  } else {
    warnings.push(`Hasil konstruksi langsung sudah minimum: ${rawView.states.length} state, tidak ada state yang bisa digabung.`);
  }
  if (leaves.some((leaf) => leaf.epsilon)) {
    warnings.push(`Simbol "${EPSILON}" diperlakukan sebagai string kosong (nullable).`);
  }
  const literals = leaves.filter((leaf) => leaf.literal).map((leaf) => leaf.value);
  if (literals.length > 0) {
    warnings.push(`Simbol literal hasil escape: ${[...new Set(literals)].join(', ')}.`);
  }

  return {
    input,
    explicit: tokensToText(explicitTokens),
    augmented: tokensToText(augmentedTokens),
    root,
    leaves: leaves.map((leaf) => ({ position: leaf.position, value: leaf.value })),
    followposTable,
    // Bidang berikut menunjuk ke DFA hasil konstruksi langsung, agar pemakaian lama tetap sah.
    alphabet: rawView.alphabet,
    states: rawView.states,
    transitions: rawView.transitions,
    startState: rawView.startState,
    acceptingStates: rawView.acceptingStates,
    transitionMap: rawView.transitionMap,
    views: { raw: rawView, min: minView },
    isMinimal: minView.states.length === rawView.states.length,
    warnings,
  };
}

/* ---------------- Simulator ---------------- */

export function simulate(view, rawString) {
  const input = String(rawString ?? '');
  const start = view.states.find((state) => state.isStart);
  if (!start) throw new Error(MISSING_START);

  let current = start.id;
  const steps = [{ symbol: null, from: null, to: current }];

  for (const symbol of input) {
    const transition = view.transitions.find((t) => t.from === current && t.symbol === symbol);
    if (!transition) {
      return {
        accepted: false,
        finalState: current,
        steps,
        reason: `Tidak ada transisi dari state ${current} dengan simbol "${symbol}".`,
      };
    }
    current = transition.to;
    steps.push({ symbol, from: transition.from, to: current });
  }

  const finalState = view.states.find((state) => state.id === current);
  return {
    accepted: finalState.isAccept,
    finalState: current,
    steps,
    reason: finalState.isAccept ? `String diterima di state ${current}.` : `State ${current} bukan state penerima.`,
  };
}
