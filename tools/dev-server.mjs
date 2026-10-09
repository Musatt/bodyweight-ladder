// ============================================================
//  本機測試用的小網頁伺服器
// ============================================================
//  為什麼需要它？
//  瀏覽器不允許用「檔案總管直接雙擊 html」的方式載入 JS 模組，
//  一定要透過 http:// 才行。這支程式就是把 public 資料夾變成一個網站。
//
//  執行：  node tools/dev-server.mjs
//  然後打開： http://localhost:5178
//
//  注意：Google 登入要能在本機用，必須先到 Supabase 後台的
//  Authentication → URL Configuration → Redirect URLs
//  把 http://localhost:5178 也加進去，不然會被擋。
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'public');
const PORT = 5178;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1><p>找不到 ' + rel + '</p>');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('\n  🪜 自重訓練階梯 — 本機測試伺服器已啟動\n');
  console.log(`  這台電腦：   http://localhost:${PORT}`);

  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  for (const ip of ips) {
    console.log(`  同 WiFi 手機： http://${ip}:${PORT}`);
  }
  console.log('\n  按 Ctrl+C 可以關掉伺服器\n');
});
