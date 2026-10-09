# 自重訓練階梯

居家自重訓練的紀錄工具。十條漸進階梯（推、拉、腿、核心四個方向）、四天輪替課表，
記錄每組次數，三組都達到目標時自動提示升到下一個更難的動作。

**https://musatt.github.io/bodyweight-ladder/**

完整說明在 [教學.md](教學.md)。

---

## 這是怎麼組起來的

| 部分 | 用什麼 |
|---|---|
| 網頁 | 純 HTML / CSS / JavaScript，沒有框架、沒有建置步驟 |
| 部署 | GitHub Pages（`.github/workflows/deploy.yml`，推上 main 就跑） |
| 資料庫 | Supabase（Postgres），結構在 [`supabase/schema.sql`](supabase/schema.sql) |
| 登入 | Google（Supabase Auth） |

`public/js/supabase-config.js` 裡的網址和金鑰是**公開金鑰**，不是密碼。
網頁必須帶著它才連得上資料庫，所以它本來就會被看到。
防護在資料庫那一端：三張表都開了 RLS（逐列安全規則），
只會回傳 `user_id` 等於登入者本人的那幾列。

## 檔案配置

```
public/
├─ index.html              畫面骨架與「守則」頁的靜態內容
├─ css/style.css           全部樣式，顏色變數在最上面
└─ js/
   ├─ data.js              ★ 訓練內容：十條階梯、四天課表、熱身。沒有程式邏輯
   ├─ app.js               畫面與操作邏輯
   ├─ store.js             登入、讀寫 Supabase、本機備份
   ├─ supabase-config.js   連線設定
   └─ vendor/supabase.js   Supabase 客戶端（收在專案裡，不靠 CDN）
```

改訓練內容只要動 `data.js`，不會影響任何功能——這是刻意切開的。

## 在本機跑

```bash
node tools/dev-server.mjs
```

然後打開 http://localhost:5178

本機預覽連的是**正式資料庫**，不是假資料。要能登入，
得先把 `http://localhost:5178` 加進 Supabase 的 Redirect URLs。

## 免責

內容依 r/bodyweightfitness Recommended Routine 的升級規則、
Start Bodyweight 的漸進階梯、Stuart McGill 的核心穩定三式整理。
作者不是醫療或專業體能人員；開始前請依自身狀況諮詢專業人員。
