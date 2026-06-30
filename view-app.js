// ============================================================
//  APP SHELL（サイドバー + ページ切り替え）
// ============================================================
import { state } from './state.js';
import { homeHTML } from './view-home.js';
import { gymHTML } from './view-gym.js';
import { moneyHTML } from './view-money.js';
import { shopsHTML } from './view-shops.js';

export function appHTML() {
  const u   = state.user;
  const isK = u === 'kaito';
  const ac  = isK ? 'orange' : 'purple';

  const navItems = [
    ['home',  null, '🏠 ホーム'],
    ['gym',   u,    isK ? '🌊 かいとジム' : '🏝️ ななジム'],
    ['money', null, '💰 財布'],
    ['shops', null, '📍 Shop'],
  ];

  const sidebar = `
    <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
    <div class="overlay" id="overlay"></div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-user ${u}">
        <div class="av">${isK?'🏋️':'💪'}</div>
        <div><div class="uname">${isK?'かいと':'なな'}</div><div style="font-size:10px;color:#4b5563;">Member</div></div>
      </div>
      ${navItems.map(([p,gu,l]) => {
        const active = state.section===p;
        const activeColor = p==='gym' ? ac : (p==='money'?'green':p==='shops'?'blue':ac);
        return `<button class="nav-btn ${active?'active-'+activeColor:''}" data-section="${p}" ${gu?`data-gymuser="${gu}"`:''}>${l}</button>`;
      }).join('')}
      <button class="logout-btn" id="btn-logout">← ユーザー切替</button>
    </div>`;

  let body = '';
  if (state.section==='home') body = homeHTML();
  else if (state.section==='gym') body = gymHTML(u); // 自分のジムだけ閲覧可能
  else if (state.section==='money') body = moneyHTML(u, isK, ac);
  else body = shopsHTML(u, isK, ac);

  return `
    ${sidebar}
    <div class="app-layout">
      <div class="main">${body}</div>
    </div>`;
}
