import {pinyin} from '../../../../.local/share/gnome-shell/extensions/arcmenu@arcmenu.com/libs/pinyin-pro/index.mjs';

const _firstLetterCache = new Map();

function indexLetterForName(name) {
    if (!name)
        return '#';

    const first = name.charAt(0);
    if (/[a-zA-Z]/.test(first))
        return first.toUpperCase();

    if (/[0-9]/.test(first) || /[\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/.test(first))
        return '#';

    if (_firstLetterCache.has(first))
        return _firstLetterCache.get(first);

    let letter = '#';
    try {
        const candidate = pinyin(first, { pattern: 'first', toneType: 'none', type: 'array' })[0];
        if (candidate && /^[a-zA-Z]$/.test(candidate))
            letter = candidate.toUpperCase();
    } catch {
        letter = '#';
    }
    _firstLetterCache.set(first, letter);
    return letter;
}

const apps = ['微信', 'Firefox', '腾讯会议', '360安全浏览器', 'Nautilus', '哔哩哔哩', 'GIMP',
    '音乐', 'WPS Office', 'VLC', 'edge', '相册', '设置', '钉钉', 'Anaconda Navigator', '快照'];
const entries = apps.map(name => ({name, letter: indexLetterForName(name)}));
entries.sort((a, b) => {
    if (a.letter !== b.letter) {
        if (a.letter === '#')
            return 1;
        if (b.letter === '#')
            return -1;
        return a.letter < b.letter ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'zh');
});

let current = null;
for (const {name, letter} of entries) {
    if (letter !== current) {
        current = letter;
        print(`[组 ${letter}]`);
    }
    print(`   ${name}`);
}
