// ============================================================
//  每日記錄 — 這個 App 的主體
// ============================================================
//  設計上有四條規則，都是有來由的，改之前先看一下理由：
//
//  1. 只有一個目標：今天有沒有動。
//     做任一個運動項目的任一下就算數。閱讀、冥想這些會被記錄、
//     會出現在日曆上，但不算進「今天有動」——不然可能連續三十天
//     達標卻一次都沒動過，而想改善的體力和力量只有動才會變。
//
//  2. 不顯示連續天數，一個字都不顯示。
//     Silverman & Barasch（2023, JCR）：連續紀錄完好時會推人一把
//     （66% vs 58%），但中斷的人更可能整個不再使用。既然中斷的
//     傷害大於順利時的幫助，乾脆不做。主角是日曆和月累積。
//
//  3. 份量是「建議」不是「規定」。
//     按一下就算一次，沒做到建議份量也算。數字想記再記。
//     多一個必填參數就是多一道摩擦，而摩擦是會累積的。
//
//  4. 可以補記前幾天。
//     同一份研究說「能補救」會削弱中斷的打擊。
// ============================================================

import { BUILTIN, fmtAmount, quickPicks } from './habits.js';
import { figureSVG } from './figures.js';
import * as store from './store.js';

let log = [];          // 最近的紀錄
let custom = [];       // 使用者自訂的項目
let viewDate = null;   // 目前在記哪一天（預設今天，可以往回補）
let monthAnchor = null;// 日曆顯示哪個月
let openItem = null;   // 展開份量選擇的是哪個項目
let onSyncError = () => {};

/* ---------- 小工具 ---------- */

function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function today() { return ymd(new Date()); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function $(id) { return document.getElementById(id); }
function parseYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

/** 內建 ＋ 自訂，合成一份完整的項目清單 */
function allItems() {
  const mine = custom.map((c) => ({
    key: 'custom:' + c.id, name: c.name, unit: c.unit,
    sug: c.suggested == null ? null : Number(c.suggested),
    cat: c.category, why: '', custom: true, id: c.id,
  }));
  return BUILTIN.concat(mine);
}

function itemsOn(dateStr) { return log.filter((r) => r.done_on === dateStr); }
function movedOn(dateStr) { return itemsOn(dateStr).some((r) => r.category === 'move'); }
function anythingOn(dateStr) { return itemsOn(dateStr).length > 0; }

/* ---------- 今天 ---------- */

function renderToday() {
  const isToday = viewDate === today();
  const rows = itemsOn(viewDate);
  const moved = movedOn(viewDate);

  $('h-dateline').textContent = isToday
    ? '今天 · ' + viewDate
    : '補記 ' + viewDate;
  $('h-backtoday').hidden = isToday;

  // 今天有沒有動——整個畫面最重要的一句話
  const st = $('h-status');
  st.className = 'status' + (moved ? ' done' : '');
  st.innerHTML = moved
    ? '<span class="big">今天有動 ✓</span><span class="sm">就這樣，夠了。想再做就再按。</span>'
    : '<span class="big">今天還沒有動</span><span class="sm">做任何一個項目的任何一下，按一下就算數。</span>';

  const items = allItems();
  const move = items.filter((i) => i.cat === 'move');
  const other = items.filter((i) => i.cat === 'other');

  $('h-movegrid').innerHTML = move.map(itemBtn).join('');
  $('h-othergrid').innerHTML = other.length
    ? other.map(itemBtn).join('')
    : '<p class="note" style="padding:2px">還沒有其他項目。用下面的「＋ 自訂項目」加。</p>';

  // 展開的份量選擇面板
  const pick = $('h-picker');
  if (openItem) {
    const it = items.filter((x) => x.key === openItem)[0];
    if (it) {
      pick.hidden = false;
      pick.innerHTML = pickerHTML(it);
      wirePicker(it);
    } else { openItem = null; pick.hidden = true; }
  } else { pick.hidden = true; pick.innerHTML = ''; }

  // 這一天做了什麼
  $('h-donelist').innerHTML = rows.length
    ? rows.map((r) =>
      '<div class="doneRow"><span class="dot' + (r.category === 'move' ? '' : ' other') + '"></span>'
      + '<span class="nm">' + esc(r.item_name || r.item_key) + '</span>'
      + '<span class="amt">' + esc(fmtAmount(r.unit, r.amount == null ? null : Number(r.amount))) + '</span>'
      + '<button class="undo" data-undo="' + esc(r.id) + '" title="收回這一筆">×</button></div>').join('')
    : '<p class="note" style="padding:4px 2px">這一天還沒有紀錄。</p>';

  $('h-donelist').querySelectorAll('[data-undo]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-undo');
      const ok = await store.removeHabit(id);
      if (!ok) return;
      log = log.filter((x) => String(x.id) !== String(id));
      renderToday(); renderCalendar(); renderSummary();
    });
  });
}

