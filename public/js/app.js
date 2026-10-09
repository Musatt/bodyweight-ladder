// ============================================================
//  畫面與操作邏輯
// ============================================================
//  這個檔案只管「畫出來」和「按下去會怎樣」。
//  所有跟雲端講話的事都丟給 store.js，所有內容都放在 data.js。
//
//  升級引擎的規則（整份計劃只靠這一條）：
//    三組都達到目標次數 → 跳出升檔按鈕 → 升上去之後清空該動作的格子
//  判斷達標的程式在 renderExercises() 裡的 hit / canUp 兩行。
// ============================================================

import { PYR, LADDERS, DAYS, DAYORDER, GROUPS, WARMUP, L } from './data.js';
import * as store from './store.js';

/* ================= 狀態 ================= */

let tiers = {};
let sessions = [];
let draft = null;
let openPick = null;      // {key, i} 目前展開的是哪一格
let booted = false;

/* ================= 小工具 ================= */

function ymd(dd) {
  return dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
}
function today() { return ymd(new Date()); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function $(id) { return document.getElementById(id); }

function tierIdx(key, item) {
  const l = L[key];
  let i = tiers[key];
  if (typeof i !== 'number' || i < 0 || i >= l.tiers.length) i = l.start;
  if (item) {
    if (typeof item.cap === 'number' && i > item.cap) i = item.cap;
    if (typeof item.floor === 'number' && i < item.floor) i = item.floor;
  }
  return i;
}

/** 這個動作每一組的目標數字，回傳一個陣列 */
function targets(t, sets) {
  if (t.pyr) return PYR.slice();
  const n = sets || 3;
  const a = [];
  for (let i = 0; i < n; i++) a.push(t.v);
  return a;
}
function unitOf(t) { return t.pyr ? '組' : (t.u === 'sec' ? '秒' : '下'); }
function fmtTarget(t, sets) {
  const sd = t.side ? '／邊' : '';
  if (t.pyr) return '5+3+1 × 10秒' + sd;
  if (t.u === 'sec') return (sets || 3) + '×' + t.v + '秒';
  return (sets || 3) + '×' + t.v + sd;
}
function chipVals(t, tv) {
  const out = [];
  if (t.pyr) { for (let i = 1; i <= 8; i++) out.push(i); return out; }
  if (t.u === 'sec') {
    for (let i = -3; i <= 4; i++) { const s = tv + i * 5; if (s >= 5) out.push(s); }
    return out;
  }
  for (let i = Math.max(0, tv - 4); i <= tv + 4; i++) out.push(i);
  return out;
}

/* ================= 同步狀態橫幅 ================= */

let syncTimer = null;
function showSyncError(msg) {
  $('syncmsg').textContent = msg;
  $('syncbar').hidden = false;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { $('syncbar').hidden = true; }, 12000);
}

/* ================= 草稿 ================= */

function nextDay() {
  if (!sessions.length) return 'A';
  const last = sessions.slice().sort((a, b) => (a.d < b.d ? 1 : -1))[0];
  const p = DAYORDER.indexOf(last.k);
  return DAYORDER[(p + 1) % 4];
}
function freshDraft(k) { return { d: today(), k: k || nextDay(), ex: {} }; }

let draftTimer = null;
function saveDraftSoon() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    store.saveDraft({ d: draft.d, k: draft.k, ex: draft.ex, n: $('lg-note').value });
  }, 800);
}

/* ================= 訓練頁 ================= */

function renderDayPills() {
  let h = '';
  DAYORDER.forEach((k) => {
    h += '<button class="pill" data-d="' + k + '" aria-pressed="' + (draft.k === k) + '">'
      + 'DAY ' + k + '<small>' + esc(DAYS[k].nm.replace(' · ', '·')) + '</small></button>';
  });
  const el = $('daypills');
  el.innerHTML = h;
  el.querySelectorAll('.pill').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.getAttribute('data-d');
      if (k === draft.k) return;
      draft.k = k; draft.ex = {}; openPick = null;
      renderDayPills(); renderExercises(); saveDraftSoon();
    });
  });
  $('rot-hint').textContent = sessions.length ? ('輪替下一天：DAY ' + nextDay()) : '從 DAY A 開始';
}

