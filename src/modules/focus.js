import { App } from '../core/app-context.js';
import { getTodayStr, formatDateToYMD } from '../core/utils.js';
import { saveData } from '../core/storage.js';

export function generateTabId() { return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
export function ensureTabId() {
  if (!App.state.currentTabId) {
    App.state.currentTabId = sessionStorage.getItem(App.constants.FOCUS_TAB_ID_KEY);
    if (!App.state.currentTabId) {
      App.state.currentTabId = generateTabId();
      sessionStorage.setItem(App.constants.FOCUS_TAB_ID_KEY, App.state.currentTabId);
    }
  }
  return App.state.currentTabId;
}
export function nowTs() { return Date.now(); }
export function normalizePendingSettlement(data) {
  if (!data || typeof data !== 'object' || !data.activeFocusStart) return null;
  return { activeFocusStart: data.activeFocusStart, lastUserActivityAt: data.lastUserActivityAt || data.activeFocusStart, suggestedMinutes: typeof data.suggestedMinutes === 'number' ? data.suggestedMinutes : 0, createdAt: data.createdAt || nowTs() };
}
export function savePendingSettlement(data) { const normalized = normalizePendingSettlement(data); if (normalized) localStorage.setItem(App.constants.FOCUS_PENDING_SETTLEMENT_KEY, JSON.stringify(normalized)); }
export function loadPendingSettlement() { const raw = localStorage.getItem(App.constants.FOCUS_PENDING_SETTLEMENT_KEY); if (!raw) return null; try { return normalizePendingSettlement(JSON.parse(raw)); } catch { return null; } }
export function clearPendingSettlement() { localStorage.removeItem(App.constants.FOCUS_PENDING_SETTLEMENT_KEY); }
export function normalizeRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object' || !runtime.mode || !runtime.activeFocusStart) return null;
  return { mode: runtime.mode, activeFocusStart: runtime.activeFocusStart, targetEndTime: runtime.targetEndTime || null, ownerTabId: runtime.ownerTabId || null, ownerHeartbeatAt: runtime.ownerHeartbeatAt || 0, updatedAt: runtime.updatedAt || 0, lastUserActivityAt: runtime.lastUserActivityAt || runtime.activeFocusStart };
}
export function saveFocusRuntime(state) {
  const normalized = normalizeRuntime({ ...state, ownerTabId: state.ownerTabId || ensureTabId(), ownerHeartbeatAt: state.ownerHeartbeatAt || nowTs(), updatedAt: nowTs(), lastUserActivityAt: state.lastUserActivityAt || state.activeFocusStart || nowTs() });
  localStorage.setItem(App.constants.FOCUS_RUNTIME_KEY, JSON.stringify(normalized));
}
export function loadFocusRuntime() { const raw = localStorage.getItem(App.constants.FOCUS_RUNTIME_KEY); if (!raw) return null; try { return normalizeRuntime(JSON.parse(raw)); } catch { return null; } }
export function clearFocusRuntime() { localStorage.removeItem(App.constants.FOCUS_RUNTIME_KEY); }
export function isRuntimeOwner(runtime) { return !!runtime && runtime.ownerTabId === ensureTabId(); }
export function isRuntimeStale(runtime) { return !runtime || nowTs() - (runtime.ownerHeartbeatAt || 0) > App.constants.FOCUS_STALE_MS; }
export function canTakeOverRuntime(runtime) { if (!runtime) return false; if (isRuntimeOwner(runtime)) return true; if (!runtime.ownerTabId) return true; return isRuntimeStale(runtime); }
export function takeoverRuntime(runtime) { if (!runtime) return null; const nextRuntime = { ...runtime, ownerTabId: ensureTabId(), ownerHeartbeatAt: nowTs(), updatedAt: nowTs() }; localStorage.setItem(App.constants.FOCUS_RUNTIME_KEY, JSON.stringify(nextRuntime)); return nextRuntime; }
export function isFreeFocusInactive(runtime) { if (!runtime || runtime.mode !== 'free') return false; const lastActivityAt = runtime.lastUserActivityAt || runtime.activeFocusStart || 0; return nowTs() - lastActivityAt >= App.constants.FOCUS_INACTIVITY_LIMIT_MS; }
export function markFreeFocusAsPendingSettlement(runtime) {
  if (!runtime || runtime.mode !== 'free' || loadPendingSettlement()) return;

  const lastActivityAt = runtime.lastUserActivityAt || runtime.activeFocusStart;
  const suggestedMinutes = Math.max(
    0,
    Math.floor((lastActivityAt - runtime.activeFocusStart) / 60000)
  );

  savePendingSettlement({
    activeFocusStart: runtime.activeFocusStart,
    lastUserActivityAt: lastActivityAt,
    suggestedMinutes,
    createdAt: nowTs(),
  });

  clearFocusRuntime();
  stopFocusHeartbeat();
  stopLocalFocusLoopOnly();
}
export function recordUserActivity(force = false) {
  const runtime = loadFocusRuntime();
  if (!runtime || runtime.mode !== 'free' || !isRuntimeOwner(runtime)) return;
  const now = nowTs();
  if (!force && now - App.state.lastUserActivityPersistAt < App.constants.USER_ACTIVITY_WRITE_THROTTLE_MS) return;
  App.state.lastUserActivityPersistAt = now;
  saveFocusRuntime({ ...runtime, ownerTabId: ensureTabId(), ownerHeartbeatAt: now, lastUserActivityAt: now });
}
export function bindUserActivityTracker() {
  const handler = () => recordUserActivity(false);
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((evt) => window.addEventListener(evt, handler, { passive: true }));
  window.addEventListener('focus', () => recordUserActivity(true));
}
export function saveFocusSessionWithCustomEnd(startTimestamp, endTimestamp, minutes) {
  App.data.focusSessions.push({ startTimestamp, endTimestamp, durationMinutes: minutes, dateStr: formatDateToYMD(startTimestamp) });
  saveData();
}
export function openPendingSettlementModal() {
  const pending = loadPendingSettlement(); if (!pending) return;
  document.getElementById('pendingSettlementStartText').innerText = new Date(pending.activeFocusStart).toLocaleString();
  document.getElementById('pendingSettlementLastActivityText').innerText = new Date(pending.lastUserActivityAt).toLocaleString();
  document.getElementById('pendingSettlementSuggestedText').innerText = `${pending.suggestedMinutes} 分钟`;
  document.getElementById('pendingSettlementMinutesInput').value = String(pending.suggestedMinutes);
  document.getElementById('pendingSettlementModal').classList.add('active');
  App.state.pendingSettlementModalOpen = true;
}
export function closePendingSettlementModal() { document.getElementById('pendingSettlementModal').classList.remove('active'); App.state.pendingSettlementModalOpen = false; }
export function promptPendingFocusSettlementIfNeeded() { const pending = loadPendingSettlement(); if (!pending || App.state.pendingSettlementModalOpen) return; openPendingSettlementModal(); }
export function confirmPendingSettlement() {
  const pending = loadPendingSettlement(); if (!pending) { closePendingSettlementModal(); return; }
  const raw = document.getElementById('pendingSettlementMinutesInput').value.trim(); const minutes = Math.floor(Number(raw));
  if (!raw || !Number.isFinite(minutes) || minutes < 0) { alert('请输入大于等于 0 的整数分钟数。'); return; }
  if (minutes === 0) { if (!confirm('输入 0 表示不保留这次自由理政记录，确定吗？')) return; clearPendingSettlement(); closePendingSettlementModal(); alert('📝 已放弃上一段自由理政记录。'); App.api.renderAll(); return; }
  const endTimestamp = pending.activeFocusStart + minutes * 60 * 1000; saveFocusSessionWithCustomEnd(pending.activeFocusStart, endTimestamp, minutes); clearPendingSettlement(); closePendingSettlementModal(); alert(`✅ 已补录上一段自由理政 ${minutes} 分钟。`); App.api.renderAll();
}
export function discardPendingSettlement() { const pending = loadPendingSettlement(); if (!pending) { closePendingSettlementModal(); return; } if (!confirm('确定放弃上一段自由理政记录吗？此操作不可恢复。')) return; clearPendingSettlement(); closePendingSettlementModal(); alert('🗑️ 已放弃上一段自由理政记录。'); App.api.renderAll(); }
export function postponePendingSettlement() { closePendingSettlementModal(); }
export function stopLocalFocusLoopOnly() {
  if (App.state.focusTimerInterval) { clearInterval(App.state.focusTimerInterval); App.state.focusTimerInterval = null; }
  App.state.activeFocusStart = null; App.state.currentFocusMode = 'free'; App.state.remainingSeconds = 0;
}
export function updateCountdownDisplay() { document.getElementById('countdownDisplay').innerText = `${Math.floor(App.state.remainingSeconds / 60).toString().padStart(2, '0')}:${(App.state.remainingSeconds % 60).toString().padStart(2, '0')}`; }
export function resetFocusUIToIdle() { stopLocalFocusLoopOnly(); document.getElementById('focusActiveState').innerHTML = '⏸️ 暂无专注'; document.getElementById('focusStatusBadge').classList.remove('timer-pulse'); document.getElementById('countdownDisplay').classList.add('hidden'); updateFocusButtons(); App.api.renderAll(); }
export function syncFocusUIFromRuntime() {
  const runtime = loadFocusRuntime();
  if (!runtime) { stopFocusHeartbeat(); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
  if (isFreeFocusInactive(runtime) && canTakeOverRuntime(runtime)) { markFreeFocusAsPendingSettlement(runtime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
  App.state.activeFocusStart = runtime.activeFocusStart; App.state.currentFocusMode = runtime.mode; document.getElementById('focusStatusBadge').classList.add('timer-pulse');
  if (runtime.mode === 'free') { document.getElementById('focusActiveState').innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 🔥 自由理政中...'; document.getElementById('countdownDisplay').classList.add('hidden'); }
  else { App.state.remainingSeconds = Math.max(0, Math.ceil((runtime.targetEndTime - nowTs()) / 1000)); document.getElementById('countdownDisplay').classList.remove('hidden'); updateCountdownDisplay(); document.getElementById('focusActiveState').innerHTML = `<i class="fas fa-spinner fa-pulse"></i> 🍅 ${parseInt(runtime.mode, 10)}分钟理政中...`; }
  updateFocusButtons(); App.api.renderAll();
}
export function heartbeatFocusRuntime() {
  const runtime = loadFocusRuntime(); if (!runtime) return;
  if (!isRuntimeOwner(runtime)) { stopFocusHeartbeat(); stopLocalFocusLoopOnly(); syncFocusUIFromRuntime(); return; }
  if (isFreeFocusInactive(runtime)) { markFreeFocusAsPendingSettlement(runtime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
  saveFocusRuntime({ ...runtime, ownerTabId: ensureTabId(), ownerHeartbeatAt: nowTs() });
}
export function startFocusHeartbeat() { stopFocusHeartbeat(); heartbeatFocusRuntime(); App.state.focusHeartbeatInterval = setInterval(heartbeatFocusRuntime, App.constants.FOCUS_HEARTBEAT_MS); }
export function stopFocusHeartbeat() { if (App.state.focusHeartbeatInterval) { clearInterval(App.state.focusHeartbeatInterval); App.state.focusHeartbeatInterval = null; } }
export function getTodayFocusMinutes() {
  let total = App.data.focusSessions.filter((s) => s.dateStr === getTodayStr()).reduce((sum, s) => sum + s.durationMinutes, 0);
  const runtime = loadFocusRuntime();
  if (runtime && runtime.activeFocusStart) {
    const startDateStr = formatDateToYMD(runtime.activeFocusStart);
    if (startDateStr === getTodayStr()) total += Math.floor((Date.now() - runtime.activeFocusStart) / 60000);
  }
  return total;
}
export function updateFocusButtons() {
  const startBtn = document.getElementById('startFocusBtn'); const stopBtn = document.getElementById('stopFocusBtn'); const modeSelect = document.getElementById('focusMode'); const runtime = loadFocusRuntime();
  const hasAnyRuntime = !!runtime; const amOwner = isRuntimeOwner(runtime);
  if (hasAnyRuntime) {
    startBtn.classList.add('opacity-50', 'cursor-not-allowed'); startBtn.disabled = true; modeSelect.disabled = true; modeSelect.classList.add('opacity-50');
    if (amOwner) { stopBtn.classList.remove('opacity-50', 'cursor-not-allowed'); stopBtn.disabled = false; } else { stopBtn.classList.add('opacity-50', 'cursor-not-allowed'); stopBtn.disabled = true; }
  } else {
    startBtn.classList.remove('opacity-50', 'cursor-not-allowed'); startBtn.disabled = false; stopBtn.classList.add('opacity-50', 'cursor-not-allowed'); stopBtn.disabled = true; modeSelect.disabled = false; modeSelect.classList.remove('opacity-50');
  }
}
export function tryTakeoverOnForeground() {
  if (document.visibilityState !== 'visible') return false;
  let runtime = loadFocusRuntime();
  if (!runtime) { syncFocusUIFromRuntime(); promptPendingFocusSettlementIfNeeded(); return false; }
  if (isFreeFocusInactive(runtime) && canTakeOverRuntime(runtime)) { markFreeFocusAsPendingSettlement(runtime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return true; }
  if (canTakeOverRuntime(runtime) && !isRuntimeOwner(runtime)) { runtime = takeoverRuntime(runtime); restoreFocusState(); return true; }
  syncFocusUIFromRuntime(); recordUserActivity(true); return false;
}
export function bindFocusStorageSync() {
  if (App.state.focusStorageListenerBound) return; App.state.focusStorageListenerBound = true;
  window.addEventListener('storage', (e) => {
    if (e.key !== App.constants.FOCUS_RUNTIME_KEY) return;
    if (!e.newValue) { syncFocusUIFromRuntime(); promptPendingFocusSettlementIfNeeded(); return; }
    if (document.visibilityState !== 'visible') { syncFocusUIFromRuntime(); return; }
    tryTakeoverOnForeground();
  });
}
export function bindPendingSettlementStorageSync() {
  window.addEventListener('storage', (e) => {
    if (e.key !== App.constants.FOCUS_PENDING_SETTLEMENT_KEY) return;
    if (!e.newValue) { if (App.state.pendingSettlementModalOpen) closePendingSettlementModal(); return; }
    try {
      const pending = normalizePendingSettlement(JSON.parse(e.newValue)); if (!pending) return;
      if (!App.state.pendingSettlementModalOpen) { openPendingSettlementModal(); return; }
      document.getElementById('pendingSettlementStartText').innerText = new Date(pending.activeFocusStart).toLocaleString();
      document.getElementById('pendingSettlementLastActivityText').innerText = new Date(pending.lastUserActivityAt).toLocaleString();
      document.getElementById('pendingSettlementSuggestedText').innerText = `${pending.suggestedMinutes} 分钟`;
      document.getElementById('pendingSettlementMinutesInput').value = String(pending.suggestedMinutes);
    } catch (err) { console.warn('待结算弹窗跨标签页同步失败：', err); }
  });
}
export function releaseFocusOwnershipOnUnload() {
  const runtime = loadFocusRuntime(); if (!runtime || !isRuntimeOwner(runtime)) return;
  const releasedRuntime = { ...runtime, ownerTabId: null, ownerHeartbeatAt: 0, updatedAt: nowTs() };
  try { localStorage.setItem(App.constants.FOCUS_RUNTIME_KEY, JSON.stringify(releasedRuntime)); } catch {}
}
export function bindFocusLifecycle() {
  bindFocusStorageSync(); window.addEventListener('beforeunload', releaseFocusOwnershipOnUnload);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tryTakeoverOnForeground(); });
  window.addEventListener('focus', () => tryTakeoverOnForeground());
  window.addEventListener('pageshow', () => tryTakeoverOnForeground());
}
export function startFreeModeLoop() {
  if (App.state.focusTimerInterval) clearInterval(App.state.focusTimerInterval);
  App.state.focusTimerInterval = setInterval(() => {
    const runtime = loadFocusRuntime();
    if (!runtime) { resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
    if (!isRuntimeOwner(runtime)) { stopLocalFocusLoopOnly(); syncFocusUIFromRuntime(); return; }
    if (isFreeFocusInactive(runtime)) { markFreeFocusAsPendingSettlement(runtime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
    App.api.renderAll();
  }, 1000);
}
export function saveFocusSession(minutes) { saveFocusSessionWithCustomEnd(App.state.activeFocusStart, Date.now(), minutes); }
export function startCountdownLoop() {
  if (App.state.focusTimerInterval) clearInterval(App.state.focusTimerInterval);
  function tick() {
    const runtime = loadFocusRuntime();
    if (!runtime || !runtime.targetEndTime) { resetFocusUIToIdle(); return; }
    if (!isRuntimeOwner(runtime)) { stopLocalFocusLoopOnly(); syncFocusUIFromRuntime(); return; }
    App.state.remainingSeconds = Math.max(0, Math.ceil((runtime.targetEndTime - Date.now()) / 1000)); updateCountdownDisplay();
    if (App.state.remainingSeconds <= 0) {
      stopFocusHeartbeat(); stopLocalFocusLoopOnly(); App.state.activeFocusStart = runtime.activeFocusStart;
      saveFocusSession(parseInt(runtime.mode, 10)); clearFocusRuntime(); resetFocusUIToIdle();
      alert(`🎉 陛下圣明！完成了 ${parseInt(runtime.mode, 10)} 分钟理政！请移步御花园小憩片刻～`);
    }
  }
  tick(); App.state.focusTimerInterval = setInterval(tick, 1000);
}
export function restoreFocusState() {
  let runtime = loadFocusRuntime();
  if (!runtime) { resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
  if (isFreeFocusInactive(runtime)) { if (canTakeOverRuntime(runtime)) { markFreeFocusAsPendingSettlement(runtime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); } else syncFocusUIFromRuntime(); return; }
  if (runtime.mode !== 'free' && runtime.targetEndTime && runtime.targetEndTime <= Date.now()) {
    if (canTakeOverRuntime(runtime)) {
      runtime = takeoverRuntime(runtime); App.state.activeFocusStart = runtime.activeFocusStart; saveFocusSessionWithCustomEnd(runtime.activeFocusStart, runtime.targetEndTime, parseInt(runtime.mode, 10)); clearFocusRuntime(); resetFocusUIToIdle(); alert(`🎉 恭迎陛下！检测到上一轮 ${parseInt(runtime.mode, 10)} 分钟理政议定，已为您载入史册。`);
    } else syncFocusUIFromRuntime();
    return;
  }
  if (canTakeOverRuntime(runtime)) runtime = takeoverRuntime(runtime); else if (!isRuntimeOwner(runtime)) { syncFocusUIFromRuntime(); return; }
  App.state.activeFocusStart = runtime.activeFocusStart; App.state.currentFocusMode = runtime.mode; document.getElementById('focusStatusBadge').classList.add('timer-pulse'); updateFocusButtons();
  if (runtime.mode === 'free') { document.getElementById('focusActiveState').innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 🔥 自由理政中...'; document.getElementById('countdownDisplay').classList.add('hidden'); startFocusHeartbeat(); startFreeModeLoop(); App.api.renderAll(); return; }
  document.getElementById('countdownDisplay').classList.remove('hidden'); document.getElementById('focusActiveState').innerHTML = `<i class="fas fa-spinner fa-pulse"></i> 🍅 ${parseInt(runtime.mode, 10)}分钟理政中...`; startFocusHeartbeat(); startCountdownLoop(); App.api.renderAll();
}
export function resetFocusUI() { stopFocusHeartbeat(); resetFocusUIToIdle(); }
export function startFocus() {
  if (loadPendingSettlement()) { promptPendingFocusSettlementIfNeeded(); if (loadPendingSettlement()) { alert('⚠️ 陛下还有上一段自由理政尚未结算，请先补录、放弃，或选择稍后再说后暂不开始新的理政。'); return; } }
  const existingRuntime = loadFocusRuntime();
  if (existingRuntime) {
    if (isFreeFocusInactive(existingRuntime) && canTakeOverRuntime(existingRuntime)) { markFreeFocusAsPendingSettlement(existingRuntime); resetFocusUIToIdle(); promptPendingFocusSettlementIfNeeded(); return; }
    if (canTakeOverRuntime(existingRuntime)) { restoreFocusState(); return; }
    alert('👀 陛下，您已在理政中...'); syncFocusUIFromRuntime(); return;
  }
  const courtOverlay = document.getElementById('imperialCourtOverlay'); courtOverlay.classList.remove('hidden'); setTimeout(() => courtOverlay.classList.add('court-active'), 10); setTimeout(() => { courtOverlay.classList.remove('court-active'); setTimeout(() => courtOverlay.classList.add('hidden'), 500); }, 3000);
  App.state.currentFocusMode = document.getElementById('focusMode').value; App.state.activeFocusStart = Date.now(); document.getElementById('focusStatusBadge').classList.add('timer-pulse');
  if (App.state.currentFocusMode === 'free') {
    document.getElementById('focusActiveState').innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 🔥 自由理政中...'; document.getElementById('countdownDisplay').classList.add('hidden'); saveFocusRuntime({ mode: 'free', activeFocusStart: App.state.activeFocusStart, ownerTabId: ensureTabId(), lastUserActivityAt: App.state.activeFocusStart }); App.state.lastUserActivityPersistAt = App.state.activeFocusStart; startFocusHeartbeat(); startFreeModeLoop();
  } else {
    const durationMinutes = parseInt(App.state.currentFocusMode, 10); const targetEndTime = App.state.activeFocusStart + durationMinutes * 60 * 1000; document.getElementById('countdownDisplay').classList.remove('hidden'); document.getElementById('focusActiveState').innerHTML = `<i class="fas fa-spinner fa-pulse"></i> 🍅 ${durationMinutes}分钟理政中...`; saveFocusRuntime({ mode: App.state.currentFocusMode, activeFocusStart: App.state.activeFocusStart, targetEndTime, ownerTabId: ensureTabId(), lastUserActivityAt: App.state.activeFocusStart }); startFocusHeartbeat(); startCountdownLoop();
  }
  updateFocusButtons(); App.api.renderAll();
}
export function stopFocus() {
  const runtime = loadFocusRuntime(); if (!runtime) { alert('👀 陛下当前未在理政哦，请先点击「开始」！'); resetFocusUIToIdle(); return; }
  if (!isRuntimeOwner(runtime)) { alert('⚠️ 本次理政由别的史官负责记录，请你先联系当值史官完成入账。'); syncFocusUIFromRuntime(); return; }
  App.state.activeFocusStart = runtime.activeFocusStart; App.state.currentFocusMode = runtime.mode;
  const actualMinutes = Math.floor((Date.now() - App.state.activeFocusStart) / 60000);
  if (App.state.currentFocusMode !== 'free' && runtime.targetEndTime && Date.now() < runtime.targetEndTime) {
    if (!confirm('⚠️ 番茄钟尚未结束，陛下确定要提前退朝吗？（满1分钟才会记录史册）')) return;
  }
  if (actualMinutes > 0) { saveFocusSession(actualMinutes); alert(`✅ 陛下圣明！已成功将陛下 ${actualMinutes} 分钟的辛劳载入史册，功在千秋！`); } else { alert('⚠️ 本次理政不足 1 分钟，未能生成有效记录。陛下再接再厉！'); }
  clearFocusRuntime(); resetFocusUIToIdle();
}
