// ============================================================
//  定数
// ============================================================
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyQkv4WQXsrVHVHwA_p2p7_HxtFd_WUNClF3nP0Ocp5ccToMqBm8NxpAdz8rx8BAIYA/exec';

export const DAY_NAMES   = ['月','火','水','木','金','土','日'];
export const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
export const WALLET_CATS = ['食費','デート','日用品','娯楽','住居','交通','旅行','その他'];
export const SHOP_CATS   = ['ごはん','カフェ','デート','旅行','買い物','その他'];

export function todayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}
