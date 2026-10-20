// ============================================================
//  每日記錄：內建項目
// ============================================================
//  挑選標準有兩條，缺一不可：
//    1. 啟動成本低——不用換衣服、不用鋪墊子、不用走到別的房間
//    2. 對「體力差、力量小、久坐痠痛」這三件事直接有用
//
//  所以這裡沒有任何需要暖身才能做的動作，也沒有會讓人喘到
//  不想再來一次的動作。研究上最站得住的一條是：運動當下的感受
//  可以預測半年後還在不在練——所以寧可少、寧可輕。
//
//  欄位：
//    key    固定不變的代號，寫進紀錄裡，之後改名字也不會對不上
//    name   顯示的名字
//    unit   'reps' 用次數算 ／ 'time' 用秒數算
//    sug    建議份量。這是「建議」不是「規定」——
//           做不到也可以按，按了就算數。詳見 README 的設計說明
//    cat    'move' 算進「今天有動」／ 'other' 只記錄不算
//    why    一句話說明為什麼選它
//    fig    對應 figures.js 裡的示範圖（沒有就留空）
// ============================================================

export const BUILTIN = [
  { key: 'squat',  name: '深蹲',          unit: 'reps', sug: 10, cat: 'move',
    why: '站著就能做，練到身上最大的肌群', fig: ['squat', 1] },

  { key: 'bridge', name: '臀橋',          unit: 'reps', sug: 12, cat: 'move',
    why: '躺著做，對久坐之後的下背最直接', fig: ['hinge', 0] },

  { key: 'incline', name: '斜面伏地挺身',  unit: 'reps', sug: 8,  cat: 'move',
    why: '撐桌子或流理台，不用趴到地上', fig: ['hpush', 2] },

  { key: 'birddog', name: '鳥狗',          unit: 'reps', sug: 5,  cat: 'move',
    why: '每邊 5 下，幾乎不會累，下背的保險', fig: ['stab', 0] },

  { key: 'hang',   name: '死掛',          unit: 'time', sug: 30, cat: 'move',
    why: '掛在單槓上就好，順便讓脊椎減壓', fig: ['vpull', 1] },

  { key: 'hipstretch', name: '髖屈肌伸展', unit: 'time', sug: 60, cat: 'move',
    why: '久坐最緊的地方，每邊 30 秒' },

  { key: 'chest',  name: '胸椎伸展',      unit: 'time', sug: 60, cat: 'move',
    why: '久坐圓背的另一處' },

  { key: 'walk',   name: '快走或爬樓梯',   unit: 'time', sug: 120, cat: 'move',
    why: '不用在家。等電梯的時候改走樓梯就算' },

  // ---- 以下只記錄，不算進「今天有動」 ----
  { key: 'read',   name: '閱讀',          unit: 'time', sug: 600, cat: 'other',
    why: '記錄用。不算進「今天有動」' },

  { key: 'meditate', name: '冥想',        unit: 'time', sug: 300, cat: 'other',
    why: '記錄用。不算進「今天有動」' },
];

/** 時間一律以「秒」存，顯示時才換算成好讀的樣子 */
export function fmtAmount(unit, amount) {
  if (amount == null) return '';
  if (unit === 'reps') return amount + ' 下';
  if (amount < 60) return amount + ' 秒';
  const m = amount / 60;
  return (Number.isInteger(m) ? m : m.toFixed(1)) + ' 分';
}

/** 選份量時給的快捷按鈕 */
export function quickPicks(unit, sug) {
  if (unit === 'reps') {
    const base = sug || 10;
    const out = new Set([1, 2, 3, 5, base]);
    [Math.round(base / 2), base * 2, base + 5].forEach((v) => { if (v >= 1) out.add(Math.round(v)); });
    return Array.from(out).sort((a, b) => a - b);
  }
  const out = new Set([10, 20, 30, 60, 120, 300, 600]);
  if (sug) out.add(sug);
  return Array.from(out).sort((a, b) => a - b);
}