function renderExercises() {
  const day = DAYS[draft.k];
  let h = '';

  day.items.forEach((it) => {
    const l = L[it.k];
    const ti = tierIdx(it.k, it);
    const t = l.tiers[ti];
    const sets = t.pyr ? 3 : (it.s || 3);
    const tv = targets(t, sets);
    const got = draft.ex[it.k] || [];

    const full = got.length >= sets && got.slice(0, sets).every((x) => typeof x === 'number');
    const hit = full && tv.every((v, i) => got[i] >= v);
    const canUp = hit && ti < l.tiers.length - 1;

    h += '<div class="ex' + (full ? ' filled' : '') + '" data-ex="' + it.k + '">'
      + '<div class="ex-h"><div><span class="dir">' + esc(l.dir) + '</span>'
      + '<span class="nm"><span class="tc">' + esc(t.c) + '</span>' + esc(t.n) + '</span></div>'
      + '<span class="tgt">目標 ' + esc(fmtTarget(t, sets)) + '</span></div>'
      + '<div class="slots">';

    const n = Math.max(sets, got.length);
    for (let i = 0; i < n; i++) {
      const v = got[i];
      const lab = t.pyr ? ('第' + (i + 1) + '輪') : ('組 ' + (i + 1));
      h += '<button class="slot" data-k="' + it.k + '" data-i="' + i + '"'
        + (typeof v === 'number' ? ' data-set="1"' : '')
        + ' aria-expanded="' + (openPick && openPick.key === it.k && openPick.i === i) + '">'
        + '<span class="k">' + lab + '</span>'
        + '<span class="v">' + (typeof v === 'number' ? v : '—') + '</span></button>';
    }
    h += '<button class="slot add" data-k="' + it.k + '" data-add="1" title="加一組">＋</button></div>';

    if (openPick && openPick.key === it.k) {
      const pi = openPick.i;
      const ptv = tv[pi] !== undefined ? tv[pi] : tv[tv.length - 1];
      const cur = typeof got[pi] === 'number' ? got[pi] : ptv;
      h += '<div class="picker"><div class="lb">'
        + (t.pyr ? ('第 ' + (pi + 1) + ' 輪 · 做幾組 10 秒（目標 ' + ptv + ' 組）')
          : ('第 ' + (pi + 1) + ' 組 · 做了幾' + unitOf(t) + '（目標 ' + ptv + unitOf(t) + '）'))
        + (t.side ? ' · 每邊' : '') + '</div><div class="chips">';
      chipVals(t, ptv).forEach((cv) => {
        h += '<button class="chip' + (cv === ptv ? ' tg' : '') + '" data-pick="' + cv + '">' + cv + '</button>';
      });
      h += '</div><div class="step"><button data-nudge="-1">−</button>'
        + '<span class="val" id="stepval">' + cur + '</span>'
        + '<button data-nudge="1">＋</button>'
        + '<button class="ok" data-pick="' + cur + '" id="stepok">確定</button></div></div>';
    }

    h += '<div class="grad"' + (canUp ? '' : ' hidden') + '>'
      + '三組都達標了　→　升到 ' + (canUp ? esc(l.tiers[ti + 1].c + ' ' + l.tiers[ti + 1].n) : '')
      + '<button data-up="' + it.k + '">升檔</button></div>';

    h += '<p class="cue">' + esc(t.q) + '</p></div>';
  });

  const host = $('exlist');
  host.innerHTML = h;

  host.querySelectorAll('.slot').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.getAttribute('data-k');
      if (b.getAttribute('data-add')) {
        const arr = draft.ex[k] || (draft.ex[k] = []);
        const it2 = DAYS[draft.k].items.filter((x) => x.k === k)[0];
        const t2 = L[k].tiers[tierIdx(k, it2)];
        const base = t2.pyr ? 3 : (it2.s || 3);
        openPick = { key: k, i: Math.max(base, arr.length) };
        renderExercises();
        return;
      }
      const i = parseInt(b.getAttribute('data-i'), 10);
      openPick = (openPick && openPick.key === k && openPick.i === i) ? null : { key: k, i };
      renderExercises();
    });
  });

  host.querySelectorAll('[data-pick]').forEach((b) => {
    b.addEventListener('click', () => {
      if (!openPick) return;
      const v = parseInt(b.getAttribute('data-pick'), 10);
      const arr = draft.ex[openPick.key] || (draft.ex[openPick.key] = []);
      while (arr.length < openPick.i) arr.push(null);
      arr[openPick.i] = v;

      // 填完一組就自動跳到下一組，不用再點一次
      const k = openPick.key;
      const it3 = DAYS[draft.k].items.filter((x) => x.k === k)[0];
      const t3 = L[k].tiers[tierIdx(k, it3)];
      const need = t3.pyr ? 3 : (it3.s || 3);
      const nxt = openPick.i + 1;
      openPick = (nxt < need && typeof arr[nxt] !== 'number') ? { key: k, i: nxt } : null;

      renderExercises(); saveDraftSoon();
    });
  });

  host.querySelectorAll('[data-nudge]').forEach((b) => {
    b.addEventListener('click', () => {
      const el = $('stepval');
      const ok = $('stepok');
      if (!el || !ok) return;
      let v = parseInt(el.textContent, 10) + parseInt(b.getAttribute('data-nudge'), 10);
      if (v < 0) v = 0;
      el.textContent = v;
      ok.setAttribute('data-pick', v);
    });
  });

  host.querySelectorAll('[data-up]').forEach((b) => {
    b.addEventListener('click', async () => {
      const k = b.getAttribute('data-up');
      tiers[k] = Math.min(tiers[k] + 1, L[k].tiers.length - 1);
      draft.ex[k] = [];
      openPick = null;
      renderExercises(); paintTiers(); buildWeek(); saveDraftSoon();
      await store.saveTiers(tiers);
    });
  });
}

