// ============================================================
//  汎用ユーティリティ
// ============================================================
export function getPR(workouts) {
  const map = {};
  workouts.forEach(w => { if (w.weight && (!map[w.exercise] || w.weight > map[w.exercise])) map[w.exercise] = w.weight; });
  return map;
}
export function getLastRecord(exercise, workouts) {
  const records = workouts.filter(w => w.exercise === exercise);
  return records.length > 0 ? records[0] : null;
}
export function getStreak(trainedDates, today) {
  let streak = 0, d = new Date(today);
  while (true) {
    const str = d.toISOString().slice(0,10);
    if (trainedDates.has(str)) { streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}
export function numInput(name, placeholder, value='', step=1, isK=true) {
  const pf = !isK ? 'pf' : '';
  return `
    <div class="num-input-wrap">
      <button type="button" class="num-btn minus" data-target="${name}">−</button>
      <input name="${name}" type="number" inputmode="numeric" pattern="[0-9]*"
        placeholder="${placeholder}" value="${value}" step="${step}" required class="${pf}">
      <button type="button" class="num-btn plus" data-target="${name}">＋</button>
    </div>`;
}
export function yen(n) { return Number(n||0).toLocaleString('ja-JP'); }
export function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── 共有の財布 計算ロジック ──
export function walletName(u) { return u==='kaito' ? 'かいと' : 'なな'; }

export function computeWallet(money) {
  const deposit = money.filter(m=>m.kind==='deposit').reduce((s,m)=>s+m.amount,0);
  const expense = money.filter(m=>m.kind==='wallet_expense').reduce((s,m)=>s+m.amount,0);
  return { balance: deposit - expense, deposit, expense };
}

// 正の値 = ななが かいとに支払う必要がある額（マイナスはその逆）
export function computeImbalance(money) {
  let net = 0; // +なら kaito の方が多く払っている（nana が kaito に払う）
  money.filter(m=>m.kind==='tatekae').forEach(m=>{
    net += (m.user==='kaito' ? 1 : -1) * (m.amount/2);
  });
  money.filter(m=>m.kind==='settle').forEach(m=>{
    // settle: user が払った人、payee が受け取った人
    if (m.user==='nana' && m.payee==='kaito') net -= m.amount;
    if (m.user==='kaito' && m.payee==='nana') net += m.amount;
  });
  return net;
}