function itemBtn(it) {
  const n = itemsOn(viewDate).filter((r) => r.item_key === it.key).length;
  return '<button class="item' + (n ? ' hit' : '') + (openItem === it.key ? ' open' : '') + '" data-item="' + esc(it.key) + '">'
    + '<span class="nm">' + esc(it.name) + '</span>'
    + '<span class="sug">' + (it.sug ? '建議 ' + esc(fmtAmount(it.unit, it.sug)) : '隨意') + '</span>'
    + (n ? '<span class="cnt">' + n + '</span>' : '')
    + '</button>';
}

function pickerHTML(it) {
  const picks = quickPicks(it.unit, it.sug);
  let h = '<div class="pk-head"><b>' + esc(it.name) + '</b>'
    + (it.why ? '<span class="why">' + esc(it.why) + '</span>' : '') + '</div>';

  const fig = it.fig ? figureSVG(it.fig[0], it.fig[1]) : null;
  if (fig) h += '<div class="pk-fig">' + fig + '</div>';

  h += '<button class="pk-main" data-log="">記一次'
    + (it.sug ? '（建議 ' + esc(fmtAmount(it.unit, it.sug)) + '）' : '') + '</button>';

  h += '<div class="pk-or">做的量跟建議不一樣？直接選實際的：</div><div class="pk-chips">';
  picks.forEach((v) => {
    h += '<button class="pk-chip" data-log="' + v + '">' + esc(fmtAmount(it.unit, v)) + '</button>';
  });
  h += '</div>';
  h += '<button class="pk-close">關起來</button>';
  return h;
}

function wirePicker(it) {
  const pick = $('h-picker');
  pick.querySelectorAll('[data-log]').forEach((b) => {
    b.addEventListener('click', async () => {
      const raw = b.getAttribute('data-log');
      // 「記一次」不帶數字時，就把建議份量當作實際做的量記下來
      const amount = raw === '' ? (it.sug == null ? null : it.sug) : Number(raw);
      b.disabled = true;
      const id = await store.addHabit({
        done_on: viewDate, item_key: it.key, item_name: it.name,
        category: it.cat, unit: it.unit, amount,
      });
      b.disabled = false;
      if (!id) return;
      log.unshift({ id, done_on: viewDate, item_key: it.key, item_name: it.name,
        category: it.cat, unit: it.unit, amount });
      openItem = null;
      renderToday(); renderCalendar(); renderSummary();
    });
  });
  pick.querySelector('.pk-close').addEventListener('click', () => { openItem = null; renderToday(); });
}

/* ---------- 日曆 ---------- */

function renderCalendar() {
  const a = monthAnchor;
  const y = a.getFullYear(), m = a.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;        // 星期一當一週的開始

  $('h-monthlabel').textContent = y + ' 年 ' + (m + 1) + ' 月';

  let h = '<div class="cal">';
  ['一', '二', '三', '四', '五', '六', '日'].forEach((d) => { h += '<span class="cal-h">' + d + '</span>'; });
  for (let i = 0; i < lead; i++) h += '<span class="cal-x"></span>';

  for (let d = 1; d <= days; d++) {
    const ds = ymd(new Date(y, m, d));
    const moved = movedOn(ds);
    const other = !moved && anythingOn(ds);
    const isToday = ds === today();
    const isView = ds === viewDate;
    const future = ds > today();
    h += '<button class="cal-d' + (moved ? ' moved' : '') + (other ? ' other' : '')
      + (isToday ? ' today' : '') + (isView ? ' sel' : '') + '"'
      + (future ? ' disabled' : '') + ' data-day="' + ds + '">'
      + '<span class="n">' + d + '</span>'
      + (moved ? '<span class="pip"></span>' : (other ? '<span class="pip o"></span>' : ''))
      + '</button>';
  }
  h += '</div>';
  $('h-calendar').innerHTML = h;

  $('h-calendar').querySelectorAll('[data-day]').forEach((b) => {
    b.addEventListener('click', () => {
      viewDate = b.getAttribute('data-day');
      openItem = null;
      renderToday(); renderCalendar();
      $('h-today').scrollIntoView({ block: 'start' });
    });
  });
}

/* ---------- 月結回饋 ---------- */

/**
 * 有回饋的自我監測比單純記錄有效（2024 統合分析，d=0.29），
 * 所以打完勾不能就沒了，要把累積講回來給你聽。
 */
