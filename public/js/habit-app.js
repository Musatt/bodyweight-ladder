// ============================================================
//  每日記錄 — 這個 App 的主體
// ============================================================
//  畫面架構（2026-10-20 重做）：
//
//    底部頁籤「今天」  打開就看到：今天有沒有動 → 月曆 → 統計 → 選到那天的明細
//    底部頁籤「記錄」  日期欄 ＋ 項目清單，點項目跳出底部面板
//    右上角選單        動作說明、為什麼這樣設計、完整訓練計畫、備份、登出
//
//  三個刻意的決定：
//
//  1. 記一次用「底部彈出面板」不是就地展開。
//     就地展開會把下面的東西推走，原本盯著的那一項會跑掉。
//
//  2. 畫面上幾乎沒有說明文字。
//     操作類的說明看一次就記得了，第二次之後都是雜訊。
//     觀念類的（為什麼沒有連續天數、要做多少才夠）放在選單的
//     「為什麼這樣設計」，忘記再去看。
//
//  3. 不顯示連續天數，也不寫「斷一天沒事」之類的話。
//     那句話跟連續天數是同一個意思，一樣會製造壓力。
// ============================================================

import { BUILTIN, fmtAmount, quickPicks } from './habits.js';
import { figureSVG } from './figures.js';
import * as store from './store.js';

let log = [];          // 最近的紀錄
let custom = [];       // 使用者自訂的項目
let selDate = null;    // 「今天」頁選到哪一天
let logDate = null;    // 「記錄」頁要記到哪一天
let monthAnchor = null;
let sheetItem = null;  // 彈出面板開的是哪個項目
let tab = 'today';

/* ---------- 小工具 ---------- */

const WD = ['日', '一', '二', '三', '四', '五', '六'];

function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function today() { return ymd(new Date()); }
function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function $(id) { return document.getElementById(id); }

function allItems() {
  const mine = custom.map((c) => ({
    key: 'custom:' + c.id, name: c.name, unit: c.unit,
    sug: c.suggested == null ? null : Number(c.suggested),
    cat: c.category, custom: true, id: c.id,
  }));
  return BUILTIN.concat(mine);
}
function itemByKey(k) { return allItems().filter((x) => x.key === k)[0]; }

function rowsOn(d) { return log.filter((r) => r.done_on === d); }
function movedOn(d) { return rowsOn(d).some((r) => r.category === 'move'); }
function otherOn(d) { return rowsOn(d).some((r) => r.category === 'other'); }

function dayLabel(ds) {
  const d = parseYMD(ds);
  if (ds === today()) return '今天';
  const diff = Math.round((parseYMD(today()) - d) / 864e5);
  if (diff === 1) return '昨天';
  return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
}

/* ---------- 頁籤一：月曆 ---------- */

function renderCalendar() {
  const y = monthAnchor.getFullYear(), m = monthAnchor.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;   // 星期一當一週的開始

  $('h-monthlabel').textContent = y + ' 年 ' + (m + 1) + ' 月';
  $('h-next').disabled = new Date(y, m + 1, 1) > new Date();

  let h = '<div class="cal">';
  ['一', '二', '三', '四', '五', '六', '日'].forEach((d) => { h += '<span class="cal-h">' + d + '</span>'; });
  for (let i = 0; i < lead; i++) h += '<span class="cal-x"></span>';

  for (let d = 1; d <= days; d++) {
    const ds = ymd(new Date(y, m, d));
    const mv = movedOn(ds), ot = otherOn(ds);
    // 三種狀態用三個差很多的顏色：綠＝有動、陶土＝只有其他、暗＝沒紀錄
    const cls = mv ? ('moved' + (ot ? ' both' : '')) : (ot ? 'other' : '');
    h += '<button class="cal-d ' + cls
      + (ds === today() ? ' today' : '') + (ds === selDate ? ' sel' : '') + '"'
      + (ds > today() ? ' disabled' : '') + ' data-day="' + ds + '">'
      + '<span class="n">' + d + '</span></button>';
  }
  $('h-calendar').innerHTML = h + '</div>';

  $('h-calendar').querySelectorAll('[data-day]').forEach((b) => {
    b.addEventListener('click', () => {
      selDate = b.getAttribute('data-day');
      renderCalendar(); renderDay();
    });
  });
}

