// ============================================================
//  二人のWIKI — Google Apps Script版
//  Gym Tracker / Money（家計簿）/ Shops（おすすめのお店）
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyQkv4WQXsrVHVHwA_p2p7_HxtFd_WUNClF3nP0Ocp5ccToMqBm8NxpAdz8rx8BAIYA/exec';

const state = {
  user:        null,
  section:     'home',   // home | gym | money | shops
  gymPage:     'log',    // log | calendar | pr | menu
  workouts:    [],
  menus:       [],
  money:       [],
  shops:       [],
  activeDay:   todayIndex(),
  selectedEx:  null,
  calYear:     new Date().getFullYear(),
  calMonth:    new Date().getMonth(),
  calSelected: null,
  moneyMonth:  new Date().toISOString().slice(0,7), // 'YYYY-MM'
};

const DAY_NAMES   = ['月','火','水','木','金','土','日'];
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const MONEY_CATS_EXPENSE = ['食費','デート','交通','日用品','娯楽','住居','その他'];
const MONEY_CATS_INCOME  = ['給料','お小遣い','その他'];
const SHOP_CATS = ['ごはん','カフェ','デート','旅行','買い物','その他'];

function todayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// ============================================================
//  GAS API
// ============================================================
async function gasGet(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);
  return res.json();
}
async function gasPost(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { method: 'POST' });
  return res.json();
}

async function loadWorkouts(user) {
  const res = await gasGet({ action: 'getWorkouts', user });
  if (!res.ok) return state.workouts;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, exercise: r.exercise,
    weight: parseFloat(r.weight), reps: parseInt(r.reps),
    sets: parseInt(r.sets), date: r.date,
  })).sort((a,b) => b.id - a.id);
}
async function saveWorkout(user, data) { await gasPost({ action: 'addWorkout', data: JSON.stringify({ user, ...data }) }); }
async function removeWorkout(id) { await gasPost({ action: 'deleteWorkout', id }); }

async function loadMenus(user) {
  const res = await gasGet({ action: 'getMenus', user });
  if (!res.ok) return state.menus;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, day: parseInt(r.day),
    order: parseInt(r.order), exercise: r.exercise,
    target_sets: parseInt(r.target_sets), target_reps: parseInt(r.target_reps),
    video_url: r.video_url || '',
  }));
}
async function saveMenu(user, data) { await gasPost({ action: 'addMenu', data: JSON.stringify({ user, ...data }) }); }
async function removeMenu(id) { await gasPost({ action: 'deleteMenu', id }); }

async function loadMoney() {
  const res = await gasGet({ action: 'getMoney' });
  if (!res.ok) return state.money;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, type: r.type, category: r.category,
    amount: parseFloat(r.amount) || 0, memo: r.memo || '', date: r.date,
  })).sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.id - a.id);
}
async function saveMoney(user, data) { await gasPost({ action: 'addMoney', data: JSON.stringify({ user, ...data }) }); }
async function removeMoney(id) { await gasPost({ action: 'deleteMoney', id }); }

async function loadShops() {
  const res = await gasGet({ action: 'getShops' });
  if (!res.ok) return state.shops;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, name: r.name, category: r.category,
    area: r.area || '', rating: parseFloat(r.rating) || 0,
    comment: r.comment || '', url: r.url || '',
  })).sort((a,b) => b.rating - a.rating || b.id - a.id);
}
async function saveShop(user, data) { await gasPost({ action: 'addShop', data: JSON.stringify({ user, ...data }) }); }
async function removeShop(id) { await gasPost({ action: 'deleteShop', id }); }

async function loadAll(user) {
  const [workouts, menus, money, shops] = await Promise.all([
    loadWorkouts(user), loadMenus(user), loadMoney(), loadShops(),
  ]);
  state.workouts = workouts; state.menus = menus; state.money = money; state.shops = shops;
}

