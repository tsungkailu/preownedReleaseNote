
/* ============================================================
   CARPLUS PREOWNED · 頁面存取驗證
   ============================================================ */
(function () {
  const PASS_HASH = '155c35cf79d52ffd513097165da01f3a35dde20b6b91c546b680c49f84090e92';
  const SESSION_KEY = 'carplus_preowned_auth';
  const ID_RE = /^(SJ\d{4}|QT\d{4}|K\d{4})$/i;
 
  /* ---- 已登入 → 直接放行 ---- */
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;
 
  /* ---- 遮罩 HTML ---- */
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.innerHTML = `
    <style>
      #auth-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: #f5f5f5;
        display: flex; align-items: center; justify-content: center;
        font-family: '微軟正黑體','Microsoft JhengHei',sans-serif;
      }
      #auth-box {
        background: white;
        border: 1px solid #e0e0e0;
        width: 360px;
        overflow: hidden;
      }
      #auth-header {
        background: #1A3C5E;
        color: white;
        padding: 20px 24px;
      }
      #auth-header .eyebrow {
        font-family: 'Times New Roman', serif;
        font-size: 11px;
        letter-spacing: 1px;
        opacity: .8;
      }
      #auth-header h2 {
        margin: 6px 0 0;
        font-size: 17px;
        font-weight: bold;
      }
      #auth-body {
        padding: 24px;
      }
      #auth-body label {
        display: block;
        font-size: 12.5px;
        color: #5A6B7A;
        margin-bottom: 5px;
        margin-top: 14px;
      }
      #auth-body label:first-child { margin-top: 0; }
      #auth-body input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d0d0d0;
        padding: 8px 10px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        border-radius: 2px;
      }
      #auth-body input:focus { border-color: #1A3C5E; }
#auth-error {
        display: none;
        font-size: 12.5px;
        color: #c0392b;
        margin-top: 10px;
      }
      #auth-btn {
        margin-top: 20px;
        width: 100%;
        padding: 10px;
        background: #1A3C5E;
        color: white;
        border: none;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        border-radius: 2px;
      }
      #auth-btn:hover { background: #4A7FA5; }
    </style>
    <div id="auth-box">
      <div id="auth-header">
        <div class="eyebrow">CARPLUS PREOWNED</div>
        <h2>請先登入以繼續</h2>
      </div>
      <div id="auth-body">
        <label for="auth-id">工號</label>
        <input id="auth-id" type="text" placeholder="" autocomplete="username" />
        <label for="auth-pw">密碼</label>
        <input id="auth-pw" type="password" autocomplete="current-password" />
        <div id="auth-error">工號格式錯誤或密碼不正確，請重新輸入。</div>
        <button id="auth-btn">登入</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
 
  /* ---- 驗證邏輯 ---- */
  async function sha256(str) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
 
  async function attempt() {
    const id = document.getElementById('auth-id').value.trim();
    const pw = document.getElementById('auth-pw').value;
    const err = document.getElementById('auth-error');
 
    if (!ID_RE.test(id)) {
      err.style.display = 'block';
      return;
    }
 
    const hash = await sha256(pw);
    if (hash !== PASS_HASH) {
      err.style.display = 'block';
      return;
    }
 
    /* 通過：記錄 session、移除遮罩 */
    sessionStorage.setItem(SESSION_KEY, '1');
    overlay.remove();
  }
 
  document.getElementById('auth-btn').addEventListener('click', attempt);
 
  /* Enter 鍵也能送出 */
  [document.getElementById('auth-id'), document.getElementById('auth-pw')]
    .forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); }));
})();
 