function renderStats() {
  const y = monthAnchor.getFullYear(), m = monthAnchor.getMonth();
  const inM = (ds, mm) => { const d = parseYMD(ds); return d.getFullYear() === (mm ? mm.getFullYear() : y) && d.getMonth() === (mm ? mm.getMonth() : m); };

  const movedDays = new Set(log.filter((r) => r.category === 'move' && inM(r.done_on)).map((r) => r.done_on));
  const times = log.filter((r) => inM(r.done_on)).length;
  const otherDays = new Set(log.filter((r) => r.category === 'other' && inM(r.done_on)).map((r) => r.done_on));

  const pm = new Date(y, m - 1, 1);
  const prev = new Set(log.filter((r) => r.category === 'move' && inM(r.done_on, pm)).map((r) => r.done_on)).size;

  $('st-days').textContent = movedDays.size;
  const diff = movedDays.size - prev;
  $('st-diff').textContent = prev === 0 && movedDays.size === 0 ? ''
    : (diff > 0 ? '比上個月多 ' + diff : (diff < 0 ? '比上個月少 ' + (-diff) : '跟上個月一樣'));
  $('st-times').textContent = times;
  $('st-other').textContent = otherDays.size ? '其他 ' + otherDays.size + ' 天' : '';

  const counts = {};
  log.filter((r) => inM(r.done_on)).forEach((r) => {
    const k = r.item_name || r.item_key;
    counts[k] = (counts[k] || 0) + 1;
  });
  const keys = Object.keys(counts).sort((p, q) => counts[q] - counts[p]);
  $('h-breakdown').innerHTML = keys.map((k) =>
    '<span class="tally">' + esc(k) + ' <b>' + counts[k] + '</b></span>').join('');
}

function renderDay() {
  $('h-dayname').textContent = dayLabel(selDate);
  $('h-daydate').textContent = selDate + '（' + WD[parseYMD(selDate).getDay()] + '）';

  const rows = rowsOn(selDate);
  $('h-donelist').innerHTML = rows.length
    ? rows.map((r) =>
      '<div class="doneRow"><span class="dot' + (r.category === 'move' ? '' : ' other') + '"></span>'
      + '<span class="nm">' + esc(r.item_name || r.item_key) + '</span>'
      + '<span class="amt">' + esc(fmtAmount(r.unit, r.amount == null ? null : Number(r.amount))) + '</span>'
      + '<button class="undo" data-undo="' + esc(r.id) + '" aria-label="收回">×</button></div>').join('')
    : '<div class="emptyday">沒有紀錄</div>';

  $('h-donelist').querySelectorAll('[data-undo]').forEach((b) => {
    b.addEventListener('click', () => removeRow(b.getAttribute('data-undo')));
  });
}

async function removeRow(id) {
  const ok = await store.removeHabit(id);
  if (!ok) return;
  log = log.filter((x) => String(x.id) !== String(id));
  renderAll();
}

/* ---------- 頁籤二：記錄 ---------- */

function renderLogTab() {
  $('h-date').value = logDate;
  $('h-datetoday').hidden = logDate === today();

  const items = allItems();
  const cell = (it) => {
    const n = rowsOn(logDate).filter((r) => r.item_key === it.key).length;
    return '<button class="item' + (n ? ' hit' : '') + '" data-item="' + esc(it.key) + '">'
      + '<span class="nm">' + esc(it.name) + '</span>'
      + '<span class="sug">' + (it.sug ? esc(fmtAmount(it.unit, it.sug)) : '隨意') + '</span>'
      + (n ? '<span class="cnt">' + n + '</span>' : '') + '</button>';
  };
  $('h-movegrid').innerHTML = items.filter((i) => i.cat === 'move').map(cell).join('');
  $('h-othergrid').innerHTML = items.filter((i) => i.cat === 'other').map(cell).join('');

  renderManage();
}

function renderManage() {
  const host = $('h-manage');
  host.innerHTML = custom.map((c) =>
    '<div class="mrow"><span class="nm">' + esc(c.name) + '</span>'
    + '<span class="meta">' + (c.category === 'move' ? '動一動' : '其他') + '</span>'
    + '<button class="del" data-del="' + esc(c.id) + '">刪除</button></div>').join('');

  host.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-del');
      const c = custom.filter((x) => String(x.id) === String(id))[0];
      if (!c || !confirm('刪掉「' + c.name + '」？已經記過的紀錄會留著。')) return;
      if (!await store.archiveItem(id)) return;
      custom = custom.filter((x) => String(x.id) !== String(id));
      renderAll();
    });
  });
}

