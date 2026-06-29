// ============================================================
//  GYM TRACKER — Google Apps Script版
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyQkv4WQXsrVHVHwA_p2p7_HxtFd_WUNClF3nP0Ocp5ccToMqBm8NxpAdz8rx8BAIYA/exec';

const state = {
  user:        null,
  page:        'log',
  workouts:    [],
  menus:       [],
  activeDay:   todayIndex(),
  selectedEx:  null, // グラフ用選択種目
};

const DAY_NAMES = ['月','火','水','木','金','土','日'];

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
    id:       String(r.id),
    user:     r.user,
    exercise: r.exercise,
    weight:   parseFloat(r.weight),
    reps:     parseInt(r.reps),
    sets:     parseInt(r.sets),
    date:     r.date,
  })).sort((a,b) => b.id - a.id);
}

async function saveWorkout(user, data) {
  await gasPost({ action: 'addWorkout', data: JSON.stringify({ user, ...data }) });
}

async function removeWorkout(id) {
  await gasPost({ action: 'deleteWorkout', id });
}

async function loadMenus(user) {
  const res = await gasGet({ action: 'getMenus', user });
  if (!res.ok) return state.menus;
  return res.rows.map(r => ({
    id:          String(r.id),
    user:        r.user,
    day:         parseInt(r.day),
    order:       parseInt(r.order),
    exercise:    r.exercise,
    target_sets: parseInt(r.target_sets),
    target_reps: parseInt(r.target_reps),
    video_url:   r.video_url || '',
  }));
}

async function saveMenu(user, data) {
  await gasPost({ action: 'addMenu', data: JSON.stringify({ user, ...data }) });
}

async function removeMenu(id) {
  await gasPost({ action: 'deleteMenu', id });
}

// ============================================================
//  UTILITIES
// ============================================================
function getPR(workouts) {
  const map = {};
  workouts.forEach(w => {
    if (w.weight && (!map[w.exercise] || w.weight > map[w.exercise])) {
      map[w.exercise] = w.weight;
    }
  });
  return map;
}

// 種目の前回記録を取得
function getLastRecord(exercise) {
  const records = state.workouts.filter(w => w.exercise === exercise);
  return records.length > 0 ? records[0] : null;
}

// 数字入力コンポーネント
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

// ============================================================
//  HTML BUILDERS
// ============================================================
function loginHTML() {
  return `
    <div class="login-screen">
      <div class="login-box">
        <div class="app-title">GYM</div>
        <div class="app-sub">TRAINING TRACKER</div>
        <div class="status-badge connected">✅ Google スプレッドシート連携済み</div>
        <div class="user-grid">
          <button class="user-btn kaito" id="btn-kaito">
            <div class="user-avatar">🏋️</div><div>かいと</div>
          </button>
          <button class="user-btn nana" id="btn-nana">
            <div class="user-avatar">💪</div><div>なな</div>
          </button>
        </div>
        <div class="login-hint">ユーザーを選択してください</div>
      </div>
    </div>`;
}