// ============================================================
//  UTILITIES
// ============================================================
function getPR(workouts) {
  const map = {};
  workouts.forEach(w => { if (w.weight && (!map[w.exercise] || w.weight > map[w.exercise])) map[w.exercise] = w.weight; });
  return map;
}
function getLastRecord(exercise) {
  const records = state.workouts.filter(w => w.exercise === exercise);
  return records.length > 0 ? records[0] : null;
}
function numInput(name, placeholder, value='', step=1, isK=true) {
  const pf = !isK ? 'pf' : '';
  return `
    <div class="num-input-wrap">
      <button type="button" class="num-btn minus" data-target="${name}">−</button>
      <input name="${name}" type="number" inputmode="numeric" pattern="[0-9]*"
        placeholder="${placeholder}" value="${value}" step="${step}" required class="${pf}">
      <button type="button" class="num-btn plus" data-target="${name}">＋</button>
    </div>`;
}
function yen(n) { return Number(n||0).toLocaleString('ja-JP'); }
function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================
//  LOGIN
// ============================================================
function loginHTML() {
  return `
    <div class="login-screen">
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

// ============================================================
//  HOME (WIKI TOP)
// ============================================================
function homeHTML(isK, ac) {
  const pr = getPR(state.workouts);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthMoney = state.money.filter(m => (m.date||'').startsWith(thisMonth));
  const income  = monthMoney.filter(m=>m.type==='income').reduce((s,m)=>s+m.amount,0);
  const expense = monthMoney.filter(m=>m.type==='expense').reduce((s,m)=>s+m.amount,0);

  return `
    <div class="wiki-hero">
      <div class="wiki-hero-tag">FOR US, BY US</div>
      <h1>かいと & なな WIKI</h1>
      <div class="wiki-hero-sub">ふたりの記録をひとつの場所に。</div>
    </div>
    <div class="feature-grid">
      <button class="feature-card fc-gym" data-goto="gym">
        <div class="fc-bar"></div>
        <span class="fc-icon">🏋️</span>
        <div class="fc-title">GYM TRACKER</div>
        <div class="fc-sub">筋トレ記録・週間メニュー・PR管理</div>
        <div class="fc-stat ${ac}">${state.workouts.length}件 / ${Object.keys(pr).length}種目</div>
      </button>
      <button class="feature-card fc-money" data-goto="money">
        <div class="fc-bar"></div>
        <span class="fc-icon">💰</span>
        <div class="fc-title">MONEY</div>
        <div class="fc-sub">ふたりの家計簿。収支を共有管理</div>
        <div class="fc-stat">¥${yen(income-expense)} <span style="font-size:12px;color:#6b7280;">今月収支</span></div>
      </button>
      <button class="feature-card fc-shops" data-goto="shops">
        <div class="fc-bar"></div>
        <span class="fc-icon">📍</span>
        <div class="fc-title">SHOPS</div>
        <div class="fc-sub">行きたい・行ったお店を記録</div>
        <div class="fc-stat">${state.shops.length}件 登録済み</div>
      </button>
    </div>
    <div class="section">
      <div class="section-title ${ac}">🕐 最近の記録</div>
      ${state.workouts.length===0 ? '<p class="empty">まだ記録がありません。</p>' : `
      <table class="pr-table">
        <thead><tr><th>種目</th><th>重量</th><th>日付</th></tr></thead>
        <tbody>
          ${state.workouts.slice(0,5).map(w=>`
            <tr><td>${escapeHtml(w.exercise)}</td>
            <td class="prw ${!isK?'purple':''}" style="font-size:16px;">${w.weight}kg</td>
            <td style="color:#6b7280;">${w.date||''}</td></tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

// ============================================================
//  GYM SECTION
// ============================================================
function calendarHTML(isK, ac) {
  const year = state.calYear, month = state.calMonth;
  const today = new Date().toISOString().slice(0,10);
  const trainedDates = new Set(state.workouts.map(w => w.date));
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const trained = trainedDates.has(dateStr);
    const isToday = dateStr === today;
    const isSel   = dateStr === state.calSelected;
    const dayOfWeek = (startOffset + d - 1) % 7;
    const isSun = dayOfWeek === 6, isSat = dayOfWeek === 5;
    cells += `
      <div class="cal-cell ${trained?(isK?'trained-o':'trained-p'):''} ${isToday?'cal-today':''} ${isSel?'cal-sel':''} ${isSun?'cal-sun':''} ${isSat?'cal-sat':''}"
           data-date="${dateStr}">${d}${trained?`<span class="cal-dot"></span>`:''}</div>`;
  }

  let detail = '';
  if (state.calSelected) {
    const dayWorkouts = state.workouts.filter(w => w.date === state.calSelected);
    detail = `
      <div class="cal-detail">
        <div class="cal-detail-date">${state.calSelected}</div>
        ${dayWorkouts.length === 0 ? '<p class="empty">この日の記録はありません</p>' : dayWorkouts.map(w => `
          <div class="cal-workout-row">
            <span class="${isK?'':'purple-text'}" style="font-weight:700;font-size:14px;">${escapeHtml(w.exercise)}</span>
            <span style="color:#9ca3af;font-size:13px;">${w.weight}kg × ${w.reps}reps × ${w.sets}sets</span>
          </div>`).join('')}
      </div>`;
  }

  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthWorkouts = state.workouts.filter(w => w.date && w.date.startsWith(monthStr));
  const monthDays = new Set(monthWorkouts.map(w => w.date)).size;

  return `
    <div class="section">
      <div class="section-title ${ac}">📅 TRAINING CALENDAR</div>
      <div class="cal-summary">
        <div class="cal-sum-item"><div class="cal-sum-label">今月のトレーニング</div><div class="cal-sum-val ${ac}">${monthDays}日</div></div>
        <div class="cal-sum-item"><div class="cal-sum-label">今月の記録数</div><div class="cal-sum-val ${ac}">${monthWorkouts.length}件</div></div>
        <div class="cal-sum-item"><div class="cal-sum-label">連続記録</div><div class="cal-sum-val ${ac}">${getStreak(trainedDates, today)}日</div></div>
      </div>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">◀</button>
        <span class="cal-month-label">${year}年 ${MONTH_NAMES[month]}</span>
        <button class="cal-nav-btn" id="cal-next">▶</button>
      </div>
      <div class="cal-header">
        ${['月','火','水','木','金','土','日'].map((d,i) => `<div class="cal-head-cell ${i===6?'cal-sun':''} ${i===5?'cal-sat':''}">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">${cells}</div>
      ${detail}
    </div>`;
}

function getStreak(trainedDates, today) {
  let streak = 0, d = new Date(today);
  while (true) {
    const str = d.toISOString().slice(0,10);
    if (trainedDates.has(str)) { streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}

function gymLogHTML(isK, ac, pr, today) {
  const todayCnt = state.workouts.filter(w => w.date === today).length;
  const vol = state.workouts.reduce((s,w) => s+(w.weight||0)*(w.reps||0)*(w.sets||0), 0);
  return `
    <div class="cards-grid">
      <div class="stat-card"><div class="stat-label">TOTAL</div><div class="stat-val ${ac}">${state.workouts.length}</div></div>
      <div class="stat-card"><div class="stat-label">TODAY</div><div class="stat-val ${ac}">${todayCnt}</div></div>
      <div class="stat-card"><div class="stat-label">VOLUME</div><div class="stat-val ${ac}">${(vol/1000).toFixed(1)}<span style="font-size:16px;color:#6b7280;"> t</span></div></div>
      <div class="stat-card"><div class="stat-label">EXERCISES</div><div class="stat-val ${ac}">${Object.keys(pr).length}</div></div>
    </div>
    <div class="section">
      <div class="section-title ${ac}">➕ ADD WORKOUT</div>
      <form class="add-form" id="form-workout">
        <input name="exercise" placeholder="種目名" required class="${!isK?'pf':''}">
        ${numInput('weight','重量 kg','',0.5,isK)}
        ${numInput('reps','Reps','',1,isK)}
        ${numInput('sets','Sets','',1,isK)}
        <input name="date" type="date" value="${today}" required class="${!isK?'pf':''}">
        <button type="submit" class="submit-btn ${ac}">+ 追加</button>
      </form>
    </div>
    <div class="section">
      <div class="section-title ${ac}">📝 WORKOUT LOG</div>
      ${state.workouts.length===0?'<p class="empty">まだ記録がありません。</p>':''}
      <div class="workout-grid">
        ${state.workouts.map(w=>`
          <div class="workout-card ${!isK?'np':''}">
            <div class="wc-name ${!isK?'purple':''}">${escapeHtml(w.exercise)}</div>
            <div class="workout-stats">
              <div><span>WEIGHT</span><strong>${w.weight}<small style="font-size:11px;color:#6b7280;">kg</small></strong></div>
              <div><span>REPS</span><strong>${w.reps}</strong></div>
              <div><span>SETS</span><strong>${w.sets}</strong></div>
            </div>
            <div class="workout-date">${w.date||''}</div>
            ${pr[w.exercise]===w.weight?`<div class="pr-badge ${!isK?'pp':''}">🏆 PR</div>`:''}
            <button class="del-btn" data-del-workout="${w.id}">削除</button>
          </div>`).join('')}
      </div>
    </div>`;
}

function gymPrHTML(isK, ac, pr) {
  const sorted = Object.entries(pr).sort((a,b)=>a[0].localeCompare(b[0],'ja'));
  const selEx  = state.selectedEx || (sorted.length>0?sorted[0][0]:null);
  let graphHTML = '';
  if (selEx) {
    const records = state.workouts.filter(w=>w.exercise===selEx&&w.date).sort((a,b)=>a.date.localeCompare(b.date));
    graphHTML = `
      <div class="section" style="margin-bottom:20px;">
        <div class="section-title ${ac}">📈 PROGRESS GRAPH</div>
        <div class="ex-select-wrap">
          ${sorted.map(([ex])=>`<button class="ex-sel-btn ${ex===selEx?(isK?'active-o':'active-p'):''}" data-ex="${ex}">${escapeHtml(ex)}</button>`).join('')}
        </div>
        <div style="position:relative;height:220px;margin-top:16px;">
          <canvas id="progressChart"></canvas>
        </div>
        <div id="chart-labels" data-labels='${JSON.stringify(records.map(r=>r.date))}' data-values='${JSON.stringify(records.map(r=>r.weight))}' data-color="${isK?'249,115,22':'168,85,247'}"></div>
      </div>`;
  }
  return `
    ${graphHTML}
    <div class="section">
      <div class="section-title ${ac}">🏆 PERSONAL RECORDS</div>
      ${sorted.length===0?'<p class="empty">まだ記録がありません。</p>':`
      <table class="pr-table">
        <thead><tr><th>EXERCISE</th><th>BEST WEIGHT</th><th>SESSIONS</th></tr></thead>
        <tbody>
          ${sorted.map(([ex,best])=>`
            <tr><td>${escapeHtml(ex)}</td>
            <td class="prw ${!isK?'purple':''}">${best}<span style="font-size:13px;color:#6b7280;"> kg</span></td>
            <td style="color:#6b7280;font-size:14px;">${state.workouts.filter(w=>w.exercise===ex).length}回</td></tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

function gymMenuHTML(isK, ac) {
  const ad = state.activeDay;
  const dayMenus = state.menus.filter(m=>m.day===ad);
  return `
    <div class="section">
      <div class="section-title ${ac}">⚙️ WEEKLY MENU</div>
      <div class="day-tabs">
        ${DAY_NAMES.map((d,i)=>`<div class="day-tab ${ad===i?(isK?'ao':'ap'):''}" data-day="${i}">${d}曜</div>`).join('')}
      </div>
      <div class="menu-list">
        ${dayMenus.length===0?'<p class="empty">この曜日のメニューはありません</p>':''}
        ${dayMenus.map(m=>{
          const last=getLastRecord(m.exercise);
          return `
          <div class="menu-row">
            <div class="menu-row-left">
              <span class="menu-ex ${!isK?'purple':''}">${escapeHtml(m.exercise)}</span>
              <span class="menu-meta">${m.target_sets}sets × ${m.target_reps}reps</span>
              ${last?`<span class="menu-meta">前回: ${last.weight}kg × ${last.reps}reps</span>`:''}
            </div>
            <div class="menu-row-right">
              ${m.video_url?`<a href="${m.video_url}" target="_blank" class="video-btn ${!isK?'purple-video':''}">▶ 動画</a>`:''}
              <button class="quick-add-btn ${!isK?'purple-quick':''}"
                data-exercise="${escapeHtml(m.exercise)}"
                data-weight="${last?last.weight:''}"
                data-reps="${last?last.reps:m.target_reps}"
                data-sets="${last?last.sets:m.target_sets}">+ 記録</button>
              <button class="del-btn" data-del-menu="${m.id}">削除</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <form class="add-form" id="form-menu">
        <input type="hidden" name="day" value="${ad}">
        <input name="exercise" placeholder="種目名" required class="${!isK?'pf':''}">
        ${numInput('target_sets','Sets','',1,isK)}
        ${numInput('target_reps','Reps','',1,isK)}
        <input name="video_url" type="url" inputmode="url" placeholder="動画URL（任意）" class="${!isK?'pf':''}">
        <button type="submit" class="submit-btn ${ac}">+ 追加</button>
      </form>
    </div>`;
}

function gymHTML(u, isK, ac) {
  const pr = getPR(state.workouts);
  const today = new Date().toISOString().slice(0,10);
  const tabs = [['log','📝 Log'],['calendar','📅 Calendar'],['pr','🏆 Records'],['menu','⚙️ Menu']];
  const subnav = `
    <div class="subnav">
      ${tabs.map(([p,l])=>`<button class="subnav-btn ${state.gymPage===p?'active '+(isK?'acc-orange':'acc-purple'):''}" data-gympage="${p}">${l}</button>`).join('')}
    </div>`;
  let pageHTML = '';
  if (state.gymPage==='log') pageHTML = gymLogHTML(isK, ac, pr, today);
  else if (state.gymPage==='calendar') pageHTML = calendarHTML(isK, ac);
  else if (state.gymPage==='pr') pageHTML = gymPrHTML(isK, ac, pr);
  else pageHTML = gymMenuHTML(isK, ac);

  return `
    <div class="hero ${u}">
      <div class="hero-tag">NO EXCUSES • ${isK?'かいと':'なな'}</div>
      <h1>Gym Tracker</h1>
      <div class="hero-sub">${state.workouts.length} workouts • ${Object.keys(pr).length} exercises</div>
    </div>
    ${subnav}
    ${pageHTML}`;
}

// ============================================================
//  MONEY SECTION（家計簿・共有）
// ============================================================
function moneyHTML(u, isK, ac) {
  const monthStr = state.moneyMonth;
  const monthEntries = state.money.filter(m => (m.date||'').startsWith(monthStr));
  const income  = monthEntries.filter(m=>m.type==='income').reduce((s,m)=>s+m.amount,0);
  const expense = monthEntries.filter(m=>m.type==='expense').reduce((s,m)=>s+m.amount,0);
  const balance = income - expense;

  const [y,mo] = monthStr.split('-').map(Number);
  const monthLabel = `${y}年 ${MONTH_NAMES[mo-1]}`;

  const today = new Date().toISOString().slice(0,10);

  return `
    <div class="hero ${u}">
      <div class="hero-tag">SHARED BUDGET</div>
      <h1>💰 Money</h1>
      <div class="hero-sub">ふたりの家計簿（共有データ）</div>
    </div>
    <div class="cal-nav" style="margin-bottom:18px;">
      <button class="cal-nav-btn" id="money-prev">◀</button>
      <span class="cal-month-label">${monthLabel}</span>
      <button class="cal-nav-btn" id="money-next">▶</button>
    </div>
    <div class="cards-grid">
      <div class="stat-card"><div class="stat-label">収入</div><div class="stat-val money-stat-income">¥${yen(income)}</div></div>
      <div class="stat-card"><div class="stat-label">支出</div><div class="stat-val money-stat-expense">¥${yen(expense)}</div></div>
      <div class="stat-card"><div class="stat-label">収支</div><div class="stat-val money-stat-balance">¥${yen(balance)}</div></div>
    </div>
    <div class="section">
      <div class="section-title acc-green" style="color:#4ade80;">➕ ADD ENTRY</div>
      <form class="add-form" id="form-money">
        <div class="type-toggle">
          <label class="income-label"><input type="radio" name="type" value="income"><span>💵 収入</span></label>
          <label class="expense-label"><input type="radio" name="type" value="expense" checked><span>💸 支出</span></label>
        </div>
        <select name="category" required style="padding:12px;border:1px solid #2c2c2c;border-radius:12px;background:#0f0f0f;color:white;font-size:14px;">
          ${MONEY_CATS_EXPENSE.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        ${numInput('amount','金額 ¥','',100,isK)}
        <input name="memo" placeholder="メモ（任意）" class="${!isK?'pf':''}">
        <input name="date" type="date" value="${today}" required class="${!isK?'pf':''}">
        <button type="submit" class="submit-btn ${ac}">+ 追加</button>
      </form>
    </div>
    <div class="section">
      <div class="section-title acc-green" style="color:#4ade80;">📋 履歴</div>
      ${monthEntries.length===0?'<p class="empty">この月の記録はありません</p>':`
      <table class="money-table">
        <thead><tr><th>日付</th><th>区分</th><th>メモ</th><th>金額</th><th></th></tr></thead>
        <tbody>
          ${monthEntries.map(m=>`
            <tr>
              <td style="color:#6b7280;">${m.date||''}<br><span class="money-who ${m.user}">${m.user==='kaito'?'かいと':'なな'}</span></td>
              <td><span class="money-cat-pill">${escapeHtml(m.category)}</span></td>
              <td style="color:#9ca3af;">${escapeHtml(m.memo)}</td>
              <td class="money-amount ${m.type==='income'?'money-stat-income':'money-stat-expense'}">${m.type==='income'?'+':'-'}¥${yen(m.amount)}</td>
              <td><button class="del-icon-btn" data-del-money="${m.id}">✕</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

// ============================================================
//  SHOPS SECTION（おすすめのお店・共有）
// ============================================================
function shopsHTML(u, isK, ac) {
  return `
    <div class="hero ${u}">
      <div class="hero-tag">OUR FAVORITE PLACES</div>
      <h1>📍 Shops</h1>
      <div class="hero-sub">ふたりのおすすめ・行きたいお店リスト</div>
    </div>
    <div class="section">
      <div class="section-title" style="color:#38bdf8;">➕ ADD SHOP</div>
      <form class="add-form" id="form-shop">
        <input name="name" placeholder="お店の名前" required class="${!isK?'pf':''}">
        <select name="category" required style="padding:12px;border:1px solid #2c2c2c;border-radius:12px;background:#0f0f0f;color:white;font-size:14px;">
          ${SHOP_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        <input name="area" placeholder="エリア（任意）" class="${!isK?'pf':''}">
        <select name="rating" style="padding:12px;border:1px solid #2c2c2c;border-radius:12px;background:#0f0f0f;color:white;font-size:14px;">
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
      <div class="section-title" style="color:#38bdf8;">🗺️ LIST (${state.shops.length})</div>
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

// ============================================================
//  APP SHELL
// ============================================================
function appHTML() {
  const u   = state.user;
  const isK = u === 'kaito';
  const ac  = isK ? 'orange' : 'purple';

  const navItems = [
    ['home',  '🏠 ホーム'],
    ['gym',   '🏋️ Gym Tracker'],
    ['money', '💰 Money'],
    ['shops', '📍 Shops'],
  ];

  const sidebar = `
    <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
    <div class="overlay" id="overlay"></div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-user ${u}">
        <div class="av">${isK?'🏋️':'💪'}</div>
        <div><div class="uname">${isK?'かいと':'なな'}</div><div style="font-size:10px;color:#4b5563;">Member</div></div>
      </div>
      ${navItems.map(([p,l]) => `<button class="nav-btn ${state.section===p?'active-'+ac:''}" data-section="${p}">${l}</button>`).join('')}
      <button class="logout-btn" id="btn-logout">← ユーザー切替</button>
    </div>`;

  let body = '';
  if (state.section==='home') body = homeHTML(isK, ac);
  else if (state.section==='gym') body = gymHTML(u, isK, ac);
  else if (state.section==='money') body = moneyHTML(u, isK, ac);
  else body = shopsHTML(u, isK, ac);

  return `
    ${sidebar}
    <div class="app-layout">
      <div class="main">${body}</div>
    </div>`;
}

// ============================================================
//  RENDER & EVENTS
// ============================================================
const root = document.getElementById('root');
let chartInstance = null;

function render() {
  root.innerHTML = state.user ? appHTML() : loginHTML();
  bindEvents();
  initChart();
}

function initChart() {
  const el = document.getElementById('chart-labels');
  const canvas = document.getElementById('progressChart');
  if (!el||!canvas) return;
  const labels = JSON.parse(el.dataset.labels);
  const values = JSON.parse(el.dataset.values);
  const color  = el.dataset.color;
  if (chartInstance) { chartInstance.destroy(); chartInstance=null; }
  if (typeof Chart==='undefined') return;
  chartInstance = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: [{
      data: values, borderColor: `rgb(${color})`, backgroundColor: `rgba(${color},0.15)`,
      borderWidth: 2.5, pointBackgroundColor: `rgb(${color})`, pointRadius: 5, fill: true, tension: 0.3,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color:'#6b7280', font:{size:11} }, grid: { color:'#1a1a1a' } },
        y: { ticks: { color:'#6b7280', font:{size:11} }, grid: { color:'#1a1a1a' } },
      }
    }
  });
}

function bindEvents() {
  document.getElementById('btn-kaito')?.addEventListener('click', ()=>login('kaito'));
  document.getElementById('btn-nana')?.addEventListener('click',  ()=>login('nana'));
  document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    state.user=null; state.workouts=[]; state.menus=[]; state.money=[]; state.shops=[]; render();
  });

  // セクション切替（サイドバー & ホームのカード）
  document.querySelectorAll('[data-section]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ state.section=btn.dataset.section; render(); });
  });
  document.querySelectorAll('[data-goto]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ state.section=btn.dataset.goto; render(); });
  });

  // Gymサブナビ
  document.querySelectorAll('[data-gympage]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ state.gymPage=btn.dataset.gympage; render(); });
  });

  document.querySelectorAll('[data-day]').forEach(tab=>{
    tab.addEventListener('click', ()=>{ state.activeDay=parseInt(tab.dataset.day); render(); });
  });

  // カレンダー操作
  document.getElementById('cal-prev')?.addEventListener('click', ()=>{
    state.calMonth--; if (state.calMonth<0) { state.calMonth=11; state.calYear--; }
    state.calSelected=null; render();
  });
  document.getElementById('cal-next')?.addEventListener('click', ()=>{
    state.calMonth++; if (state.calMonth>11) { state.calMonth=0; state.calYear++; }
    state.calSelected=null; render();
  });
  document.querySelectorAll('.cal-cell:not(.empty)').forEach(cell=>{
    cell.addEventListener('click', ()=>{
      const d = cell.dataset.date;
      state.calSelected = state.calSelected===d ? null : d;
      render();
    });
  });

  // Money 月ナビ
  document.getElementById('money-prev')?.addEventListener('click', ()=>{
    const [y,m] = state.moneyMonth.split('-').map(Number);
    const d = new Date(y, m-2, 1);
    state.moneyMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    render();
  });
  document.getElementById('money-next')?.addEventListener('click', ()=>{
    const [y,m] = state.moneyMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    state.moneyMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    render();
  });

  // グラフ種目選択
  document.querySelectorAll('[data-ex]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ state.selectedEx=btn.dataset.ex; render(); });
  });

  // +/- ボタン
  document.querySelectorAll('.num-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const input = btn.closest('.num-input-wrap').querySelector('input');
      const step  = parseFloat(input.step)||1;
      const val   = parseFloat(input.value)||0;
      if (btn.classList.contains('plus')) input.value = Math.round((val+step)*100)/100;
      else input.value = Math.max(0, Math.round((val-step)*100)/100);
    });
  });

  // ワンタップ記録
  document.querySelectorAll('.quick-add-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const today = new Date().toISOString().slice(0,10);
      const data = {
        exercise: btn.dataset.exercise, weight: parseFloat(btn.dataset.weight)||0,
        reps: parseInt(btn.dataset.reps)||0, sets: parseInt(btn.dataset.sets)||0, date: today,
      };
      btn.textContent='✓ 追加!'; btn.disabled=true;
      state.workouts.unshift({id:'temp-'+Date.now(), user:state.user, ...data});
      await saveWorkout(state.user, data);
      state.workouts = await loadWorkouts(state.user);
      state.gymPage='log'; render();
    });
  });

  // Add Workout
  document.getElementById('form-workout')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=e.target;
    const data={ exercise:f.exercise.value.trim(), weight:parseFloat(f.weight.value), reps:parseInt(f.reps.value), sets:parseInt(f.sets.value), date:f.date.value };
    state.workouts.unshift({id:'temp-'+Date.now(), user:state.user, ...data});
    f.reset(); f.date.value=new Date().toISOString().slice(0,10);
    render();
    await saveWorkout(state.user, data);
    state.workouts=await loadWorkouts(state.user); render();
  });

  // Add Menu
  document.getElementById('form-menu')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=e.target;
    const day=parseInt(f.day.value);
    const data={ day, order: state.menus.filter(m=>m.day===day).length+1, exercise:f.exercise.value.trim(), target_sets:parseInt(f.target_sets.value), target_reps:parseInt(f.target_reps.value), video_url:f.video_url.value.trim() };
    state.menus.push({id:'temp-'+Date.now(), user:state.user, ...data});
    f.reset(); render();
    await saveMenu(state.user, data);
    state.menus=await loadMenus(state.user); render();
  });

  // Delete Workout / Menu
  document.querySelectorAll('[data-del-workout]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delWorkout;
      state.workouts=state.workouts.filter(w=>w.id!==id); render();
      await removeWorkout(id);
      state.workouts=await loadWorkouts(state.user); render();
    });
  });
  document.querySelectorAll('[data-del-menu]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delMenu;
      state.menus=state.menus.filter(m=>m.id!==id); render();
      await removeMenu(id);
      state.menus=await loadMenus(state.user); render();
    });
  });

  // Money: カテゴリ選択を収入/支出で切替
  const typeRadios = document.querySelectorAll('#form-money input[name="type"]');
  const catSelect = document.querySelector('#form-money select[name="category"]');
  typeRadios.forEach(r=>{
    r.addEventListener('change', ()=>{
      if (!catSelect) return;
      const cats = r.value==='income' ? MONEY_CATS_INCOME : MONEY_CATS_EXPENSE;
      if (r.checked) catSelect.innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    });
  });

  // Add Money
  document.getElementById('form-money')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=e.target;
    const data={
      type: f.type.value, category: f.category.value,
      amount: parseFloat(f.amount.value)||0, memo: f.memo.value.trim(), date: f.date.value,
    };
    state.money.unshift({id:'temp-'+Date.now(), user:state.user, ...data});
    f.reset(); render();
    await saveMoney(state.user, data);
    state.money=await loadMoney(); render();
  });

  // Delete Money
  document.querySelectorAll('[data-del-money]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delMoney;
      state.money=state.money.filter(m=>m.id!==id); render();
      await removeMoney(id);
      state.money=await loadMoney(); render();
    });
  });

  // Add Shop
  document.getElementById('form-shop')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=e.target;
    const data={
      name: f.name.value.trim(), category: f.category.value, area: f.area.value.trim(),
      rating: parseInt(f.rating.value)||3, url: f.url.value.trim(), comment: f.comment.value.trim(),
    };
    state.shops.unshift({id:'temp-'+Date.now(), user:state.user, ...data});
    f.reset(); render();
    await saveShop(state.user, data);
    state.shops=await loadShops(); render();
  });

  // Delete Shop
  document.querySelectorAll('[data-del-shop]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delShop;
      state.shops=state.shops.filter(s=>s.id!==id); render();
      await removeShop(id);
      state.shops=await loadShops(); render();
    });
  });

  // Hamburger
  const hb=document.getElementById('hamburger');
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('overlay');
  hb?.addEventListener('click', ()=>{ sb.classList.toggle('open'); ov.classList.toggle('open'); });
  ov?.addEventListener('click', ()=>{ sb.classList.remove('open'); ov.classList.remove('open'); });
}

async function login(user) {
  state.user=user; state.section='home';
  root.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#6b7280;font-size:14px;letter-spacing:2px;">読み込み中...</div>`;
  await loadAll(user);
  render();
}

render();
