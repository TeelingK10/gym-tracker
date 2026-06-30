// ============================================================
//  GYM SECTION（gw=対象ユーザーのworkouts, gm=対象ユーザーのmenus）
// ============================================================
import { state } from './state.js';
import { DAY_NAMES, MONTH_NAMES } from './constants.js';
import { getPR, getLastRecord, getStreak, numInput, escapeHtml } from './utils.js';

function calendarHTML(isK, ac, gw) {
  const year = state.calYear, month = state.calMonth;
  const today = new Date().toISOString().slice(0,10);
  const trainedDates = new Set(gw.map(w => w.date));
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
    const dayWorkouts = gw.filter(w => w.date === state.calSelected);
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
  const monthWorkouts = gw.filter(w => w.date && w.date.startsWith(monthStr));
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

function gymLogHTML(isK, ac, pr, today, gw, canEdit) {
  const todayCnt = gw.filter(w => w.date === today).length;
  const vol = gw.reduce((s,w) => s+(w.weight||0)*(w.reps||0)*(w.sets||0), 0);
  return `
    <div class="cards-grid">
      <div class="stat-card"><div class="stat-label">TOTAL</div><div class="stat-val ${ac}">${gw.length}</div></div>
      <div class="stat-card"><div class="stat-label">TODAY</div><div class="stat-val ${ac}">${todayCnt}</div></div>
      <div class="stat-card"><div class="stat-label">VOLUME</div><div class="stat-val ${ac}">${(vol/1000).toFixed(1)}<span style="font-size:16px;color:#6b7280;"> t</span></div></div>
      <div class="stat-card"><div class="stat-label">EXERCISES</div><div class="stat-val ${ac}">${Object.keys(pr).length}</div></div>
    </div>
    ${canEdit ? `
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
    </div>` : `<div class="status-badge demo">👀 これは${isK?'かいと':'なな'}の記録です（閲覧のみ）</div>`}
    <div class="section">
      <div class="section-title ${ac}">📝 WORKOUT LOG</div>
      ${gw.length===0?'<p class="empty">まだ記録がありません。</p>':''}
      <div class="workout-grid">
        ${gw.map(w=>`
          <div class="workout-card ${!isK?'np':''}">
            <div class="wc-name ${!isK?'purple':''}">${escapeHtml(w.exercise)}</div>
            <div class="workout-stats">
              <div><span>WEIGHT</span><strong>${w.weight}<small style="font-size:11px;color:#6b7280;">kg</small></strong></div>
              <div><span>REPS</span><strong>${w.reps}</strong></div>
              <div><span>SETS</span><strong>${w.sets}</strong></div>
            </div>
            <div class="workout-date">${w.date||''}</div>
            ${pr[w.exercise]===w.weight?`<div class="pr-badge ${!isK?'pp':''}">🏆 PR</div>`:''}
            ${canEdit?`<button class="del-btn" data-del-workout="${w.id}">削除</button>`:''}
          </div>`).join('')}
      </div>
    </div>`;
}

function gymPrHTML(isK, ac, pr, gw) {
  const sorted = Object.entries(pr).sort((a,b)=>a[0].localeCompare(b[0],'ja'));
  const selEx  = state.selectedEx || (sorted.length>0?sorted[0][0]:null);
  let graphHTML = '';
  if (selEx) {
    const records = gw.filter(w=>w.exercise===selEx&&w.date).sort((a,b)=>a.date.localeCompare(b.date));
    graphHTML = `
      <div class="section" style="margin-bottom:20px;">
        <div class="section-title ${ac}">📈 PROGRESS GRAPH</div>
        <div class="ex-select-wrap">
          ${sorted.map(([ex])=>`<button class="ex-sel-btn ${ex===selEx?(isK?'active-o':'active-p'):''}" data-ex="${ex}">${escapeHtml(ex)}</button>`).join('')}
        </div>
        <div style="position:relative;height:220px;margin-top:16px;">
          <canvas id="progressChart"></canvas>
        </div>
        <div id="chart-labels" data-labels='${JSON.stringify(records.map(r=>r.date))}' data-values='${JSON.stringify(records.map(r=>r.weight))}' data-color="${isK?'251,146,60':'192,132,252'}"></div>
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
            <td style="color:#6b7280;font-size:14px;">${gw.filter(w=>w.exercise===ex).length}回</td></tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

function gymMenuHTML(isK, ac, gm, gw, canEdit) {
  const ad = state.activeDay;
  const dayMenus = gm.filter(m=>m.day===ad);
  return `
    <div class="section">
      <div class="section-title ${ac}">⚙️ WEEKLY MENU</div>
      <div class="day-tabs">
        ${DAY_NAMES.map((d,i)=>`<div class="day-tab ${ad===i?(isK?'ao':'ap'):''}" data-day="${i}">${d}曜</div>`).join('')}
      </div>
      <div class="menu-list">
        ${dayMenus.length===0?'<p class="empty">この曜日のメニューはありません</p>':''}
        ${dayMenus.map(m=>{
          const last=getLastRecord(m.exercise, gw);
          return `
          <div class="menu-row">
            <div class="menu-row-left">
              <span class="menu-ex ${!isK?'purple':''}">${escapeHtml(m.exercise)}</span>
              <span class="menu-meta">${m.target_sets}sets × ${m.target_reps}reps</span>
              ${last?`<span class="menu-meta">前回: ${last.weight}kg × ${last.reps}reps</span>`:''}
            </div>
            ${canEdit ? `
            <div class="menu-row-right">
              ${m.video_url?`<a href="${m.video_url}" target="_blank" class="video-btn ${!isK?'purple-video':''}">▶ 動画</a>`:''}
              <div class="num-input-wrap quick-weight-wrap" style="width:120px;">
                <button type="button" class="num-btn minus" data-qw-target="qw-${m.id}">−</button>
                <input id="qw-${m.id}" type="number" inputmode="decimal" step="0.5"
                  value="${last?last.weight:''}" placeholder="kg" style="background:#eef7fd;color:#1e293b;border:none;border-left:1px solid #d6eaf8;border-right:1px solid #d6eaf8;text-align:center;padding:12px 4px;font-size:14px;">
                <button type="button" class="num-btn plus" data-qw-target="qw-${m.id}">＋</button>
              </div>
              <button class="quick-add-btn ${!isK?'purple-quick':''}"
                data-exercise="${escapeHtml(m.exercise)}"
                data-weight-input="qw-${m.id}"
                data-reps="${last?last.reps:m.target_reps}"
                data-sets="${last?last.sets:m.target_sets}">+ 記録</button>
              <button class="del-btn" data-del-menu="${m.id}">削除</button>
            </div>` : `
            <div class="menu-row-right">
              ${m.video_url?`<a href="${m.video_url}" target="_blank" class="video-btn ${!isK?'purple-video':''}">▶ 動画</a>`:''}
            </div>`}
          </div>`;
        }).join('')}
      </div>
      ${canEdit ? `
      <form class="add-form" id="form-menu">
        <input type="hidden" name="day" value="${ad}">
        <input name="exercise" placeholder="種目名" required class="${!isK?'pf':''}">
        ${numInput('target_sets','Sets','',1,isK)}
        ${numInput('target_reps','Reps','',1,isK)}
        <input name="video_url" type="url" inputmode="url" placeholder="動画URL（任意）" class="${!isK?'pf':''}">
        <button type="submit" class="submit-btn ${ac}">+ 追加</button>
      </form>` : ''}
    </div>`;
}

export function gymHTML(gymUser) {
  const isK = gymUser === 'kaito';
  const ac  = isK ? 'orange' : 'purple';
  const canEdit = state.user === gymUser;
  const gw = state.workouts.filter(w=>w.user===gymUser);
  const gm = state.menus.filter(m=>m.user===gymUser);
  const pr = getPR(gw);
  const today = new Date().toISOString().slice(0,10);
  const tabs = [['log','📝 Log'],['calendar','📅 Calendar'],['pr','🏆 Records'],['menu','⚙️ Menu']];
  const subnav = `
    <div class="subnav">
      ${tabs.map(([p,l])=>`<button class="subnav-btn ${state.gymPage===p?'active '+(isK?'acc-orange':'acc-purple'):''}" data-gympage="${p}">${l}</button>`).join('')}
    </div>`;
  let pageHTML = '';
  if (state.gymPage==='log') pageHTML = gymLogHTML(isK, ac, pr, today, gw, canEdit);
  else if (state.gymPage==='calendar') pageHTML = calendarHTML(isK, ac, gw);
  else if (state.gymPage==='pr') pageHTML = gymPrHTML(isK, ac, pr, gw);
  else pageHTML = gymMenuHTML(isK, ac, gm, gw, canEdit);

  return `
    <div class="hero ${gymUser}">
      <div class="hero-tag">NO EXCUSES • ${isK?'かいと':'なな'}</div>
      <h1>${isK?'かいと':'なな'}ジム 🏋️</h1>
      <div class="hero-sub">${gw.length} workouts • ${Object.keys(pr).length} exercises</div>
    </div>
    ${subnav}
    ${pageHTML}`;
}
