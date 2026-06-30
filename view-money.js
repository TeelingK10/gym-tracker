// ============================================================
//  MONEY SECTION（共有の財布・立て替え精算）
// ============================================================
import { state } from './state.js';
import { WALLET_CATS } from './constants.js';
import { yen, escapeHtml, numInput, walletName, computeWallet, computeImbalance } from './utils.js';

export function moneyHTML(u, isK, ac) {
  const wallet = computeWallet(state.money);
  const imbalance = computeImbalance(state.money);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthMoney = state.money.filter(m => (m.date||'').startsWith(thisMonth));
  const monthDeposit = monthMoney.filter(m=>m.kind==='deposit').reduce((s,m)=>s+m.amount,0);
  const monthExpense = monthMoney.filter(m=>m.kind==='wallet_expense').reduce((s,m)=>s+m.amount,0);
  const today = new Date().toISOString().slice(0,10);

  const owerUser  = imbalance > 0 ? 'nana' : 'kaito';
  const owedUser  = imbalance > 0 ? 'kaito' : 'nana';
  const owedAmount = Math.abs(Math.round(imbalance));

  const all = [...state.money].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id);

  const kindLabel = { deposit:'💵 入金', wallet_expense:'💸 財布支出', tatekae:'🤝 立て替え', settle:'✅ 精算' };
  const kindColor = { deposit:'money-stat-income', wallet_expense:'money-stat-expense', tatekae:'', settle:'' };

  return `
    <div class="hero ${u}">
      <div class="hero-tag">SHARED WALLET</div>
      <h1>💰 共有の財布</h1>
      <div class="hero-sub">ふたりのお財布＋立て替え精算（共有データ）</div>
    </div>

    <div class="wallet-balance-card">
      <div class="wallet-balance-label">財布の残高</div>
      <div class="wallet-balance-val">¥${yen(wallet.balance)}</div>
    </div>

    <div class="cards-grid">
      <div class="stat-card"><div class="stat-label">今月の入金</div><div class="stat-val money-stat-income">¥${yen(monthDeposit)}</div></div>
      <div class="stat-card"><div class="stat-label">今月の財布支出</div><div class="stat-val money-stat-expense">¥${yen(monthExpense)}</div></div>
    </div>

    <div class="settle-card ${owedAmount===0?'settle-zero':''}">
      ${owedAmount===0
        ? `<div class="settle-zero-text">🎉 立て替えの貸し借りはぴったりです！</div>`
        : `<div class="settle-text"><span class="money-who ${owerUser}">${walletName(owerUser)}</span> が <span class="money-who ${owedUser}">${walletName(owedUser)}</span> に <strong>¥${yen(owedAmount)}</strong> 払う番です</div>
           <button class="submit-btn ${ac}" id="btn-settle" data-ower="${owerUser}" data-owed="${owedUser}" data-amount="${owedAmount}">精算する（払った）</button>`}
    </div>

    <div class="section">
      <div class="section-title" style="color:#16a34a;">➕ 記録を追加</div>
      <form class="add-form" id="form-money">
        <div class="type-toggle kind-toggle">
          <label class="kind-deposit-label"><input type="radio" name="kind" value="deposit" checked><span>💵 財布に入金</span></label>
          <label class="kind-expense-label"><input type="radio" name="kind" value="wallet_expense"><span>💸 財布から支出</span></label>
          <label class="kind-tatekae-label"><input type="radio" name="kind" value="tatekae"><span>🤝 立て替え</span></label>
        </div>
        <select name="category" class="money-cat-select" style="padding:12px;border:1px solid #d6eaf8;border-radius:14px;background:#eef7fd;color:#1e293b;font-size:14px;">
          ${WALLET_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        ${numInput('amount','金額 ¥','',100,isK)}
        <input name="memo" placeholder="メモ（任意）" class="${!isK?'pf':''}">
        <input name="date" type="date" value="${today}" required class="${!isK?'pf':''}">
        <button type="submit" class="submit-btn ${ac}">+ 追加</button>
      </form>
      <p class="money-hint">「財布に入金」「財布から支出」は共有財布の残高に反映されます。「立て替え」は個人のお金で支払った分を記録し、2人で割り勘（折半）して精算額を計算します。</p>
    </div>

    <div class="section">
      <div class="section-title" style="color:#16a34a;">📋 履歴</div>
      ${all.length===0?'<p class="empty">まだ記録がありません</p>':`
      <table class="money-table">
        <thead><tr><th>日付</th><th>区分</th><th>メモ</th><th>金額</th><th></th></tr></thead>
        <tbody>
          ${all.map(m=>`
            <tr>
              <td style="color:#5b7a99;">${m.date||''}<br><span class="money-who ${m.user}">${walletName(m.user)}</span>${m.kind==='settle'?` → <span class="money-who ${m.payee}">${walletName(m.payee)}</span>`:''}</td>
              <td><span class="money-cat-pill">${kindLabel[m.kind]||m.kind}</span>${m.category?` <span class="money-cat-pill">${escapeHtml(m.category)}</span>`:''}</td>
              <td style="color:#5b7a99;">${escapeHtml(m.memo)}</td>
              <td class="money-amount ${kindColor[m.kind]}">¥${yen(m.amount)}</td>
              <td><button class="del-icon-btn" data-del-money="${m.id}">✕</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}
