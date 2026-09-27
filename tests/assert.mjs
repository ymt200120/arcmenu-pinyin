// 零依赖断言垫片（Node / GJS 通用）
function fail(message) {
    throw new Error(message);
}

function fmt(v) {
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

export function ok(value, message = 'expected truthy value') {
    if (!value)
        fail(message);
}

export function strictEqual(actual, expected, message) {
    if (actual !== expected)
        fail(message ?? `expected ${fmt(expected)}, got ${fmt(actual)}`);
}

export function notStrictEqual(actual, expected, message) {
    if (actual === expected)
        fail(message ?? `expected values to differ, both are ${fmt(actual)}`);
}

export function deepStrictEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e)
        fail(message ?? `expected deep ${e}, got ${a}`);
}

const assert = {ok, strictEqual, notStrictEqual, deepStrictEqual};
export default assert;
