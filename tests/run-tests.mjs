// 极简测试运行器（零依赖，Node 与 GJS 双跑）
// 用法：
//   node  tests/run-tests.mjs
//   gjs -m tests/run-tests.mjs
// 默认按清单加载同目录下全部 *.test.mjs。

const TEST_FILES = [
    './pinyin.test.mjs',
    './sort.test.mjs',
    './injection.test.mjs',
    './integration.test.mjs',
    './bucketgrid.test.mjs',
];

function fileUrl(relative) {
    // GJS 1.80 无 URL 全局，用字符串拼装 file:// URI
    const base = import.meta.url.replace(/\/[^/]*$/, '');
    return `${base}/${relative.replace(/^\.\//, '')}`;
}

let passed = 0;
const failures = [];

for (const file of TEST_FILES) {
    const mod = await import(fileUrl(file));
    for (const [name, fn] of mod.tests ?? []) {
        try {
            await fn();
            passed++;
            console.log(`PASS  ${name}`);
        } catch (e) {
            failures.push({name, error: e});
            console.log(`FAIL  ${name}: ${e?.message ?? e}`);
        }
    }
}

console.log(`\n${passed} passed, ${failures.length} failed (${envName()})`);
if (failures.length > 0) {
    for (const {name, error} of failures)
        console.log(`--- ${name}\n${error?.stack ?? error}`);
}

await exitWith(failures.length === 0 ? 0 : 1);

function envName() {
    if (globalThis.process?.versions?.node)
        return `node ${globalThis.process.versions.node}`;
    return 'gjs';
}

async function exitWith(code) {
    if (globalThis.process?.exit) {
        globalThis.process.exitCode = code;
        return;
    }
    // GJS: system 内置模块
    const System = (await import('system')).default;
    System.exit(code);
}
