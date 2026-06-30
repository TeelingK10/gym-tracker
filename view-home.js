// ============================================================
//  HOME (WIKI TOP)
// ============================================================
import { state } from './state.js';
import { getPR, yen, escapeHtml, computeWallet } from './utils.js';

export function homeHTML() {
  const isK = state.user === 'kaito';
  const myW = state.workouts.filter(w=>w.user===state.user);
  const myPR = getPR(myW);
  const wallet = computeWallet(state.money);
  const recent = [...myW].sort((a,b)=>b.id-a.id).slice(0,5);

  return `
    <div class="wiki-hero">
      <div class="wiki-hero-tag">✨ FOR US, BY US ✨</div>
      <h1>かいと & なな WIKI</h1>
      <div class="wiki-hero-sub">ふたりの記録をひとつの場所に🎉</div>
    </div>
    <div class="feature-grid">
      <button class="feature-card ${isK?'fc-gym-k':'fc-gym-n'}" data-section="gym" data-gymuser="${state.user}">
        <div class="fc-bar"></div>
        <span class="fc-icon">${isK?'🏋️':'💪'}</span>
        <div class="fc-title">${isK?'かいとジム':'ななジム'}</div>
        <div class="fc-sub">${isK?'かいと':'なな'}の筋トレ記録</div>
        <div class="fc-stat ${isK?'orange':'purple'}">${myW.length}件 / ${Object.keys(myPR).length}種目</div>
      </button>
      <button class="feature-card fc-money" data-section="money">
        <div class="fc-bar"></div>
        <span class="fc-icon">💰</span>
        <div class="fc-title">共有の財布</div>
        <div class="fc-sub">財布残高＋立て替え精算</div>
        <div class="fc-stat">¥${yen(wallet.balance)} <span style="font-size:12px;color:#6b7280;">残高</span></div>
      </button>
      <button class="feature-card fc-shops" data-section="shops">
        <div class="fc-bar"></div>
        <span class="fc-icon">📍</span>
        <div class="fc-title">Shop</div>
        <div class="fc-sub">行きたい・行ったお店リスト</div>
        <div class="fc-stat">${state.shops.length}件 登録済み</div>
      </button>
    </div>
    <div class="section">
      <div class="section-title" style="color:#fbbf24;">🕐 最近の記録（${isK?'かいと':'なな'}）</div>
      ${recent.length===0 ? '<p class="empty">まだ記録がありません。</p>' : `
      <table class="pr-table">
        <thead><tr><th>種目</th><th>重量</th><th>日付</th></tr></thead>
        <tbody>
          ${recent.map(w=>`
            <tr><td>${escapeHtml(w.exercise)}</td>
            <td class="prw ${!isK?'purple':''}" style="font-size:16px;">${w.weight}kg</td>
            <td style="color:#6b7280;">${w.date||''}</td></tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}