/* ---------- 記一次的彈出面板 ---------- */

function openSheet(key, dateStr) {
  const it = itemByKey(key);
  if (!it) return;
  sheetItem = { it, date: dateStr };
  $('ls-name').textContent = it.name;
  paintSheet();
  $('logsheet').hidden = false;
}

function paintSheet() {
  const { it, date } = sheetItem;
  const mine = rowsOn(date).filter((r) => r.item_key === it.key);

  let h = '<button class="pk-main" data-log="">記一次'
    + (it.sug ? '　' + esc(fmtAmount(it.unit, it.sug)) : '') + '</button>';

  h += '<div class="pk-chips">';
  quickPicks(it.unit, it.sug).forEach((v) => {
    h += '<button class="pk-chip" data-log="' + v + '">' + esc(fmtAmount(it.unit, v)) + '</button>';
  });
  h += '<button class="pk-chip free" id="ls-freebtn">自己填</button></div>';
  h += '<div class="freerow" id="ls-freerow" hidden>'
    + '<input type="text" id="ls-free" inputmode="decimal" placeholder="'
    + (it.unit === 'reps' ? '幾下' : '幾分鐘') + '">'
    + '<button id="ls-freeok">確定</button></div>';

  $('ls-body').innerHTML = h;

  $('ls-foot').hidden = !mine.length;
  if (mine.length) {
    $('ls-count').textContent = dayLabel(date) + '已記 ' + mine.length + ' 次';
  }

  $('ls-body').querySelectorAll('[data-log]').forEach((b) => {
    b.addEventListener('click', () => {
      const raw = b.getAttribute('data-log');
      doLog(raw === '' ? (it.sug == null ? null : it.sug) : Number(raw));
    });
  });
  $('ls-freebtn').addEventListener('click', () => {
    $('ls-freerow').hidden = false;
    $('ls-free').focus();
  });
  $('ls-freeok').addEventListener('click', submitFree);
  $('ls-free').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitFree(); });
}

function submitFree() {
  const { it } = sheetItem;
  let v = Number($('ls-free').value.trim());
  if (!isFinite(v) || v <= 0) { $('ls-free').focus(); return; }
  if (it.unit === 'time') v = Math.round(v * 60);   // 輸入分鐘，存秒
  doLog(Math.round(v));
}

async function doLog(amount) {
  const { it, date } = sheetItem;
  const id = await store.addHabit({
    done_on: date, item_key: it.key, item_name: it.name,
    category: it.cat, unit: it.unit, amount,
  });
  if (!id) return;
  log.unshift({ id, done_on: date, item_key: it.key, item_name: it.name,
    category: it.cat, unit: it.unit, amount });
  closeSheet();
  renderAll();
}

function closeSheet() { $('logsheet').hidden = true; sheetItem = null; }

/* ---------- 頁籤切換 ---------- */

function switchTab(t) {
  tab = t;
  $('v-today').hidden = t !== 'today';
  $('v-log').hidden = t !== 'log';
  $('h-tabs').querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-selected', b.getAttribute('data-tab') === t ? 'true' : 'false');
  });
  window.scrollTo(0, 0);
}

/* ---------- 整頁：動作說明 ---------- */

function renderGuide() {
  const items = BUILTIN.filter((i) => i.guide && i.guide.how);
  $('gp-list').innerHTML = items.map((it, i) => {
    const g = it.guide;
    const fig = it.fig ? figureSVG(it.fig[0], it.fig[1]) : null;
    return '<div class="guide-item">'
      + '<button class="guide-h" data-g="' + i + '">'
      + '<span class="nm">' + esc(it.name) + '</span>'
      + '<span class="amt">' + esc(fmtAmount(it.unit, it.sug)) + '</span>'
      + '<span class="car">展開</span></button>'
      + '<div class="guide-b" hidden data-gb="' + i + '">'
      + (fig ? '<div class="guide-fig">' + fig + '</div>' : '')
      + '<p class="guide-note">' + g.what + '</p>'
      + '<div class="guide-sec"><h4>怎麼做</h4><ol>'
      + g.how.map((s) => '<li>' + s + '</li>').join('') + '</ol></div>'
      + '<div class="guide-sec"><h4>要點</h4><ul>'
      + g.key.map((s) => '<li>' + s + '</li>').join('') + '</ul></div>'
      + '<div class="guide-sec bad"><h4>常見錯誤</h4><ul>'
      + g.bad.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul></div>'
      + '</div></div>';
  }).join('');

  $('gp-list').querySelectorAll('[data-g]').forEach((b) => {
    b.addEventListener('click', () => {
      const i = b.getAttribute('data-g');
      const body = document.querySelector('[data-gb="' + i + '"]');
      body.hidden = !body.hidden;
      b.querySelector('.car').textContent = body.hidden ? '展開' : '收合';
    });
  });
}

