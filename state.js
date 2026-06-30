// ============================================================
//  アプリの状態（全モジュールで共有）
// ============================================================
import { todayIndex } from './constants.js';

export const state = {
  user:        null,
  section:     'home',   // home | gym | money | shops
  gymUser:     null,     // kaito | nana — どちらのジムを見ているか（常に自分自身）
  gymPage:     'log',    // log | calendar | pr | menu
  workouts:    [],       // 全員分（共有取得 → UI側で自分の分だけ表示）
  menus:       [],       // 全員分（共有取得 → UI側で自分の分だけ表示）
  money:       [],
  shops:       [],
  activeDay:   todayIndex(),
  selectedEx:  null,
  calYear:     new Date().getFullYear(),
  calMonth:    new Date().getMonth(),
  calSelected: null,
  moneyMonth:  new Date().toISOString().slice(0,7), // 'YYYY-MM'（現在未使用・将来の月別フィルタ用）
};
