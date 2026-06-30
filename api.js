// ============================================================
//  GAS API（Google Apps Script との通信）
// ============================================================
import { GAS_URL } from './constants.js';
import { state } from './state.js';

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

// ── Workouts ──
export async function loadWorkouts() {
  const res = await gasGet({ action: 'getWorkouts' });
  if (!res.ok) return state.workouts;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, exercise: r.exercise,
    weight: parseFloat(r.weight), reps: parseInt(r.reps),
    sets: parseInt(r.sets), date: r.date,
  })).sort((a,b) => b.id - a.id);
}
export async function saveWorkout(user, data) { await gasPost({ action: 'addWorkout', data: JSON.stringify({ user, ...data }) }); }
export async function removeWorkout(id) { await gasPost({ action: 'deleteWorkout', id }); }

// ── Menus ──
export async function loadMenus() {
  const res = await gasGet({ action: 'getMenus' });
  if (!res.ok) return state.menus;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, day: parseInt(r.day),
    order: parseInt(r.order), exercise: r.exercise,
    target_sets: parseInt(r.target_sets), target_reps: parseInt(r.target_reps),
    video_url: r.video_url || '',
  }));
}
export async function saveMenu(user, data) { await gasPost({ action: 'addMenu', data: JSON.stringify({ user, ...data }) }); }
export async function removeMenu(id) { await gasPost({ action: 'deleteMenu', id }); }

// ── Money（共有の財布）──
export async function loadMoney() {
  const res = await gasGet({ action: 'getMoney' });
  if (!res.ok) return state.money;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, kind: r.kind, category: r.category,
    amount: parseFloat(r.amount) || 0, memo: r.memo || '', date: r.date,
    payee: r.payee || '',
  })).sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.id - a.id);
}
export async function saveMoney(user, data) { await gasPost({ action: 'addMoney', data: JSON.stringify({ user, ...data }) }); }
export async function removeMoney(id) { await gasPost({ action: 'deleteMoney', id }); }

// ── Shops（おすすめのお店）──
export async function loadShops() {
  const res = await gasGet({ action: 'getShops' });
  if (!res.ok) return state.shops;
  return res.rows.map(r => ({
    id: String(r.id), user: r.user, name: r.name, category: r.category,
    area: r.area || '', rating: parseFloat(r.rating) || 0,
    comment: r.comment || '', url: r.url || '',
  })).sort((a,b) => b.rating - a.rating || b.id - a.id);
}
export async function saveShop(user, data) { await gasPost({ action: 'addShop', data: JSON.stringify({ user, ...data }) }); }
export async function removeShop(id) { await gasPost({ action: 'deleteShop', id }); }

// ── まとめて取得（ログイン時）──
export async function loadAll() {
  const [workouts, menus, money, shops] = await Promise.all([
    loadWorkouts(), loadMenus(), loadMoney(), loadShops(),
  ]);
  state.workouts = workouts; state.menus = menus; state.money = money; state.shops = shops;
}
