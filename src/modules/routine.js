import { App } from '../core/app-context.js';
import { getTodayStr, escapeHtml } from '../core/utils.js';
import { saveData } from '../core/storage.js';

export function getCheckRecordsForToday() {
  const today = getTodayStr();
  if (!App.data.checkRecords[today]) App.data.checkRecords[today] = { morning: {}, afternoon: {}, evening: {}, night: {} };
  if (!App.data.checkRecords[today].night) App.data.checkRecords[today].night = {};
  return App.data.checkRecords[today];
}

export function calculateStreak() {
  const records = Object.keys(App.data.checkRecords).sort().reverse(); if (records.length === 0) return 0;
  let streak = 0; const checkDate = new Date(); checkDate.setHours(0,0,0,0); const todayStr = getTodayStr();
  const hasToday = records.includes(todayStr) && ['morning','afternoon','evening','night'].some((p) => App.data.checkRecords[todayStr][p] && (App.data.checkRecords[todayStr][p].start || App.data.checkRecords[todayStr][p].end));
  if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);
  for (let i = 0; i < 365; i += 1) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (App.data.checkRecords[dateStr] && ['morning','afternoon','evening','night'].some((p) => App.data.checkRecords[dateStr][p] && (App.data.checkRecords[dateStr][p].start || App.data.checkRecords[dateStr][p].end))) { streak += 1; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }
  return streak;
}

export function updateStreakBadge() {
  const streak = calculateStreak(); const badge = document.getElementById('streakBadge');
  if (streak > 0) { badge.style.display = 'inline-flex'; document.getElementById('streakCount').innerText = streak; } else badge.style.display = 'none';
}

export function checkTime(period, type, btnEl = null) {
  const recs = getCheckRecordsForToday(); recs[period][type] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); saveData(); renderCheckDisplay(); updateStreakBadge();
  if (btnEl) { const orig = btnEl.innerHTML; btnEl.innerHTML = '<i class="fas fa-stamp"></i> 钦此'; setTimeout(() => { btnEl.innerHTML = orig; }, 800); }
}

export function renderCheckDisplay() {
  const rec = getCheckRecordsForToday();
  ['morning', 'afternoon', 'evening', 'night'].forEach((p) => {
    const d = rec[p] || {}; const el = document.getElementById(p); if (!el) return;
    let html = `<div class="flex justify-between text-gray-500"><span>始:${d.start ? d.start.slice(0,5) : '-'}</span><span>终:${d.end ? d.end.slice(0,5) : '-'}</span></div>`;
    if (d.energy || d.note) {
      html += '<div class="mt-1 pt-1 border-t border-gray-100 text-gray-600 line-clamp-2 leading-tight">';
      if (d.energy) { const color = d.energy.includes('龙威') ? 'text-orange-500' : (d.energy.includes('违和') ? 'text-blue-500' : 'text-green-500'); html += `<span class="font-bold ${color} mr-1" title="${d.energy}">${d.energy.split(' ')[0]}</span>`; }
      if (d.note) html += `<span class="text-[10px]">${escapeHtml(d.note)}</span>`;
      html += '</div>';
    }
    el.innerHTML = html;
  });
}

export function openCheckModal(period) {
  const recs = getCheckRecordsForToday(); const data = recs[period] || {};
  document.getElementById('checkModalPeriod').value = period;
  const titleMap = { morning: '🌅 早朝', afternoon: '☕ 午朝', evening: '🌙 晚朝', night: '⚗️ 炼丹(修仙)' };
  document.getElementById('checkModalTitle').innerHTML = `${titleMap[period]} 补录与复盘`;
  const formatTimeForInput = (tStr) => { if (!tStr || tStr === '-') return ''; const m = tStr.match(/(\d+):(\d+)/); return m ? `${m[1].padStart(2,'0')}:${m[2].padStart(2,'0')}` : ''; };
  document.getElementById('checkModalStart').value = formatTimeForInput(data.start);
  document.getElementById('checkModalEnd').value = formatTimeForInput(data.end);
  document.getElementById('checkModalNote').value = data.note || '';
  document.getElementById('checkModalEnergy').value = data.energy || '';
  document.querySelectorAll('.energy-btn').forEach((b) => { b.classList.remove('ring-2','ring-dopamine-orange','bg-orange-50','text-dopamine-orange'); b.classList.add('bg-gray-50','text-gray-600'); if (b.getAttribute('data-energy') === data.energy) { b.classList.remove('bg-gray-50','text-gray-600'); b.classList.add('ring-2','ring-dopamine-orange','bg-orange-50','text-dopamine-orange'); } });
  document.getElementById('checkInModal').classList.add('active');
}

export function saveCheckModal() {
  const period = document.getElementById('checkModalPeriod').value; const recs = getCheckRecordsForToday();
  const startVal = document.getElementById('checkModalStart').value; const endVal = document.getElementById('checkModalEnd').value;
  recs[period].start = startVal ? `${startVal}:00` : null; recs[period].end = endVal ? `${endVal}:00` : null;
  recs[period].energy = document.getElementById('checkModalEnergy').value; recs[period].note = document.getElementById('checkModalNote').value;
  saveData(); renderCheckDisplay(); updateStreakBadge(); document.getElementById('checkInModal').classList.remove('active');
}
