import { pinyin } from '../libs/pinyin-pro/index.mjs';

const cases = ['微信', '腾讯会议', 'Firefox', 'Nautilus', '文件', '音乐播放器', '迅雷', 'QQ音乐', '滴滴出行', 'GIMP', '哔哩哔哩'];
for (const name of cases) {
    const first = pinyin(name, { pattern: 'first', toneType: 'none', type: 'array' })[0];
    console.log(`${name} -> ${first}`);
}
console.log('non-han check:', pinyin('AB12', { pattern: 'first', toneType: 'none', type: 'array' }).join(','));
