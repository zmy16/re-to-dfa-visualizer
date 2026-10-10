import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, simulate, minimizeAutomaton, EPSILON, tokensToText } from '../src/engine.js';

/* ---------------- kasus batas alfabet dan penanda ---------------- */

test('penanda # hasil escape menjadi simbol biasa, bukan penanda akhir', () => {
  const result = convert('\\#');
  assert.deepEqual(result.alphabet, ['#']);
  assert.equal(result.states.filter((s) => s.isAccept).length, 1);
  assert.equal(simulate(result, '#').accepted, true);
  assert.equal(simulate(result, '').accepted, false);
});

test('E dipakai untuk string kosong, \\E untuk huruf E', () => {
  const empty = convert('E');
  assert.deepEqual(empty.alphabet, []);
  assert.equal(simulate(empty, '').accepted, true);
  assert.equal(simulate(empty, 'E').accepted, false);

  const letter = convert('\\E');
  assert.deepEqual(letter.alphabet, ['E']);
  assert.equal(simulate(letter, 'E').accepted, true);
  assert.equal(simulate(letter, '').accepted, false);
});

test('E memiliki satu state dan tidak punya transisi', () => {
  const result = convert('E');
  assert.equal(result.views.raw.states.length, 1);
  assert.equal(result.views.raw.transitions.length, 0);
  assert.equal(result.views.raw.states[0].isAccept, true);
});

