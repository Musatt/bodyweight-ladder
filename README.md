# 今天有動

每天記一下有沒有動。做任何一個項目的任何一下都算數。

**https://musatt.github.io/bodyweight-ladder/**

完整說明在 [教學.md](教學.md)。

## 兩個模式

| 模式 | 什麼時候用 | 在哪 |
|---|---|---|
| **今天有動**（主體） | 還在養成習慣的階段 | 打開就是它 |
| **完整訓練計畫**（收起來） | 已經穩定之後 | ☰ → 完整訓練計畫 |

完整訓練計畫是十條漸進階梯、四天輪替課表、升檔引擎。它的設計目標是
「幫一個**已經在練**的人安排進度」，不是「幫人開始」——那個門檻對還沒有
運動習慣的人太高，所以收起來了。兩套共用同一個帳號和資料庫。

## 四條設計規則

寫在這裡是因為它們不是風格偏好，是有來由的，改之前先看理由：

1. **只有一個目標：今天有沒有動。** 閱讀、冥想會被記錄但不算進去——
   不然可能連續三十天達標卻一次都沒動過。
2. **完全不顯示連續天數。** Silverman & Barasch（2023, *JCR*）：連續紀錄完好時
   66% 的人會繼續（中斷後只剩 58%），但**中斷的人更可能整個不再打開 App**。
   既然中斷的傷害大於順利時的幫助，那就不做。主角是日曆和月累積。
3. **份量是「建議」不是「規定」。** 按一下就算一次。多一個必填參數就是多一道摩擦。
4. **可以補記前幾天。** 同一份研究說「能補救」會削弱中斷的打擊。

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
├─ index.html              兩個模式的畫面骨架
├─ css/style.css           全部樣式，顏色／圓角／陰影變數在最上面
└─ js/
   ├─ main.js              進入點：登入，然後決定顯示哪個模式
   ├─ habits.js            ★ 每日記錄的內建項目清單。沒有程式邏輯
   ├─ habit-app.js         每日記錄的畫面與操作
   ├─ data.js              ★ 訓練內容：十條階梯、四天課表、熱身。沒有程式邏輯
   ├─ app.js               完整訓練計畫的畫面與操作（動態載入）
   ├─ figures.js           動作示範圖，自己畫的 SVG 火柴人
   ├─ store.js             登入、讀寫 Supabase、本機備份
   ├─ supabase-config.js   連線設定
   └─ vendor/supabase.js   Supabase 客戶端（收在專案裡，不靠 CDN）
```

改內容只要動 `habits.js` 和 `data.js`，不會影響任何功能——這是刻意切開的。
`app.js` 用動態 `import()` 載入，所以沒進去完整訓練計畫就不會下載那些程式。

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