/* ================= 檔位頁 ================= */

function buildLadders() {
  Object.keys(GROUPS).forEach((g) => {
    const host = $(GROUPS[g][0]);
    let h = '<div class="hint" style="margin-top:6px">' + GROUPS[g][1] + '</div>';
    LADDERS.filter((l) => l.g === g).forEach((l) => {
      h += '<div class="card"><div class="ladder-h"><span class="t">' + esc(l.title) + '</span>'
        + '<span class="s">' + esc(l.sub) + '</span>'
        + '<span class="pos" data-pos="' + l.key + '"></span></div>';
      l.tiers.forEach((t, i) => {
        h += '<button type="button" class="tier" data-tk="' + l.key + '" data-ti="' + i + '">'
          + '<span class="code">' + esc(t.c) + '</span>'
          + '<span class="nm">' + esc(t.n) + '<span class="tq">' + esc(t.q) + '</span></span>'
          + '<span class="tg">' + esc(fmtTarget(t, 3)) + '</span></button>';
      });
      h += '<div class="foot">' + esc(l.foot) + '</div></div>';
    });
    host.innerHTML = h;
  });

  document.querySelectorAll('.tier').forEach((b) => {
    b.addEventListener('click', async () => {
      const k = b.getAttribute('data-tk');
      tiers[k] = parseInt(b.getAttribute('data-ti'), 10);
      if (draft && draft.ex[k]) draft.ex[k] = [];
      paintTiers(); renderExercises(); buildWeek(); saveDraftSoon();
      await store.saveTiers(tiers);
    });
  });
}

function paintTiers() {
  LADDERS.forEach((l) => {
    const cur = tierIdx(l.key);
    document.querySelectorAll('[data-tk="' + l.key + '"]').forEach((b) => {
      const i = parseInt(b.getAttribute('data-ti'), 10);
      b.setAttribute('data-state', i < cur ? 'done' : (i === cur ? 'now' : 'next'));
      b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
    });
    const p = document.querySelector('[data-pos="' + l.key + '"]');
    if (p) p.textContent = l.tiers[cur].c + ' / ' + l.tiers[l.tiers.length - 1].c;
  });
}

/* ================= 課表頁 ================= */