test('ekspresi dengan alfabet besar tetap terkonversi', () => {
  const result = convert('(a|b|c|d|e|f)*abc');
  assert.deepEqual(result.alphabet, ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.equal(simulate(result, 'fedabc').accepted, true);
  assert.equal(simulate(result, 'fedab').accepted, false);
});

test('ekspresi yang menolak segalanya tetap menghasilkan automaton valid', () => {
  // "a" tidak punya jalan menuju penanda akhir untuk string lain, jadi hanya "a" diterima.
  const result = convert('a');
  assert.equal(simulate(result, 'a').accepted, true);
  for (const bad of ['', 'b', 'aa', 'ab']) {
    assert.equal(simulate(result, bad).accepted, false, `harus ditolak: ${bad}`);
  }
});

test('simbol di luar alfabet ditolak dengan alasan yang jelas', () => {
  const result = convert('a|b');
  const run = simulate(result, 'c');
  assert.equal(run.accepted, false);
  assert.match(run.reason, /Tidak ada transisi/);
});

/* ---------------- perilaku view ---------------- */

test('kedua view memiliki bentuk data yang sama', () => {
  const result = convert('(a|b)*abb(a|b)*');
  for (const key of ['raw', 'min']) {
    const view = result.views[key];
    assert.ok(Array.isArray(view.states), `${key}.states`);
    assert.ok(Array.isArray(view.transitions), `${key}.transitions`);
    assert.ok(Array.isArray(view.alphabet), `${key}.alphabet`);
    assert.equal(typeof view.startState, 'string', `${key}.startState`);
    assert.equal(view.states.filter((s) => s.isStart).length, 1, `${key} punya tepat satu state awal`);
    assert.ok(view.acceptingStates instanceof Set, `${key}.acceptingStates`);
    assert.equal(view.transitionMap.size, view.states.length, `${key}.transitionMap`);
  }
});

test('semua transisi kedua view menunjuk state yang ada', () => {
  const result = convert('(a|b)*abb(a|b)*');
  for (const key of ['raw', 'min']) {
    const view = result.views[key];
    const ids = new Set(view.states.map((s) => s.id));
    for (const t of view.transitions) {
      assert.ok(ids.has(t.from), `${key}: asal ${t.from} tidak ada`);
      assert.ok(ids.has(t.to), `${key}: tujuan ${t.to} tidak ada`);
      assert.ok(view.alphabet.includes(t.symbol), `${key}: simbol ${t.symbol} di luar alfabet`);
    }
    // Tidak boleh ada transisi ganda untuk pasangan state dan simbol yang sama.
    const seen = new Set();
    for (const t of view.transitions) {
      const k = `${t.from}|${t.symbol}`;
      assert.ok(!seen.has(k), `${key}: transisi ganda ${k}`);
      seen.add(k);
    }
  }
});

test('transitionMap cocok dengan daftar transisi', () => {
  const result = convert('a(b|c)*d');
  for (const key of ['raw', 'min']) {
    const view = result.views[key];
    for (const t of view.transitions) {
      assert.equal(view.transitionMap.get(t.from).get(t.symbol), t.to, `${key} ${t.from}-${t.symbol}`);
    }
  }
});

test('minimisasi mempertahankan perilaku untuk semua string pendek', () => {
  const result = convert('(a|b)*abb(a|b)*');
  const alphabet = ['a', 'b'];
  const all = [''];
  let level = [''];
  for (let n = 1; n <= 5; n += 1) {
    const next = [];
    for (const p of level) for (const s of alphabet) next.push(p + s);
    all.push(...next);
    level = next;
  }
  for (const s of all) {
    assert.equal(
      simulate(result.views.min, s).accepted,
      simulate(result.views.raw, s).accepted,
      `berbeda untuk "${s}"`,
    );
  }
});

test('minimisasi menghasilkan tepat satu state awal dan label unik', () => {
  const result = convert('(a|b)*abb(a|b)*');
  const min = result.views.min;
  assert.equal(min.states.filter((s) => s.isStart).length, 1);
  assert.equal(new Set(min.states.map((s) => s.id)).size, min.states.length);
  assert.equal(min.startState, min.states.find((s) => s.isStart).id);
});

/* ---------------- penampilan ekspresi ---------------- */

test('ekspresi augmented menampilkan penanda akhir dan kurung', () => {
  const result = convert('ab');
  assert.match(result.augmented, /•/);
  assert.match(result.augmented, /#/);
  assert.equal(result.explicit, 'a•b');
  assert.equal(tokensToText([]), '');
});

test('setiap posisi daun punya baris followpos', () => {
  for (const re of ['a', 'a*', '(a|b)*abb', 'ab|ba', 'E']) {
    const result = convert(re);
    assert.equal(
      result.followposTable.length,
      result.leaves.length,
      `${re}: jumlah baris followpos harus sama dengan jumlah daun`,
    );
    const positions = result.followposTable.map((r) => r.position).sort((a, b) => a - b);
    assert.deepEqual(positions, result.leaves.map((l) => l.position).sort((a, b) => a - b), re);
  }
});

test('setiap baris followpos punya penjelasan aturan', () => {
  for (const row of convert('(a|b)*abb').followposTable) {
    assert.ok(row.rule.length > 0, `posisi ${row.position} tanpa penjelasan`);
    assert.ok(row.followpos instanceof Set);
  }
});

test('posisi di followpos selalu menunjuk posisi yang ada', () => {
  const result = convert('(a|b)*abb(a|b)*');
  const valid = new Set(result.leaves.map((l) => l.position));
  for (const row of result.followposTable) {
    for (const p of row.followpos) assert.ok(valid.has(p), `followpos(${row.position}) memuat posisi tak dikenal ${p}`);
  }
});

/* ---------------- pesan kesalahan ---------------- */

test('pesan kesalahan selalu berupa SyntaxError dengan kalimat', () => {
  const bad = ['(a', 'a)', '|a', 'a|', '*a', 'a#b', '\\', '', '   ', '()', 'a|', '(|a)'];
  for (const input of bad) {
    let error = null;
    try {
      convert(input);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof SyntaxError, `harus SyntaxError: ${JSON.stringify(input)}`);
    assert.ok(error.message.length > 8, `pesan terlalu pendek untuk ${JSON.stringify(input)}`);
  }
});

test('ekspresi kosong dan spasi memberi pesan khusus', () => {
  assert.throws(() => convert(''), /Masukkan ekspresi/);
  assert.throws(() => convert('   '), /Masukkan ekspresi/);
});

test('minimisasi otomat yang sudah minimum tidak mengubah apa pun', () => {
  const view = convert('(a|b)*abb').views.raw;
  const once = minimizeAutomaton(view);
  const twice = minimizeAutomaton({ ...once, startState: once.startState });
  assert.equal(once.states.length, twice.states.length);
  assert.equal(once.transitions.length, twice.transitions.length);
});

test('konstanta epsilon tetap "E" karena dipakai pada tampilan', () => {
  assert.equal(EPSILON, 'E');
});
