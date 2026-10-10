import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, simulate, minimizeAutomaton, insertExplicitConcatenation } from '../src/engine.js';

const stringsUpTo = (alphabet, maxLength) => {
  const out = [''];
  let level = [''];
  for (let length = 1; length <= maxLength; length += 1) {
    const next = [];
    for (const prefix of level) for (const symbol of alphabet) next.push(prefix + symbol);
    out.push(...next);
    level = next;
  }
  return out;
};

const CASES = [
  { re: 'a', alphabet: ['a', 'b'] },
  { re: 'a*', alphabet: ['a', 'b'] },
  { re: 'a|a', alphabet: ['a', 'b'] },
  { re: 'a*a*', alphabet: ['a', 'b'] },
  { re: '(a|b)*abb', alphabet: ['a', 'b'] },
  { re: 'a(b|c)*d', alphabet: ['a', 'b', 'c', 'd'] },
  { re: '(0|1)*101', alphabet: ['0', '1'] },
  { re: 'a*b*', alphabet: ['a', 'b'] },
  { re: '(a|b)*abb(a|b)*', alphabet: ['a', 'b'] },
];

/* ---------------- escape operator ---------------- */

test('escape membuat operator menjadi simbol literal', () => {
  const result = convert('a|\\*');
  assert.deepEqual(result.alphabet.sort(), ['*', 'a'].sort());
  assert.equal(simulate(result, '*').accepted, true);
  assert.equal(simulate(result, 'a').accepted, true);
  assert.equal(simulate(result, 'b').accepted, false);
});

test('escape untuk #, bullet, titik, dan kurung', () => {
  const hash = convert('\\#');
  assert.deepEqual(hash.alphabet, ['#']);
  assert.equal(simulate(hash, '#').accepted, true);

  const dot = convert('a\\.b');
  assert.deepEqual(dot.alphabet.sort(), ['.', 'a', 'b'].sort());
  assert.equal(simulate(dot, 'a.b').accepted, true);

  const bullet = convert('a\\•b');
  assert.equal(simulate(bullet, 'a•b').accepted, true);

  const paren = convert('\\(a\\)');
  assert.deepEqual(paren.alphabet.sort(), ['(', ')', 'a'].sort());
  assert.equal(simulate(paren, '(a)').accepted, true);
});

test('escape ditampilkan kembali dengan garis miring', () => {
  const result = convert('a|\\*');
  assert.match(result.explicit, /\\\*/);
});

test('garis miring di akhir ekspresi ditolak', () => {
  assert.throws(() => convert('a\\'), SyntaxError);
});

test('# tanpa escape tetap ditolak', () => {
  assert.throws(() => convert('a#b'), SyntaxError);
});

/* ---------------- minimisasi ---------------- */

test('minimisasi tidak mengubah bahasa yang diterima', () => {
  for (const { re, alphabet } of CASES) {
    const result = convert(re);
    const reference = new RegExp(`^(?:${re})$`);
    for (const candidate of stringsUpTo(alphabet, 4)) {
      const expected = reference.test(candidate);
      assert.equal(
        simulate(result.views.min, candidate).accepted,
        expected,
        `"${candidate}" untuk ${re} pada DFA minimum`,
      );
    }
  }
});

test('DFA minimum tidak pernah lebih besar dari hasil konstruksi langsung', () => {
  for (const { re } of CASES) {
    const result = convert(re);
    assert.ok(
      result.views.min.states.length <= result.views.raw.states.length,
      `${re}: minimum ${result.views.min.states.length} > langsung ${result.views.raw.states.length}`,
    );
  }
});

test('minimisasi menggabungkan state yang setara', () => {
  // Konstruksi langsung membuat satu state untuk setiap himpunan posisi yang berbeda,
  // sehingga ekspresi berikut menghasilkan lebih banyak state daripada DFA minimumnya.
  const result = convert('(a|b)*abb(a|b)*');
  assert.equal(result.views.raw.states.length, 6);
  assert.equal(result.views.min.states.length, 4);
  assert.equal(result.isMinimal, false);
  assert.ok(result.warnings.some((w) => w.includes('Minimisasi menggabungkan state')));
});

test('(a|b)*abb sudah minimum: 4 state', () => {
  const result = convert('(a|b)*abb');
  assert.equal(result.views.raw.states.length, 4);
  assert.equal(result.views.min.states.length, 4);
  assert.equal(result.isMinimal, true);
});

test('DFA minimum benar-benar minimum: setiap pasangan state bisa dibedakan', () => {
  // Untuk setiap pasangan state dicari satu string pembeda. Hasil akhir (terima,
  // tolak, atau tidak ada transisi) harus berbeda; kalau sama untuk semua string,
  // kedua state sebenarnya setara dan hasilnya belum minimum.
  for (const { re, alphabet } of CASES) {
    const view = convert(re).views.min;
    const outcome = (startId, input) => {
      let current = startId;
      for (const symbol of input) {
        const transition = view.transitions.find((t) => t.from === current && t.symbol === symbol);
        if (!transition) return 'jalan-buntu';
        current = transition.to;
      }
      return view.states.find((s) => s.id === current).isAccept ? 'terima' : 'tolak';
    };
    const distinguishable = (p, q) => stringsUpTo(alphabet, view.states.length)
      .some((candidate) => outcome(p, candidate) !== outcome(q, candidate));

    for (let i = 0; i < view.states.length; i += 1) {
      for (let j = i + 1; j < view.states.length; j += 1) {
        assert.ok(
          distinguishable(view.states[i].id, view.states[j].id),
          `${re}: state ${view.states[i].id} dan ${view.states[j].id} tidak bisa dibedakan, berarti belum minimum`,
        );
      }
    }
  }
});