function buildWeek() {
  let h = '';
  DAYORDER.forEach((k) => {
    const d = DAYS[k];
    h += '<div class="card day"><div class="day-h"><span class="tag">DAY ' + k + '</span>'
      + '<span class="nm">' + esc(d.nm) + '</span><span class="du">' + esc(d.du) + '</span></div><ol>';
    d.items.forEach((it, i) => {
      const l = L[it.k];
      const t = l.tiers[tierIdx(it.k, it)];
      const sets = t.pyr ? 3 : (it.s || 3);
      h += '<li><span class="idx">' + (i + 1) + '</span><span><b>' + esc(l.dir) + '</b> — '
        + esc(t.c + ' ' + t.n) + '<em>' + esc(fmtTarget(t, sets)) + '</em></span></li>';
    });
    h += '</ol></div>';
  });
  $('weekcards').innerHTML = h;
}

function buildWarmup() {
  $('warmup').innerHTML = WARMUP.map(([move, why]) =>
    '<li><b>' + esc(move) + '</b>' + (why ? ' — ' + esc(why) : '') + '</li>').join('');
}

/* ================= 歷程頁 ================= */

function renderHist() {
  const host = $('histlist');
  if (!sessions.length) {
    host.innerHTML = '<div class="empty">還沒有紀錄。第一次練完，在「訓練」頁按儲存就會出現在這裡。</div>';
    return;
  }

  const s = sessions.slice().sort((a, b) => (a.d < b.d ? 1 : (a.d > b.d ? -1 : 0)));
  host.innerHTML = s.slice(0, 60).map((e) => {
    let body = '';
    if (e.ex && e.ex.length) {
      body = e.ex.map((x) => {
        const l = L[x.key];
        if (!l) return '';
        const t = l.tiers[x.ti] || l.tiers[0];
        return '<div class="e"><b>' + esc(t.c + ' ' + t.n) + '</b>'
          + '<span class="sets">' + x.sets.filter((v) => typeof v === 'number').join(' / ') + '</span></div>';
      }).join('');
    }
    return '<div class="hrow"><div class="top"><span class="dy">DAY ' + esc(e.k) + '</span>'
      + '<span class="dt">' + esc(e.d) + '</span>'
      + '<button class="rm" data-rm="' + esc(e.id) + '" aria-label="刪除">×</button></div>'
      + (body ? '<div class="body">' + body + '</div>' : '')
      + (e.n ? '<div class="nt">' + esc(e.n) + '</div>' : '') + '</div>';
  }).join('');

  host.querySelectorAll('[data-rm]').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.getAttribute('data-rm');
      const row = sessions.filter((x) => x.id === id)[0];
      if (!row) return;
      if (!confirm('刪掉 ' + row.d + ' 的 DAY ' + row.k + '？這個動作不能復原。')) return;

      const ok = await store.deleteSession(id);
      if (!ok) return;                       // 失敗就什麼都不動，橫幅會說原因
      sessions = sessions.filter((x) => x.id !== id);
      renderHist(); paintWeekChip(); renderDayPills();
    });
  });
}

function paintWeekChip() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;       // 讓星期一當一週的開始
  const mon = ymd(new Date(now.getTime() - dow * 864e5));
  const n = sessions.filter((e) => e.d >= mon).length;
  $('wkchip').textContent = '本週 ' + n + ' / 4';
}

/* ================= 頁籤 ================= */

const PANELS = { log: 'p-log', hist: 'p-hist', tier: 'p-tier', week: 'p-week', rule: 'p-rule' };

function wireTabs() {
  const tabs = $('tabs');
  tabs.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      const t = b.getAttribute('data-t');
      tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
      Object.keys(PANELS).forEach((k) => { $(PANELS[k]).hidden = (k !== t); });
      if (t === 'week') buildWeek();
      window.scrollTo(0, 0);
    });
  });
}

/* ================= 儲存與清空 ================= */

