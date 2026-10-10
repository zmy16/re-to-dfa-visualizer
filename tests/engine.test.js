import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, simulate, insertExplicitConcatenation } from '../src/engine.js';

const accepts = (re, strings) => {
  const result = convert(re);
  return strings.map((s) => simulate(result, s).accepted);
};

test('penyisipan konkatenasi eksplisit', () => {
  assert.equal(insertExplicitConcatenation('ab'), 'a•b');
  assert.equal(insertExplicitConcatenation('a(b)'), 'a•(b)');
  assert.equal(insertExplicitConcatenation('a*b'), 'a*•b');
  assert.equal(insertExplicitConcatenation('(a|b)*abb'), '(a|b)*•a•b•b');
});

test('a: hanya string "a" diterima', () => {
  assert.deepEqual(accepts('a', ['a', '', 'aa']), [true, false, false]);
});

test('E dicadangkan untuk string kosong, \E untuk huruf E biasa', () => {
  assert.deepEqual(accepts('\\E', ['E', '', 'a']), [true, false, false]);
});

test('a*: termasuk string kosong', () => {
  assert.deepEqual(accepts('a*', ['', 'a', 'aaa', 'b']), [true, true, true, false]);
});

test('a|b: salah satu simbol, bukan rangkaian', () => {
  assert.deepEqual(accepts('a|b', ['a', 'b', 'ab']), [true, true, false]);
});

test('ab: hanya "ab" dari contoh', () => {
  assert.deepEqual(accepts('ab', ['a', 'b', 'ab', 'abb']), [false, false, true, false]);
});

test('(a|b)*abb: kasus acuan utama', () => {
  assert.deepEqual(accepts('(a|b)*abb', ['abb', 'aabb', 'aba', 'babb', 'ab']), [true, true, false, true, false]);
});

test('epsilon bersifat nullable', () => {
  assert.deepEqual(accepts('E', ['', 'a']), [true, false]);
});

test('state awal adalah firstpos(root) dan state penerima memuat posisi #', () => {
  const result = convert('ab');
  const start = result.states.find((s) => s.isStart);
  assert.deepEqual(start.positions, [1]);
  const accepts = result.states.filter((s) => s.isAccept);
  assert.equal(accepts.length, 1);
  assert.deepEqual(accepts[0].positions, [3]);
});

test('setiap transisi mengarah ke state yang terdaftar', () => {
  const result = convert('(a|b)*abb');
  const ids = new Set(result.states.map((s) => s.id));
  for (const t of result.transitions) {
    assert.ok(ids.has(t.from), `state asal ${t.from} tidak terdaftar`);
    assert.ok(ids.has(t.to), `state tujuan ${t.to} tidak terdaftar`);
  }
});

test('followpos: a* menambahkan posisi ke dirinya sendiri lalu ke #', () => {
  const result = convert('a*');
  const row = result.followposTable.find((r) => r.symbol === 'a');
  assert.deepEqual([...row.followpos].sort((a, b) => a - b), [1, 2]);
});

test('star ganda diperlakukan setara star tunggal', () => {
  assert.deepEqual(accepts('a**', ['', 'a', 'aaa', 'b']), [true, true, true, false]);
});

test('input tidak valid menghasilkan SyntaxError yang dapat dibaca', () => {
  for (const bad of ['(a', 'a)', '|a', 'a|', '*a', 'a#b', '   ']) {
    assert.throws(() => convert(bad), SyntaxError, `harus gagal: ${bad}`);
  }
});

test('bullet dan titik diterima sebagai konkatenasi eksplisit', () => {
  assert.deepEqual(accepts('a•b', ['ab', 'a', 'b']), [true, false, false]);
  assert.deepEqual(accepts('a.b', ['ab', 'a', 'b']), [true, false, false]);
});

test('simulator mencatat jejak transisi', () => {
  const result = convert('ab');
  const run = simulate(result, 'ab');
  assert.equal(run.accepted, true);
  assert.deepEqual(run.steps.map((s) => s.to), ['S0', 'S1', 'S2']);
});

test('simulator menolak transisi yang tidak ada', () => {
  const result = convert('ab');
  const run = simulate(result, 'ac');
  assert.equal(run.accepted, false);
  assert.match(run.reason, /Tidak ada transisi/);
});
