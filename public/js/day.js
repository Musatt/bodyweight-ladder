// ============================================================
//  「今天」是哪一天
// ============================================================
//  刻意不用午夜當分界，改成凌晨 3 點。
//
//  原因很實際：常常過了 00:00 一點點才在記，如果用午夜分界，
//  那一下就被算成隔天了——明明是同一個晚上的事。
//
//  所以 00:00–02:59 之間，這裡回報的「今天」還是前一天。
//  App 裡每一個判斷今天的地方都要走這個函式，
//  不要自己用 new Date() 算，不然會有的地方換日、有的地方沒換。
// ============================================================

/** 幾點換日。想改成別的時間只要改這個數字 */
export const DAY_START_HOUR = 3;

export function ymd(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

/** 現在算哪一天。凌晨 3 點以前算前一天 */
export function today() {
  const d = new Date();
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}

/** 把 'YYYY-MM-DD' 轉回 Date（本地時間的午夜） */
export function parseYMD(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 現在是不是在「還沒換日」的那段凌晨時間 */
export function inGraceWindow() {
  return new Date().getHours() < DAY_START_HOUR;
}
