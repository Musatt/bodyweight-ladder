// ============================================================
//  資料層：登入 ＋ 讀寫 Supabase ＋ 本機備份
// ============================================================
//  app.js 只管畫面，所有「跟雲端講話」的事都在這個檔案。
//
//  三個設計重點：
//
//  1. 每次存檔都同時寫一份到瀏覽器的 localStorage。
//     網路斷掉或 Supabase 掛掉時，畫面還是看得到上次的資料，
//     不會變成一片空白讓你以為紀錄不見了。
//
//  2. 寫入失敗不會悄悄吞掉，會叫 app.js 把紅色橫幅亮起來，
//     上面有「再試一次」。沒有驗證過成功就不會假裝存好了。
//
//  3. 歷程是「一次訓練一列」，不是把整個陣列蓋回去。
//     這樣兩台裝置同一天各記一次不會互相洗掉。
// ============================================================

import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.js';
import { LADDERS } from './data.js';

const LS_MIRROR = 'bwl.mirror.v1';

let sb = null;        // Supabase 客戶端
let user = null;      // 登入中的使用者
let onError = () => {};

// ---------- 本機備份 ----------

function readMirror() {
  try {
    const raw = localStorage.getItem(LS_MIRROR);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeMirror(data) {
  try { localStorage.setItem(LS_MIRROR, JSON.stringify(data)); } catch { /* 無痕模式會丟錯，忽略 */ }
}

// ---------- 啟動與登入 ----------

/** 建立客戶端、處理 Google 導回來的網址、回報目前是誰 */
export async function init(errorHandler) {
  if (typeof errorHandler === 'function') onError = errorHandler;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase 程式庫沒有載入成功（js/vendor/supabase.js）');
  }

  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // Google 登入完會把參數掛在網址上，supabase-js 讀完之後我們把它擦掉，
  // 不然重新整理會看到一串 ?code=... 很醜，書籤也會存到過期的參數。
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;

  if (location.search.includes('code=') || location.hash.includes('access_token')) {
    history.replaceState(null, '', location.origin + location.pathname);
  }

  user = data.session ? data.session.user : null;
  return user;
}

/** 轉去 Google 登入。回來的網址就是現在這一頁 */
export async function signIn() {
  const redirectTo = location.origin + location.pathname;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  try { localStorage.removeItem(LS_MIRROR); } catch { /* 忽略 */ }
  await sb.auth.signOut();
  location.replace(location.origin + location.pathname);
}

export function currentUser() { return user; }

/** 顯示用的名字：優先用 Google 的名字，退而用 email */
export function displayName() {
  if (!user) return '';
  const m = user.user_metadata || {};
  return m.full_name || m.name || user.email || '已登入';
}

// ---------- 讀取 ----------

function defaultTiers() {
  const t = {};
  LADDERS.forEach((l) => { t[l.key] = l.start; });
  return t;
}

/**
 * 一次把三樣東西都讀回來。
 * 任何一樣失敗就整包回報失敗，並回傳本機備份（如果有），
 * 讓畫面至少還有東西可看。
 */
export async function loadAll() {
  const mirror = readMirror();

  try {
    const [stateRes, sessRes, draftRes] = await Promise.all([
      sb.from('ladder_state').select('tiers').eq('user_id', user.id).maybeSingle(),
      sb.from('workout_sessions')
        .select('id, trained_on, day_key, exercises, note')
        .eq('user_id', user.id)
        .order('trained_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(400),
      sb.from('workout_drafts').select('draft').eq('user_id', user.id).maybeSingle(),
    ]);

    if (stateRes.error) throw stateRes.error;
    if (sessRes.error) throw sessRes.error;
    if (draftRes.error) throw draftRes.error;

    const tiers = Object.assign(defaultTiers(), (stateRes.data && stateRes.data.tiers) || {});
    const sessions = (sessRes.data || []).map((r) => ({
      id: r.id, d: r.trained_on, k: r.day_key, ex: r.exercises || [], n: r.note || '',
    }));
    const draft = (draftRes.data && draftRes.data.draft) || null;

    writeMirror({ tiers, sessions, at: new Date().toISOString() });
    return { tiers, sessions, draft, offline: false };
  } catch (e) {
    onError('讀取雲端資料失敗：' + friendly(e));
    return {
      tiers: Object.assign(defaultTiers(), (mirror && mirror.tiers) || {}),
      sessions: (mirror && mirror.sessions) || [],
      draft: null,
      offline: true,
    };
  }
}

// ---------- 寫入 ----------

function mirrorPatch(patch) {
  const m = readMirror() || {};
  writeMirror(Object.assign(m, patch, { at: new Date().toISOString() }));
}

export async function saveTiers(tiers) {
  mirrorPatch({ tiers });
  const { error } = await sb.from('ladder_state').upsert({
    user_id: user.id, tiers, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) { onError('檔位沒有存上雲端：' + friendly(error)); return false; }
  return true;
}

/** 新增一次訓練。成功的話回傳資料庫產生的 id */
export async function addSession(entry) {
  const { data, error } = await sb.from('workout_sessions').insert({
    user_id: user.id,
    trained_on: entry.d,
    day_key: entry.k,
    exercises: entry.ex,
    note: entry.n || '',
  }).select('id').single();

  if (error) { onError('這次訓練沒有存上雲端：' + friendly(error)); return null; }
  return data.id;
}

export async function deleteSession(id) {
  const { error } = await sb.from('workout_sessions').delete().eq('id', id).eq('user_id', user.id);
  if (error) { onError('刪除失敗：' + friendly(error)); return false; }
  return true;
}

/** 草稿存檔。會被 app.js 用 debounce 包起來，不會每按一下就打一次網路 */
export async function saveDraft(draft) {
  const { error } = await sb.from('workout_drafts').upsert({
    user_id: user.id, draft, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  return !error;   // 草稿存不上去不值得用紅色橫幅打擾，按儲存時才是關鍵
}

export async function clearDraft() {
  await sb.from('workout_drafts').delete().eq('user_id', user.id);
}

// ---------- 匯出備份 ----------

/** 把所有紀錄下載成一個 JSON 檔。雲端出事時這是唯一的救命繩 */
export function exportBackup(tiers, sessions) {
  const payload = {
    匯出時間: new Date().toISOString(),
    說明: '自重訓練階梯的完整備份。tiers 是十條階梯目前的檔位，sessions 是每一次訓練。',
    tiers,
    sessions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '自重訓練備份-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- 錯誤訊息翻譯 ----------

function friendly(e) {
  const msg = (e && (e.message || e.error_description)) || String(e);
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return '連不上網路';
  if (/JWT|token|expired/i.test(msg)) return '登入過期了，請重新登入';
  if (/row-level security|permission/i.test(msg)) return '權限不足（安全規則擋下來了）';
  return msg;
}
