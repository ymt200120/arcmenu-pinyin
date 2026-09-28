// 纯逻辑：验证拼音首字母序列为“# 在最前，随后 A-Z 非递减”。
// 独立成模块，便于 Node/GJS 测试而无需加载 GNOME Shell 依赖。

export function isPinyinLettersMonotonic(letters) {
    let previousLetter = null;
    let sawLetter = false;

    for (const letter of letters ?? []) {
        if (letter === '#') {
            if (sawLetter)
                return false;
            continue;
        }

        if (!/^[A-Z]$/.test(letter))
            return false;
        if (previousLetter !== null && previousLetter > letter)
            return false;

        previousLetter = letter;
        sawLetter = true;
    }

    return true;
}