function renderSummary() {
  const a = monthAnchor;
  const y = a.getFullYear(), m = a.getMonth();
  const inMonth = (ds) => { const d = parseYMD(ds); return d.getFullYear() === y && d.getMonth() === m; };

  const movedDays = new Set(log.filter((r) => r.category === 'move' && inMonth(r.done_on)).map((r) => r.done_on));
  const otherDays = new Set(log.filter((r) => r.category === 'other' && inMonth(r.done_on)).map((r) => r.done_on));

  // 上個月同樣的算法，拿來比較
  const pm = new Date(y, m - 1, 1);
  const inPrev = (ds) => { const d = parseYMD(ds); return d.getFullYear() === pm.getFullYear() && d.getMonth() === pm.getMonth(); };
  const prevMoved = new Set(log.filter((r) => r.category === 'move' && inPrev(r.done_on)).map((r) => r.done_on)).size;

  const n = movedDays.size;
  let line = '這個月動了 <b>' + n + '</b> 天';
  if (prevMoved > 0 || n > 0) {
    const diff = n - prevMoved;
    if (prevMoved === 0) line += '（上個月 0 天）';
    else if (diff > 0) line += '，比上個月多 <b>' + diff + '</b> 天';
    else if (diff < 0) line += '，比上個月少 ' + (-diff) + ' 天';
    else line += '，跟上個月一樣';
  }
  if (otherDays.size) line += '　·　其他項目 ' + otherDays.size + ' 天';

  $('h-summary').innerHTML = line;

  // 這個月各項目分別做了幾次
  const counts = {};
  log.filter((r) => inMonth(r.done_on)).forEach((r) => {
    counts[r.item_name || r.item_key] = (counts[r.item_name || r.item_key] || 0) + 1;
  });
  const keys = Object.keys(counts).sort((p, q) => counts[q] - counts[p]);
  $('h-breakdown').innerHTML = keys.length
    ? keys.map((k) => '<span class="tally">' + esc(k) + ' <b>' + counts[k] + '</b></span>').join('')
    : '';
}

/* ---------- 自訂項目 ---------- */

function wireCustom() {
  $('h-addbtn').addEventListener('click', () => {
    const box = $('h-addbox');
    box.hidden = !box.hidden;
    if (!box.hidden) $('h-newname').focus();
  });

  $('h-newsave').addEventListener('click', async () => {
    const name = $('h-newname').value.trim();
    if (!name) { $('h-newname').focus(); return; }
    const unit = $('h-newunit').value;
    const rawSug = $('h-newsug').value.trim();
    let suggested = rawSug === '' ? null : Number(rawSug);
    if (suggested != null && (!isFinite(suggested) || suggested <= 0)) suggested = null;
    // 時間一律存秒，但輸入時讓你填「分鐘」比較直覺
    if (suggested != null && unit === 'time') suggested = Math.round(suggested * 60);

    const category = $('h-newcat').value;
    const btn = $('h-newsave');
    btn.disabled = true;
    const id = await store.addItem({ name, unit, suggested, category, sort: custom.length });
    btn.disabled = false;
    if (!id) return;

    custom.push({ id, name, unit, suggested, category, sort: custom.length });
    $('h-newname').value = ''; $('h-newsug').value = '';
    $('h-addbox').hidden = true;
    renderToday(); renderManage();
  });

  $('h-newcancel').addEventListener('click', () => { $('h-addbox').hidden = true; });
}

function renderManage() {
  const host = $('h-manage');
  if (!custom.length) { host.innerHTML = ''; return; }
  host.innerHTML = '<div class="hint" style="margin-bottom:6px">我加的項目</div>'
    + custom.map((c) =>
      '<div class="mrow"><span class="nm">' + esc(c.name) + '</span>'
      + '<span class="meta">' + (c.category === 'move' ? '算進今天有動' : '只記錄')
      + ' · ' + (c.unit === 'reps' ? '次數' : '時間') + '</span>'
      + '<button class="del" data-del="' + esc(c.id) + '">刪除</button></div>').join('');

  host.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-del');
      const c = custom.filter((x) => String(x.id) === String(id))[0];
      if (!c) return;
      if (!confirm('刪掉「' + c.name + '」？\n\n已經記過的紀錄會留著，只是以後不會出現在清單裡。')) return;
      const ok = await store.archiveItem(id);
      if (!ok) return;
      custom = custom.filter((x) => String(x.id) !== String(id));
      renderToday(); renderManage();
    });
  });
}

/* ---------- 啟動 ---------- */

function wireChrome() {
  $('h-prev').addEventListener('click', () => {
    monthAnchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1);
    renderCalendar(); renderSummary();
  });
  $('h-next').addEventListener('click', () => {
    const n = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
    if (n > new Date()) return;
    monthAnchor = n; renderCalendar(); renderSummary();
  });
  $('h-backtoday').addEventListener('click', () => {
    viewDate = today();
    monthAnchor = new Date();
    openItem = null;
    renderToday(); renderCalendar(); renderSummary();
  });

  $('h-movegrid').addEventListener('click', onItemClick);
  $('h-othergrid').addEventListener('click', onItemClick);
}

function onItemClick(e) {
  const b = e.target.closest('[data-item]');
  if (!b) return;
  const k = b.getAttribute('data-item');
  openItem = (openItem === k) ? null : k;
  renderToday();
  if (openItem) $('h-picker').scrollIntoView({ block: 'nearest' });
}

export async function refreshHabits() {
  const since = ymd(new Date(Date.now() - 400 * 864e5));
  const res = await store.loadHabits(since);
  log = res.log.map((r) => Object.assign({}, r));
  custom = res.items.map((r) => Object.assign({}, r));
  renderToday(); renderCalendar(); renderSummary(); renderManage();
}

let wired = false;
export async function startHabits(errorHandler) {
  if (typeof errorHandler === 'function') onSyncError = errorHandler;
  viewDate = today();
  monthAnchor = new Date();
  if (!wired) { wireChrome(); wireCustom(); wired = true; }
  await refreshHabits();
}
