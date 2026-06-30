// ============================================================
//  二人のWIKI — エントリーポイント
//  RENDER / EVENTS / LOGIN
// ============================================================
import { state } from './state.js';
import {
  loadWorkouts, saveWorkout, removeWorkout,
  loadMenus, saveMenu, removeMenu,
  loadMoney, saveMoney, removeMoney,
  loadShops, saveShop, removeShop,
  loadAll,
} from './api.js';
import { loginHTML } from './view-login.js';
import { appHTML } from './view-app.js';

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
        x: { ticks: { color:'#6b7280', font:{size:11} }, grid: { color:'#e2e8f0' } },
        y: { ticks: { color:'#6b7280', font:{size:11} }, grid: { color:'#e2e8f0' } },
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
    btn.addEventListener('click', ()=>{
      state.section=btn.dataset.section;
      if (state.section==='gym') { state.gymUser=state.user; state.gymPage='log'; } // 自分のジム以外は閲覧不可
      render();
    });
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

  // グラフ種目選択
  document.querySelectorAll('[data-ex]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ state.selectedEx=btn.dataset.ex; render(); });
  });

  // +/- ボタン（通常フォーム & クイック記録の重さ入力）
  document.querySelectorAll('.num-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      let input;
      if (btn.dataset.qwTarget) input = document.getElementById(btn.dataset.qwTarget);
      else input = btn.closest('.num-input-wrap').querySelector('input');
      if (!input) return;
      const step = parseFloat(input.step)||1;
      const val  = parseFloat(input.value)||0;
      if (btn.classList.contains('plus')) input.value = Math.round((val+step)*100)/100;
      else input.value = Math.max(0, Math.round((val-step)*100)/100);
    });
  });

  // ワンタップ記録（重さは入力欄から取得＝編集可能）
  document.querySelectorAll('.quick-add-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const today = new Date().toISOString().slice(0,10);
      const weightInput = btn.dataset.weightInput ? document.getElementById(btn.dataset.weightInput) : null;
      const weight = weightInput ? (parseFloat(weightInput.value)||0) : (parseFloat(btn.dataset.weight)||0);
      const data = {
        exercise: btn.dataset.exercise, weight,
        reps: parseInt(btn.dataset.reps)||0, sets: parseInt(btn.dataset.sets)||0, date: today,
      };
      btn.textContent='✓ 追加!'; btn.disabled=true;
      state.workouts.unshift({id:'temp-'+Date.now(), user:state.user, ...data});
      await saveWorkout(state.user, data);
      state.workouts = await loadWorkouts();
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
    state.workouts=await loadWorkouts(); render();
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
    state.menus=await loadMenus(); render();
  });

  // Delete Workout / Menu
  document.querySelectorAll('[data-del-workout]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delWorkout;
      state.workouts=state.workouts.filter(w=>w.id!==id); render();
      await removeWorkout(id);
      state.workouts=await loadWorkouts(); render();
    });
  });
  document.querySelectorAll('[data-del-menu]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id=btn.dataset.delMenu;
      state.menus=state.menus.filter(m=>m.id!==id); render();
      await removeMenu(id);
      state.menus=await loadMenus(); render();
    });
  });

  // Money: 種別(入金/財布支出/立て替え)でカテゴリ欄の表示を切替
  const kindRadios = document.querySelectorAll('#form-money input[name="kind"]');
  const catSelect2  = document.querySelector('#form-money .money-cat-select');
  function syncMoneyCategoryVisibility() {
    if (!catSelect2) return;
    const checked = document.querySelector('#form-money input[name="kind"]:checked');
    catSelect2.style.display = (checked && checked.value==='deposit') ? 'none' : '';
  }
  kindRadios.forEach(r => r.addEventListener('change', syncMoneyCategoryVisibility));
  syncMoneyCategoryVisibility();

  // Add Money（入金 / 財布支出 / 立て替え）
  document.getElementById('form-money')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=e.target;
    const data={
      kind: f.kind.value,
      category: f.kind.value==='deposit' ? '' : f.category.value,
      amount: parseFloat(f.amount.value)||0, memo: f.memo.value.trim(), date: f.date.value,
    };
    state.money.unshift({id:'temp-'+Date.now(), user:state.user, payee:'', ...data});
    f.reset(); render();
    await saveMoney(state.user, data);
    state.money=await loadMoney(); render();
  });

  // 精算する（立て替えの貸し借りをまとめて解消）
  document.getElementById('btn-settle')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('btn-settle');
    const data = { kind:'settle', category:'', amount: parseFloat(btn.dataset.amount)||0, memo:'精算', date:new Date().toISOString().slice(0,10), payee: btn.dataset.owed };
    const payer = btn.dataset.ower;
    btn.textContent='✓ 精算しました'; btn.disabled=true;
    state.money.unshift({id:'temp-'+Date.now(), user:payer, ...data});
    await saveMoney(payer, data);
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
  root.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#64748b;font-size:14px;letter-spacing:2px;">読み込み中...</div>`;
  await loadAll();
  render();
}

render();