function wireLogActions() {
  $('lg-date').addEventListener('change', (e) => {
    draft.d = e.target.value || today();
    saveDraftSoon();
  });
  $('lg-note').addEventListener('input', saveDraftSoon);

  $('lg-save').addEventListener('click', async () => {
    const ex = [];
    DAYS[draft.k].items.forEach((it) => {
      const got = (draft.ex[it.k] || []).filter((v) => typeof v === 'number');
      if (got.length) ex.push({ key: it.k, ti: tierIdx(it.k, it), sets: got });
    });
    if (!ex.length) return;

    const btn = $('lg-save');
    btn.disabled = true;
    btn.textContent = '正在存…';

    const entry = { d: draft.d || today(), k: draft.k, ex, n: $('lg-note').value.trim() };
    const id = await store.addSession(entry);

    btn.disabled = false;
    btn.textContent = '儲存本次訓練';

    if (!id) return;                          // 沒存上去就不清空，紀錄還留在畫面上可以再試

    sessions.push(Object.assign({ id }, entry));
    $('lg-note').value = '';
    const sv = $('lg-saved');
    sv.hidden = false;
    setTimeout(() => { sv.hidden = true; }, 2600);

    draft = freshDraft();
    openPick = null;
    $('lg-date').value = draft.d;
    renderDayPills(); renderExercises(); renderHist(); paintWeekChip();
    store.clearDraft();
  });

  $('lg-clear').addEventListener('click', () => {
    draft.ex = {}; openPick = null;
    $('lg-note').value = '';
    renderExercises(); saveDraftSoon();
  });

  $('h-export').addEventListener('click', () => store.exportBackup(tiers, sessions));

  $('syncretry').addEventListener('click', () => { $('syncbar').hidden = true; refresh(); });

  $('whobtn').addEventListener('click', () => {
    if (confirm('登出？資料都在雲端，下次登入同一個 Google 帳號就會回來。')) store.signOut();
  });
}

/* ================= 讀取與重新整理 ================= */

async function refresh() {
  const res = await store.loadAll();
  tiers = res.tiers;
  sessions = res.sessions;

  // 手上這次有沒有動過？有動過就一個字都不要碰，免得蓋掉正在填的東西。
  const untouched = !draft || (!Object.keys(draft.ex).length && !$('lg-note').value);

  if (untouched) {
    if (res.draft && res.draft.k && DAYS[res.draft.k] && res.draft.ex && Object.keys(res.draft.ex).length) {
      // 雲端有填到一半的草稿，接回來
      draft = { d: res.draft.d || today(), k: res.draft.k, ex: res.draft.ex };
      if (res.draft.n) $('lg-note').value = res.draft.n;
    } else {
      // 沒有草稿：等歷程讀回來之後才知道上次練到哪一天，現在重算一次。
      // 少了這步，第一次載入會固定停在 DAY A，跟上面的「輪替下一天」對不起來。
      draft = freshDraft();
    }
  }

  $('lg-date').value = draft.d;
  paintTiers(); renderDayPills(); renderExercises();
  renderHist(); paintWeekChip(); buildWeek();
}

/* ================= 啟動 ================= */

function showGate(msg, showButton, errText) {
  $('app').hidden = true;
  $('gate').hidden = false;
  $('gate-spin').hidden = !!showButton || !!errText;
  $('gate-msg').textContent = msg || '';
  $('gate-msg').hidden = !msg;
  $('gate-btn').hidden = !showButton;
  $('gate-why').hidden = !showButton;
  $('gate-err').hidden = !errText;
  if (errText) $('gate-err').textContent = errText;
}

async function boot() {
  let signedIn = null;
  try {
    signedIn = await store.init(showSyncError);
  } catch (e) {
    showGate('', false, '啟動失敗：' + (e.message || e)
      + '\n\n如果是剛部署上線，先確認 Supabase 的「Site URL」已經填成這一頁的網址。');
    return;
  }

  if (!signedIn) {
    showGate('把紀錄存在雲端，換手機、換電腦都看得到。', true, null);
    $('gate-btn').addEventListener('click', async () => {
      $('gate-btn').disabled = true;
      try {
        await store.signIn();
      } catch (e) {
        $('gate-btn').disabled = false;
        showGate('', true, '登入失敗：' + (e.message || e));
      }
    });
    return;
  }

  // 登入成功，把本體放出來
  $('gate').hidden = true;
  $('app').hidden = false;
  $('whobtn').textContent = store.displayName();

  draft = freshDraft();
  buildLadders(); buildWarmup(); wireTabs(); wireLogActions();
  await refresh();
  booted = true;
}

// 切回這個分頁時重新讀一次，這樣手機上記完、回到電腦就看得到
document.addEventListener('visibilitychange', () => {
  if (booted && document.visibilityState === 'visible') refresh();
});

boot();
