# E-learning 資料寫入用 Cloudflare Worker

用途：`elearning.html` 的新增／編輯／刪除功能透過這個 Worker 把 `episodes.json` 寫回
GitHub repo `tsungkailu/preownedReleaseNote`，讓所有人打開網頁時看到的都是最新資料。

## 部署步驟

1. 安裝 wrangler（若尚未安裝）並登入：
   ```bash
   cd worker
   npm install -g wrangler
   wrangler login
   ```

2. 到 GitHub 建立一個 **Fine-grained personal access token**：
   - Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Repository access：只選 `preownedReleaseNote` 這個 repo
   - Permissions：`Contents` 設為 `Read and write`，其餘不用給
   - 產生後複製 token（只會顯示一次）

3. 設定 Worker 密鑰（在自己的終端機執行，系統會用互動方式要求貼上值，不要透過自動化腳本輸入）：
   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put ADMIN_USER
   wrangler secret put ADMIN_PASS
   ```
   `ADMIN_USER` / `ADMIN_PASS` 建議填跟 `elearning.html` 裡寫死的一樣（`CARPLUS` / `12208883`），
   這樣前端登入用的帳密跟後端驗證的帳密才會一致。

4. 部署：
   ```bash
   wrangler deploy
   ```
   完成後會顯示網址，格式類似：
   `https://preowned-elearning-api.<你的-subdomain>.workers.dev`

5. 回到 `elearning.html`，把 `WORKER_API_URL` 改成上面網址加上 `/api/episodes`：
   ```js
   var WORKER_API_URL = 'https://preowned-elearning-api.<你的-subdomain>.workers.dev/api/episodes';
   ```

6. 確認 `wrangler.jsonc` 裡的 `ALLOWED_ORIGIN` 是 `https://tsungkailu.github.io`
   （目前已經設定好，若 GitHub Pages 網域不同要跟著改）。

7. 把 `episodes.json`、更新後的 `elearning.html`、以及這個 `worker/` 目錄一起 commit、push
   回 `preownedReleaseNote` repo。

## 之後如何修改資料結構

若要新增欄位，`worker/src/index.js` 的 `isValidEpisode()` 需要一併更新驗證規則，
`elearning.html` 的新增/編輯表單與 `render()` 也要同步調整。