function appHTML() {
  const u     = state.user;
  const isK   = u === 'kaito';
  const ac    = isK ? 'orange' : 'purple';
  const pr    = getPR(state.workouts);
  const today = new Date().toISOString().slice(0,10);

  const navItems = [
    ['log',  '📝 Workout Log'],
    ['pr',   '🏆 Records & Graph'],
    ['menu', '⚙️ Weekly Menu'],
  ];

  const sidebar = `
    <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
    <div class="overlay" id="overlay"></div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-user ${u}">
        <div class="av">${isK ? '🏋️' : '💪'}</div>
        <div>
          <div class="uname">${isK ? 'かいと' : 'なな'}</div>
          <div style="font-size:10px;color:#4b5563;">Athlete</div>
        </div>
      </div>
      ${navItems.map(([p,l]) =>
        `<button class="nav-btn ${state.page===p ? 'active-'+ac : ''}" data-page="${p}">${l}</button>`
      ).join('')}
      <button class="logout-btn" id="btn-logout">← ユーザー切替</button>
    </div>`;

  let pageHTML = '';

  if (state.page === 'log') {
    const todayCnt = state.workouts.filter(w => w.date === today).length;
    const vol = state.workouts.reduce((s,w) => s + (w.weight||0)*(w.reps||0)*(w.sets||0), 0);

    pageHTML = `
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
          ${numInput('weight', '重量 kg', '', 0.5, isK)}
          ${numInput('reps', 'Reps', '', 1, isK)}
          ${numInput('sets', 'Sets', '', 1, isK)}
          <input name="date" type="date" value="${today}" required class="${!isK?'pf':''}">
          <button type="submit" class="submit-btn ${ac}">+ 追加</button>
        </form>
      </div>
      <div class="section">
        <div class="section-title ${ac}">📝 WORKOUT LOG</div>
        ${state.workouts.length === 0 ? '<p class="empty">まだ記録がありません。最初のワークアウトを追加しましょう！</p>' : ''}
        <div class="workout-grid">
          ${state.workouts.map(w => `
            <div class="workout-card ${!isK?'np':''}">
              <div class="wc-name ${!isK?'purple':''}">${w.exercise}</div>
              <div class="workout-stats">
                <div><span>WEIGHT</span><strong>${w.weight}<small style="font-size:11px;color:#6b7280;">kg</small></strong></div>
                <div><span>REPS</span><strong>${w.reps}</strong></div>
                <div><span>SETS</span><strong>${w.sets}</strong></div>
              </div>
              <div class="workout-date">${w.date||''}</div>
              ${pr[w.exercise]===w.weight ? `<div class="pr-badge ${!isK?'pp':''}">🏆 PR</div>` : ''}
              <button class="del-btn" data-del-workout="${w.id}">削除</button>
            </div>`).join('')}
        </div>
      </div>`;

  } else if (state.page === 'pr') {
    const sorted = Object.entries(pr).sort((a,b) => a[0].localeCompare(b[0],'ja'));
    const selEx  = state.selectedEx || (sorted.length > 0 ? sorted[0][0] : null);

    // グラフ用データ
    let graphHTML = '';
    if (selEx) {
      const records = state.workouts
        .filter(w => w.exercise === selEx && w.date)
        .sort((a,b) => a.date.localeCompare(b.date));
      graphHTML = `
        <div class="section" style="margin-bottom:20px;">
          <div class="section-title ${ac}">📈 PROGRESS GRAPH</div>
          <div class="ex-select-wrap">
            ${sorted.map(([ex]) =>
              `<button class="ex-sel-btn ${ex===selEx?(isK?'active-o':'active-p'):''}" data-ex="${ex}">${ex}</button>`
            ).join('')}
          </div>
          <div style="position:relative;height:220px;margin-top:16px;">
            <canvas id="progressChart"></canvas>
          </div>
          <div id="chart-labels" data-labels='${JSON.stringify(records.map(r=>r.date))}' data-values='${JSON.stringify(records.map(r=>r.weight))}' data-color="${isK?'249,115,22':'168,85,247'}"></div>
        </div>`;
    }

    pageHTML = `
      ${graphHTML}
      <div class="section">
        <div class="section-title ${ac}">🏆 PERSONAL RECORDS</div>
        ${sorted.length === 0 ? '<p class="empty">まだ記録がありません。</p>' : `
        <table class="pr-table">
          <thead><tr><th>EXERCISE</th><th>BEST WEIGHT</th><th>SESSIONS</th></tr></thead>
          <tbody>
            ${sorted.map(([ex,best]) => `
              <tr class="pr-row" data-ex="${ex}">
                <td>${ex}</td>
                <td class="prw ${!isK?'purple':''}">${best}<span style="font-size:13px;color:#6b7280;"> kg</span></td>
                <td style="color:#6b7280;font-size:14px;">${state.workouts.filter(w=>w.exercise===ex).length}回</td>
              </tr>`).join('')}
          </tbody>
        </table>`}
      </div>`;

  } else {
    // MENU
    const ad = state.activeDay;
    const dayMenus = state.menus.filter(m => m.day === ad);

    pageHTML = `
      <div class="section">
        <div class="section-title ${ac}">⚙️ WEEKLY MENU</div>
        <div class="day-tabs">
          ${DAY_NAMES.map((d,i) =>
            `<div class="day-tab ${ad===i ? (isK?'ao':'ap') : ''}" data-day="${i}">${d}曜</div>`
          ).join('')}
        </div>
        <div class="menu-list">
          ${dayMenus.length === 0 ? '<p class="empty">この曜日のメニューはありません</p>' : ''}
          ${dayMenus.map(m => {
            const last = getLastRecord(m.exercise);
            return `
            <div class="menu-row">
              <div class="menu-row-left">
                <span class="menu-ex ${!isK?'purple':''}">${m.exercise}</span>
                <span class="menu-meta">${m.target_sets}sets × ${m.target_reps}reps</span>
                ${last ? `<span class="menu-meta">前回: ${last.weight}kg × ${last.reps}reps</span>` : ''}
              </div>
              <div class="menu-row-right">
                ${m.video_url ? `<a href="${m.video_url}" target="_blank" class="video-btn ${!isK?'purple-video':''}">▶ 動画</a>` : ''}
                <button class="quick-add-btn ${!isK?'purple-quick':''}"
                  data-exercise="${m.exercise}"
                  data-weight="${last ? last.weight : ''}"
                  data-reps="${last ? last.reps : m.target_reps}"
                  data-sets="${last ? last.sets : m.target_sets}">
                  + 記録
                </button>
                <button class="del-btn" data-del-menu="${m.id}">削除</button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <form class="add-form" id="form-menu">
          <input type="hidden" name="day" value="${ad}">
          <input name="exercise" placeholder="種目名" required class="${!isK?'pf':''}">
          ${numInput('target_sets', 'Sets', '', 1, isK)}
          ${numInput('target_reps', 'Reps', '', 1, isK)}
          <input name="video_url" type="url" inputmode="url" placeholder="動画URL（任意）" class="${!isK?'pf':''}">
          <button type="submit" class="submit-btn ${ac}">+ 追加</button>
        </form>
      </div>`;
  }

  return `
    ${sidebar}
    <div class="app-layout">
      <div class="main">
        <div class="hero ${u}">
          <div class="hero-tag">NO EXCUSES • ${isK ? 'かいと' : 'なな'}</div>
          <h1>Gym Tracker</h1>
          <div class="hero-sub">${state.workouts.length} workouts • ${Object.keys(getPR(state.workouts)).length} exercises</div>
        </div>
        ${pageHTML}
      </div>
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
  if (!el || !canvas) return;

  const labels = JSON.parse(el.dataset.labels);
  const values = JSON.parse(el.dataset.values);
  const color  = el.dataset.color;

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  if (typeof Chart === 'undefined') return;

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: `rgb(${color})`,
        backgroundColor: `rgba(${color},0.15)`,
        borderWidth: 2.5,
        pointBackgroundColor: `rgb(${color})`,
        pointRadius: 5,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#1a1a1a' } },
        y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#1a1a1a' } },
      }
    }
  });
}

