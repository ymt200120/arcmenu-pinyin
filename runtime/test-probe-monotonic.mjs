// Probe ordering logic pure test (Node only; no GNOME Shell required).
import assert from '../tests/assert.mjs';
import {isPinyinLettersMonotonic} from './probe-pinyin-check@ymt200120/monotonic.js';

const cases = [
    ['# first, repeated #, then A-Z', ['#', '#', 'A', 'A', 'B', 'Z'], true],
    ['A-Z without #', ['A', 'A', 'C', 'Z'], true],
    ['# after a letter', ['A', '#', 'B'], false],
    ['descending letters', ['#', 'B', 'A'], false],
    ['invalid bucket', ['#', 'A', '中'], false],
    ['empty sequence', [], true],
];

for (const [name, letters, expected] of cases)
    assert.strictEqual(isPinyinLettersMonotonic(letters), expected, name);

console.log(`PASS  ${cases.length} probe monotonic cases`);