test('minimisasi idempoten: menjalankan ulang tidak mengubah jumlah state', () => {
  for (const { re } of CASES) {
    const view = convert(re).views.min;
    assert.equal(minimizeAutomaton(view).states.length, view.states.length, re);
  }
});

test('state minimum menyimpan gabungan posisi asalnya', () => {
  const result = convert('(a|b)*abb(a|b)*');
  const min = result.views.min;
  const allPositions = [...new Set(min.states.flatMap((s) => s.positions))].sort((a, b) => a - b);
  const rawPositions = [...new Set(result.views.raw.states.flatMap((s) => s.positions))].sort((a, b) => a - b);
  assert.deepEqual(allPositions, rawPositions);
  assert.ok(min.states.some((s) => s.mergedFrom.length > 1), 'harus ada state hasil gabungan');
});

test('nama state memakai pola S0, S1, dan seterusnya', () => {
  const result = convert('(a|b)*abb(a|b)*');
  for (const key of ['raw', 'min']) {
    const ids = result.views[key].states.map((s) => s.id);
    assert.deepEqual(ids, ids.map((_, i) => `S${i}`), `${key} tidak berurutan seperti S0, S1`);
  }
  // Label tidak boleh berupa huruf tunggal, karena alfabet bisa berisi huruf apa pun.
  assert.ok(!result.views.min.states.some((s) => /^[A-Z]$/.test(s.id)));
});

test('nama state unik di kedua view', () => {
  const result = convert('(a|b)*abb(a|b)*');
  for (const key of ['raw', 'min']) {
    const ids = result.views[key].states.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, `${key} punya nama ganda`);
  }
});

test('jejak partisi minimisasi tersedia untuk ditampilkan bertahap', () => {
  const result = convert('(a|b)*abb(a|b)*');
  const rounds = result.views.min.rounds;
  assert.ok(Array.isArray(rounds), 'rounds harus ada di view minimum');
  assert.ok(rounds.length >= 2, 'harus ada partisi awal dan minimal satu perhalusan');

  // Putaran pertama selalu memisahkan state penerima dari yang bukan.
  const first = rounds[0].groups;
  const accepting = result.views.raw.states.filter((s) => s.isAccept).map((s) => s.id).sort();
  const nonAccepting = result.views.raw.states.filter((s) => !s.isAccept).map((s) => s.id).sort();
  const flat = first.flat().sort();
  assert.deepEqual(flat, [...nonAccepting, ...accepting].sort(), 'partisi awal harus memuat semua state');
  assert.ok(first.some((g) => g.join() === accepting.join()), 'state penerima harus jadi satu kelompok');

  // Setiap putaran berikutnya tidak boleh menggabungkan kelompok, hanya memecahnya.
  for (let i = 1; i < rounds.length; i += 1) {
    assert.ok(
      rounds[i].groups.length >= rounds[i - 1].groups.length,
      `putaran ${i + 1} mengurangi jumlah kelompok`,
    );
    assert.deepEqual(
      rounds[i].groups.flat().sort(),
      rounds[i - 1].groups.flat().sort(),
      `putaran ${i + 1} kehilangan atau menambah state`,
    );
  }

  // Putaran terakhir harus sama banyak dengan jumlah state DFA minimum.
  assert.equal(rounds[rounds.length - 1].groups.length, result.views.min.states.length);
});

test('setiap kelompok di jejak partisi diberi label', () => {
  const rounds = convert('(a|b)*abb(a|b)*').views.min.rounds;
  for (const round of rounds) {
    assert.ok(round.label.length > 8, 'setiap putaran butuh keterangan');
    assert.ok(round.groups.length > 0);
  }
});

test('automaton yang sudah minimum hanya punya satu putaran partisi', () => {
  const rounds = convert('a').views.min.rounds;
  assert.ok(rounds.length >= 1);
  assert.equal(rounds[rounds.length - 1].groups.length, convert('a').views.min.states.length);
});

test('alphabet tidak berisi penanda akhir', () => {
  const result = convert('(a|b)*abb');
  assert.deepEqual(result.alphabet, ['a', 'b']);
  assert.ok(!result.alphabet.includes('#'));
});

// Menjalankan string dari state awal tertentu, untuk uji keterbedaan state.
function runFrom(view, input, startId) {
  let current = startId;
  for (const symbol of input) {
    const transition = view.transitions.find((t) => t.from === current && t.symbol === symbol);
    if (!transition) return null;
    current = transition.to;
  }
  return view.states.find((s) => s.id === current).isAccept ? 'terima' : 'tolak';
}
