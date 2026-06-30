// ============================================================
//  二人のWIKI — Google Apps Script
//  スプレッドシートIDを下記に貼り付けてください
// ============================================================

const SHEET_ID = '1AP_PiJxhpMS0xgvUswgnqHCww17lP_gAdr7tp4Z8Gus';

function doGet(e) {
  const result = handleRequest(e);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const result = handleRequest(e);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const sheet  = SpreadsheetApp.openById(SHEET_ID);

    // ── Workouts ──
    if (action === 'getWorkouts') return getRows(sheet, 'workouts', WORKOUT_COLS, params.user, true);
    if (action === 'addWorkout') {
      const data = JSON.parse(params.data);
      addRow(sheet, 'workouts', WORKOUT_COLS, [
        Date.now(), data.user, data.exercise,
        data.weight, data.reps, data.sets, data.date,
      ]);
      return { ok: true };
    }
    if (action === 'deleteWorkout') { deleteRow(sheet, 'workouts', params.id); return { ok: true }; }

    // ── Menus ──
    if (action === 'getMenus') return getRows(sheet, 'menus', MENU_COLS, params.user, true);
    if (action === 'addMenu') {
      const data = JSON.parse(params.data);
      addRow(sheet, 'menus', MENU_COLS, [
        Date.now(), data.user, data.day, data.order,
        data.exercise, data.target_sets, data.target_reps,
        data.video_url || '',
      ]);
      return { ok: true };
    }
    if (action === 'deleteMenu') { deleteRow(sheet, 'menus', params.id); return { ok: true }; }

    // ── Money（家計簿・共有）──
    if (action === 'getMoney') return getRows(sheet, 'money', MONEY_COLS, null, false);
    if (action === 'addMoney') {
      const data = JSON.parse(params.data);
      addRow(sheet, 'money', MONEY_COLS, [
        Date.now(), data.user, data.kind, data.category || '',
        data.amount, data.memo || '', data.date, data.payee || '',
      ]);
      return { ok: true };
    }
    if (action === 'deleteMoney') { deleteRow(sheet, 'money', params.id); return { ok: true }; }

    // ── Shops（おすすめのお店・共有）──
    if (action === 'getShops') return getRows(sheet, 'shops', SHOP_COLS, null, false);
    if (action === 'addShop') {
      const data = JSON.parse(params.data);
      addRow(sheet, 'shops', SHOP_COLS, [
        Date.now(), data.user, data.name, data.category,
        data.area || '', data.rating || '', data.comment || '', data.url || '',
      ]);
      return { ok: true };
    }
    if (action === 'deleteShop') { deleteRow(sheet, 'shops', params.id); return { ok: true }; }

    return { ok: false, error: 'Unknown action' };

  } catch(err) {
    return { ok: false, error: err.toString() };
  }
}

// ============================================================
//  列定義
// ============================================================
const WORKOUT_COLS = ['id','user','exercise','weight','reps','sets','date'];
const MENU_COLS    = ['id','user','day','order','exercise','target_sets','target_reps','video_url'];
const MONEY_COLS   = ['id','user','kind','category','amount','memo','date','payee'];
const SHOP_COLS    = ['id','user','name','category','area','rating','comment','url'];

// ============================================================
//  共通ヘルパー
// ============================================================
// filterByUser=true のシートのみ user パラメータで絞り込む（Money/Shopsは二人で共有するので絞り込まない）
function getRows(ss, sheetName, cols, user, filterByUser) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { ok: true, rows: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, rows: [] };
  const rows = data.slice(1)
    .filter(r => r[0] !== '' && (!filterByUser || !user || r[1] === user))
    .map(r => {
      const obj = {};
      cols.forEach((c, i) => { obj[c] = r[i]; });
      obj.id = String(obj.id);
      return obj;
    });
  return { ok: true, rows };
}

function addRow(ss, sheetName, cols, values) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(cols);
  sheet.appendRow(values);
}

function deleteRow(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); break; }
  }
}