function bindEvents() {
  document.getElementById('btn-kaito')?.addEventListener('click', () => login('kaito'));
  document.getElementById('btn-nana')?.addEventListener('click',  () => login('nana'));
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    state.user = null; state.workouts = []; state.menus = []; render();
  });

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.page = btn.dataset.page; render(); });
  });

  document.querySelectorAll('[data-day]').forEach(tab => {
    tab.addEventListener('click', () => { state.activeDay = parseInt(tab.dataset.day); render(); });
  });

  // グラフ種目選択
  document.querySelectorAll('[data-ex]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedEx = btn.dataset.ex;
      render();
    });
  });

  // +/- ボタン
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.num-input-wrap').querySelector('input');
      const step  = parseFloat(input.step) || 1;
      const val   = parseFloat(input.value) || 0;
      if (btn.classList.contains('plus')) {
        input.value = Math.round((val + step) * 100) / 100;
      } else {
        input.value = Math.max(0, Math.round((val - step) * 100) / 100);
      }
    });
  });

  // ワンタップ記録ボタン
  document.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const today = new Date().toISOString().slice(0,10);
      const data = {
        exercise: btn.dataset.exercise,
        weight:   parseFloat(btn.dataset.weight) || 0,
        reps:     parseInt(btn.dataset.reps) || 0,
        sets:     parseInt(btn.dataset.sets) || 0,
        date:     today,
      };
      btn.textContent = '✓ 追加!';
      btn.disabled = true;
      state.workouts.unshift({ id: 'temp-' + Date.now(), user: state.user, ...data });
      await saveWorkout(state.user, data);
      state.workouts = await loadWorkouts(state.user);
      state.page = 'log';
      render();
    });
  });

  // Add Workout
  document.getElementById('form-workout')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const data = {
      exercise: f.exercise.value.trim(),
      weight:   parseFloat(f.weight.value),
      reps:     parseInt(f.reps.value),
      sets:     parseInt(f.sets.value),
      date:     f.date.value,
    };
    state.workouts.unshift({ id: 'temp-' + Date.now(), user: state.user, ...data });
    f.reset();
    f.date.value = new Date().toISOString().slice(0,10);
    render();
    await saveWorkout(state.user, data);
    state.workouts = await loadWorkouts(state.user);
    render();
  });

  // Add Menu
  document.getElementById('form-menu')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const day = parseInt(f.day.value);
    const data = {
      day,
      order:       state.menus.filter(m => m.day === day).length + 1,
      exercise:    f.exercise.value.trim(),
      target_sets: parseInt(f.target_sets.value),
      target_reps: parseInt(f.target_reps.value),
      video_url:   f.video_url.value.trim(),
    };
    state.menus.push({ id: 'temp-' + Date.now(), user: state.user, ...data });
    f.reset();
    render();
    await saveMenu(state.user, data);
    state.menus = await loadMenus(state.user);
    render();
  });

  // Delete Workout
  document.querySelectorAll('[data-del-workout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delWorkout;
      state.workouts = state.workouts.filter(w => w.id !== id);
      render();
      await removeWorkout(id);
      state.workouts = await loadWorkouts(state.user);
      render();
    });
  });

  // Delete Menu
  document.querySelectorAll('[data-del-menu]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delMenu;
      state.menus = state.menus.filter(m => m.id !== id);
      render();
      await removeMenu(id);
      state.menus = await loadMenus(state.user);
      render();
    });
  });

  // Hamburger
  const hb = document.getElementById('hamburger');
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  hb?.addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('open'); });
  ov?.addEventListener('click', () => { sb.classList.remove('open'); ov.classList.remove('open'); });
}

async function login(user) {
  state.user = user;
  state.page = 'log';
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#6b7280;font-size:14px;letter-spacing:2px;">読み込み中...</div>`;
  state.workouts = await loadWorkouts(user);
  state.menus    = await loadMenus(user);
  render();
}

render();
