// ============================================================
//  LOGIN 画面
// ============================================================
export function loginHTML() {
  return `
    <div class="login-screen">
      <div class="blob blob-orange"></div>
      <div class="blob blob-purple"></div>
      <div class="blob blob-blue"></div>
      <div class="blob blob-pink"></div>
      <div class="login-box">
        <div class="app-title">WIKI</div>
        <div class="app-sub">OUR LIFE TOGETHER</div>
        <div class="status-badge connected">✅ Google スプレッドシート連携済み</div>
        <div class="user-grid">
          <button class="user-btn kaito" id="btn-kaito"><div class="user-avatar">🏋️</div><div>かいと</div></button>
          <button class="user-btn nana"  id="btn-nana"> <div class="user-avatar">💪</div><div>なな</div></button>
        </div>
        <div class="login-hint">ユーザーを選択してください</div>
      </div>
    </div>`;
}