/* ---------- 啟動 ---------- */

function renderAll() {
  renderCalendar(); renderStats(); renderDay(); renderLogTab();
}

function wire() {
  $('h-tabs').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.getAttribute('data-tab')));
  });

  $('h-prev').addEventListener('click', () => {
    monthAnchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1);
    renderCalendar(); renderStats();
  });
  $('h-next').addEventListener('click', () => {
    const n = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
    if (n > new Date()) return;
    monthAnchor = n; renderCalendar(); renderStats();
  });

  // 從「今天」頁選到的那一天直接去記一筆
  $('h-addhere').addEventListener('click', () => {
    logDate = selDate;
    switchTab('log');
    renderLogTab();
  });

  $('h-date').addEventListener('change', (e) => {
    logDate = e.target.value || today();
    if (logDate > today()) logDate = today();
    renderLogTab();
  });
  $('h-datetoday').addEventListener('click', () => { logDate = today(); renderLogTab(); });

  [['h-movegrid'], ['h-othergrid']].forEach(([id]) => {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('[data-item]');
      if (b) openSheet(b.getAttribute('data-item'), logDate);
    });
  });

  $('ls-close').addEventListener('click', closeSheet);
  $('logsheet').addEventListener('click', (e) => { if (e.target.id === 'logsheet') closeSheet(); });
  $('ls-undo').addEventListener('click', async () => {
    const mine = rowsOn(sheetItem.date).filter((r) => r.item_key === sheetItem.it.key);
    if (!mine.length) return;
    const ok = await store.removeHabit(mine[0].id);
    if (!ok) return;
    log = log.filter((x) => String(x.id) !== String(mine[0].id));
    paintSheet(); renderAll();
  });

  // 自訂項目
  $('h-addbtn').addEventListener('click', () => { $('newsheet').hidden = false; $('h-newname').focus(); });
  $('ns-close').addEventListener('click', () => { $('newsheet').hidden = true; });
  $('newsheet').addEventListener('click', (e) => { if (e.target.id === 'newsheet') $('newsheet').hidden = true; });
  $('h-newsave').addEventListener('click', async () => {
    const name = $('h-newname').value.trim();
    if (!name) { $('h-newname').focus(); return; }
    const unit = $('h-newunit').value;
    let sug = $('h-newsug').value.trim() === '' ? null : Number($('h-newsug').value);
    if (sug != null && (!isFinite(sug) || sug <= 0)) sug = null;
    if (sug != null && unit === 'time') sug = Math.round(sug * 60);
    const category = $('h-newcat').value;

    const id = await store.addItem({ name, unit, suggested: sug, category, sort: custom.length });
    if (!id) return;
    custom.push({ id, name, unit, suggested: sug, category, sort: custom.length });
    $('h-newname').value = ''; $('h-newsug').value = '';
    $('newsheet').hidden = true;
    renderAll();
  });

  // 動作說明那一頁
  $('gp-back').addEventListener('click', () => { $('guidepage').hidden = true; });
  $('wp-back').addEventListener('click', () => { $('whypage').hidden = true; });
}

export function openGuidePage() { renderGuide(); $('guidepage').hidden = false; window.scrollTo(0, 0); }
export function openWhyPage() { $('whypage').hidden = false; window.scrollTo(0, 0); }

export async function refreshHabits() {
  const since = ymd(new Date(Date.now() - 400 * 864e5));
  const res = await store.loadHabits(since);
  log = res.log.map((r) => Object.assign({}, r));
  custom = res.items.map((r) => Object.assign({}, r));
  renderAll();
}

let wired = false;
export async function startHabits() {
  selDate = today();
  logDate = today();
  monthAnchor = new Date();
  if (!wired) { wire(); wired = true; }
  await refreshHabits();
}
