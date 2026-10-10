import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, simulate } from '../src/engine.js';

// Uji ekuivalensi: hasil DFA harus menerima tepat himpunan string yang sama
// dengan pencocokan regex langsung (brute force atas semua string pendek).
const CASES = [
  { re: 'a', alphabet: ['a', 'b'] },
  { re: 'b', alphabet: ['a', 'b'] },
  { re: 'ab', alphabet: ['a', 'b'] },
  { re: 'a|b', alphabet: ['a', 'b'] },
  { re: 'a*', alphabet: ['a', 'b'] },
  { re: 'a*b*', alphabet: ['a', 'b'] },
  { re: 'ab*', alphabet: ['a', 'b'] },
  { re: '(a|b)*', alphabet: ['a', 'b'] },
  { re: '(a|b)*abb', alphabet: ['a', 'b'] },
  { re: 'a(b|c)*d', alphabet: ['a', 'b', 'c', 'd'] },
  { re: '(0|1)*101', alphabet: ['0', '1'] },
];

function stringsUpTo(alphabet, maxLength) {
  const out = [''];
  let level = [''];
  for (let length = 1; length <= maxLength; length += 1) {
    const next = [];
    for (const prefix of level) {
      for (const symbol of alphabet) next.push(prefix + symbol);
    }
    out.push(...next);
    level = next;
  }
  return out;
}

for (const { re, alphabet } of CASES) {
  test(`ekuivalen dengan regex langsung: ${re}`, () => {
    const result = convert(re);
    // Regex acuan memakai sintaks yang sama, jadi bisa dibangun langsung.
    const reference = new RegExp(`^(?:${re})$`);
    for (const candidate of stringsUpTo(alphabet, 4)) {
      const expected = reference.test(candidate);
      const actual = simulate(result, candidate).accepted;
      assert.equal(
        actual,
        expected,
        `"${candidate}" untuk ${re}: DFA=${actual}, regex=${expected}`,
      );
    }
  });
}

test('simulator tidak bergantung pada hasil konversi sebelumnya', () => {
  const first = convert('ab');
  const second = convert('a*');
  assert.equal(simulate(first, 'ab').accepted, true);
  // Memakai hasil lama terhadap string baru harus tetap konsisten.
  assert.equal(simulate(first, 'a').accepted, false);
  assert.equal(simulate(second, 'aaa').accepted, true);
});
