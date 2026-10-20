// ============================================================
//  進入點：登入，然後決定要顯示哪一個畫面
// ============================================================
//  這個 App 有兩個模式：
//
//    每日記錄（主體）  打開就是它。目標只有一個：今天有沒有動
//    完整訓練計畫（收起來） 十條階梯、四天課表、升檔引擎。
//                         要從選單進去，而且是用動態 import 載入，
//                         沒進去就完全不會下載那些程式。
//
//  為什麼這樣分：那整套的設計目標是「幫一個已經在練的人安排進度」，
//  不是「幫人開始」。兩件事需要的東西剛好相反，混在同一個畫面
//  只會讓啟動成本變高。等每日記錄穩定了再進去用它。
// ============================================================

import * as store from './store.js';
import { startHabits, refreshHabits, openGuidePage, openWhyPage } from './habit-app.js';

let ladder = null;      // 動態載入的完整訓練計畫模組

/* ---------- 同步錯誤橫幅 ---------- */

let syncTimer = null;
function showSyncError(msg) {
  document.getElementById('syncmsg').textContent = msg;
  document.getElementById('syncbar').hidden = false;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { document.getElementById('syncbar').hidden = true; }, 12000);
}

/* ---------- 登入前的畫面 ---------- */

function showGate(msg, showButton, errText) {
  document.getElementById('shell').hidden = true;
  document.getElementById('gate').hidden = false;
  document.getElementById('gate-spin').hidden = !!showButton || !!errText;
  document.getElementById('gate-msg').textContent = msg || '';
  document.getElementById('gate-msg').hidden = !msg;
  document.getElementById('gate-btn').hidden = !showButton;
  document.getElementById('gate-why').hidden = !showButton;
  document.getElementById('gate-err').hidden = !errText;
  if (errText) document.getElementById('gate-err').textContent = errText;
}

/* ---------- 兩個模式之間切換 ---------- */

async function showLadder() {
  closeMenu();
  document.getElementById('habitview').hidden = true;
  document.getElementById('ladderview').hidden = false;
  window.scrollTo(0, 0);

  if (!ladder) {
    document.getElementById('ladder-loading').hidden = false;
    ladder = await import('./app.js');
    document.getElementById('ladder-loading').hidden = true;
  }
  await ladder.startLadder();
}

function showHabits() {
  closeMenu();
  document.getElementById('ladderview').hidden = true;
  document.getElementById('habitview').hidden = false;
  window.scrollTo(0, 0);
  refreshHabits();
}

/* ---------- 選單 ---------- */

function openMenu() { document.getElementById('menusheet').hidden = false; }
function closeMenu() { document.getElementById('menusheet').hidden = true; }

function wireChrome() {
  document.getElementById('menubtn').addEventListener('click', openMenu);
  document.getElementById('menuclose').addEventListener('click', closeMenu);
  document.getElementById('menusheet').addEventListener('click', (e) => {
    if (e.target.id === 'menusheet') closeMenu();
  });

  document.getElementById('m-ladder').addEventListener('click', showLadder);
  document.getElementById('backbtn').addEventListener('click', showHabits);
  document.getElementById('m-guide').addEventListener('click', () => { closeMenu(); openGuidePage(); });
  document.getElementById('m-why').addEventListener('click', () => { closeMenu(); openWhyPage(); });

  document.getElementById('m-export').addEventListener('click', async () => {
    closeMenu();
    await store.exportEverything();
  });

  document.getElementById('m-signout').addEventListener('click', () => {
    if (confirm('登出？資料都在雲端，下次登入同一個 Google 帳號就會回來。')) store.signOut();
  });
}

/* ---------- 啟動 ---------- */

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
    document.getElementById('gate-btn').addEventListener('click', async () => {
      document.getElementById('gate-btn').disabled = true;
      try {
        await store.signIn();
      } catch (e) {
        document.getElementById('gate-btn').disabled = false;
        showGate('', true, '登入失敗：' + (e.message || e));
      }
    });
    return;
  }

  document.getElementById('gate').hidden = true;
  document.getElementById('shell').hidden = false;
  document.getElementById('m-who').textContent = store.displayName();

  wireChrome();
  await startHabits();
}

// 切回這個分頁時重新讀一次，手機上記完回電腦就看得到
document.addEventListener('visibilitychange', () => {
  if (!document.getElementById('shell').hidden
      && document.getElementById('habitview').hidden === false
      && document.visibilityState === 'visible') refreshHabits();
});

boot();
