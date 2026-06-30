// ============================================================
//  SHOPS SECTION（おすすめのお店・共有）
// ============================================================
import { state } from './state.js';
import { SHOP_CATS } from './constants.js';
import { escapeHtml } from './utils.js';

export function shopsHTML(u, isK, ac) {
  return `
    <div class="hero ${u}">
      <div class="hero-tag">OUR FAVORITE PLACES</div>
      <h1>📍 Shops</h1>
      <div class="hero-sub">ふたりのおすすめ・行きたいお店リスト</div>
    </div>
    <div class="section">
      <div class="section-title" style="color:#0ea5e9;">➕ ADD SHOP</div>
      <form class="add-form" id="form-shop">
        <input name="name" placeholder="お店の名前" required class="${!isK?'pf':''}">
        <select name="category" required style="padding:12px;border:1px solid #d6eaf8;border-radius:14px;background:#eef7fd;color:#1e293b;font-size:14px;">
          ${SHOP_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        <input name="area" placeholder="エリア（任意）" class="${!isK?'pf':''}">
        <select name="rating" style="padding:12px;border:1px solid #d6eaf8;border-radius:14px;background:#eef7fd;color:#1e293b;font-size:14px;">
          <option value="5">★★★★★</option>
          <option value="4">★★★★☆</option>
          <option value="3" selected>★★★☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="1">★☆☆☆☆</option>
        </select>
        <input name="url" type="url" inputmode="url" placeholder="リンク（任意）" class="${!isK?'pf':''}">
        <input name="comment" placeholder="コメント（任意）" class="${!isK?'pf':''}" style="grid-column:1/-1;">
        <button type="submit" class="submit-btn ${ac}" style="grid-column:1/-1;">+ 追加</button>
      </form>
    </div>
    <div class="section">
      <div class="section-title" style="color:#0ea5e9;">🗺️ LIST (${state.shops.length})</div>
      ${state.shops.length===0?'<p class="empty">まだお店が登録されていません</p>':`
      <div class="shop-grid">
        ${state.shops.map(s=>`
          <div class="shop-card">
            <button class="del-icon-btn" style="position:absolute;top:12px;right:12px;" data-del-shop="${s.id}">✕</button>
            <div class="shop-name">${escapeHtml(s.name)}</div>
            <span class="shop-cat">${escapeHtml(s.category)}</span>
            ${s.area?`<div class="shop-area">📍 ${escapeHtml(s.area)}</div>`:''}
            <div class="shop-rating">${'★'.repeat(s.rating)}${'☆'.repeat(5-s.rating)}</div>
            ${s.comment?`<div class="shop-comment">${escapeHtml(s.comment)}</div>`:''}
            <div class="shop-foot">
              <span class="shop-by">by ${s.user==='kaito'?'かいと':'なな'}</span>
              ${s.url?`<a href="${s.url}" target="_blank" class="shop-link">開く</a>`:''}
            </div>
          </div>`).join('')}
      </div>`}
    </div>`;
}
