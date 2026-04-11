import { App } from '../core/app-context.js';
import { formatDateToYMD } from '../core/utils.js';
import { renderHabitRecordsForDate } from './habits.js';
import { escapeHtml } from '../core/utils.js';

export function updateStatistics() {
  const now = new Date();
  const wStart = new Date(now); wStart.setDate(now.getDate() - (now.getDay() || 7) + 1); wStart.setHours(0,0,0,0);
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0); const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
  const yStart = new Date(now.getFullYear(), 0, 1, 0,0,0,0); const yEnd = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
  const getCompletedTaskCount = (start, end) => App.data.tasks.filter((t) => t.status === '议定' && t.completedAt && t.completedAt >= start.getTime() && t.completedAt <= end.getTime()).length;
  const getFocusMinutes = (start, end) => App.data.focusSessions.filter((fs) => fs.startTimestamp >= start.getTime() && fs.startTimestamp <= end.getTime()).reduce((sum, fs) => sum + fs.durationMinutes, 0);
  const getCheckDays = (start, end) => Object.keys(App.data.checkRecords).filter((dateStr) => { const day = new Date(`${dateStr}T00:00:00`); if (day < start || day > end) return false; const dayRecord = App.data.checkRecords[dateStr]; if (!dayRecord) return false; return ['morning','afternoon','evening','night'].some((period) => { const rec = dayRecord[period]; return rec && (rec.start || rec.end); }); }).length;
  document.getElementById('weekTasks').innerText = getCompletedTaskCount(wStart, now); document.getElementById('weekFocus').innerText = `${getFocusMinutes(wStart, now)} min`; document.getElementById('weekCheckDays').innerText = `${getCheckDays(wStart, now)} 天`;
  document.getElementById('monthTasks').innerText = getCompletedTaskCount(mStart, mEnd); document.getElementById('monthFocus').innerText = `${getFocusMinutes(mStart, mEnd)} min`; document.getElementById('monthCheckDays').innerText = `${getCheckDays(mStart, mEnd)} 天`;
  document.getElementById('yearTasks').innerText = getCompletedTaskCount(yStart, yEnd); document.getElementById('yearFocus').innerText = `${getFocusMinutes(yStart, yEnd)} min`; document.getElementById('yearCheckDays').innerText = `${getCheckDays(yStart, yEnd)} 天`;
}

export function renderTrendChart() {
  const ctx = document.getElementById('trendChart'); if (!ctx) return;
  const labels = []; const data = []; const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 6; i >= 0; i -= 1) { const d = new Date(today); d.setDate(today.getDate() - i); const dStr = formatDateToYMD(d.getTime()); labels.push(`${d.getMonth() + 1}/${d.getDate()}`); data.push(App.data.focusSessions.filter((s) => s.dateStr === dStr).reduce((sum, s) => sum + s.durationMinutes, 0)); }
  if (App.state.focusTrendChart) { App.state.focusTrendChart.data.labels = labels; App.state.focusTrendChart.data.datasets[0].data = data; App.state.focusTrendChart.update(); }
  else App.state.focusTrendChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: '理政分钟', data, borderColor: '#FF8C42', backgroundColor: 'rgba(255,140,66,0.2)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
}

export function renderCalendar() {
  const y = App.state.currentCalendarDate.getFullYear(); const m = App.state.currentCalendarDate.getMonth(); document.getElementById('calendarMonthYear').innerText = `${y}年${m + 1}月`;
  const grid = document.getElementById('calendarGrid'); grid.innerHTML = '';
  for (let i = 0; i < new Date(y, m, 1).getDay(); i += 1) grid.appendChild(document.createElement('div'));
  for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day += 1) {
    const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mins = App.data.focusSessions.filter((s) => s.dateStr === dStr).reduce((sum, s) => sum + s.durationMinutes, 0);
    const isToday = dStr === App.api.getTodayStr(); const tks = App.data.tasks.filter((t) => t.status === '议定' && formatDateToYMD(t.completedAt) === dStr);
    let bg = 'bg-gray-50 text-gray-500'; if (mins > 180) bg = 'bg-dopamine-orange text-white font-bold transform hover:scale-110'; else if (mins > 60) bg = 'bg-orange-300 text-white font-bold'; else if (mins > 0) bg = 'bg-orange-100 text-orange-700 font-bold';
    const cell = document.createElement('div'); cell.className = `aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border border-gray-100 ${bg} ${isToday ? 'ring-2 ring-dopamine-sky' : ''}`; cell.innerHTML = `<span>${day}</span>${tks.length > 0 ? '<span class="w-1 h-1 bg-green-500 rounded-full mt-1"></span>' : ''}`; cell.onclick = () => showDayDetail(dStr, mins, tks); grid.appendChild(cell);
  }
}

export function showDayDetail(dStr, mins, tks) {
  document.getElementById('dayDetailTitle').innerText = dStr; document.getElementById('detailFocusTime').innerText = `${mins} min`;
  document.getElementById('detailCompletedTasks').innerHTML = tks.length ? tks.map((t) => `<div class="bg-gray-50 p-2 rounded mb-1">✅ ${escapeHtml(t.name)}</div>`).join('') : '<div class="text-xs text-gray-400">无</div>';
  const pendingTasks = App.data.tasks.filter((t) => t.status === '在议');
  document.getElementById('detailPendingTasks').innerHTML = pendingTasks.length ? pendingTasks.map((t) => `<div class="bg-orange-50 p-2 rounded mb-1 border border-orange-100">⏳ ${escapeHtml(t.name)}</div>`).join('') : '<div class="text-xs text-gray-400">无</div>';
  document.getElementById('detailHabitRecords').innerHTML = renderHabitRecordsForDate(dStr);
  document.getElementById('dayDetailModal').classList.add('active');
}
