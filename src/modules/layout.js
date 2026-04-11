import { App } from '../core/app-context.js';
let dragSrcEl = null;

export function toggleLayoutLock() {
  App.state.isLayoutLocked = !App.state.isLayoutLocked;
  updateLayoutButton();
  saveLayout();
}

export function toggleModuleSize(btnElement) {
  if (App.state.isLayoutLocked) return;
  const moduleEl = btnElement.closest('.draggable-module');
  if (moduleEl.classList.contains('lg:col-span-2')) { moduleEl.classList.remove('lg:col-span-2'); moduleEl.classList.add('lg:col-span-1'); }
  else { moduleEl.classList.remove('lg:col-span-1'); moduleEl.classList.add('lg:col-span-2'); }
  saveLayout();
}

export function saveLayout() {
  const layoutData = { locked: App.state.isLayoutLocked, modules: Array.from(document.getElementById('dashboard-container').children).map((el) => ({ id: el.id, isFullWidth: el.classList.contains('lg:col-span-2') })) };
  localStorage.setItem(App.constants.LAYOUT_KEY, JSON.stringify(layoutData));
}

function updateLayoutButton() {
  const btn = document.getElementById('layoutLockBtn'); const container = document.getElementById('dashboard-container');
  if (App.state.isLayoutLocked) { btn.innerHTML = '<i class="fas fa-lock"></i> 阵法已锁定'; btn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full border border-gray-300 transition flex items-center gap-1 shadow-sm font-medium'; container.classList.remove('edit-mode'); }
  else { btn.innerHTML = '<i class="fas fa-unlock text-dopamine-orange"></i> 阵法调整中...'; btn.className = 'bg-orange-50 hover:bg-orange-100 text-dopamine-orange text-xs px-3 py-1.5 rounded-full border border-dopamine-orange/50 transition flex items-center gap-1 shadow-sm font-medium animate-pulse'; container.classList.add('edit-mode'); }
}

export function loadLayout() {
  const storedOrder = localStorage.getItem(App.constants.LAYOUT_KEY);
  if (storedOrder) {
    try {
      const parsed = JSON.parse(storedOrder); App.state.isLayoutLocked = parsed.locked !== undefined ? parsed.locked : true;
      const container = document.getElementById('dashboard-container');
      if (parsed.modules && Array.isArray(parsed.modules)) parsed.modules.forEach((m) => { const el = document.getElementById(m.id); if (el) { container.appendChild(el); if (m.isFullWidth) { el.classList.remove('lg:col-span-1'); el.classList.add('lg:col-span-2'); } else { el.classList.remove('lg:col-span-2'); el.classList.add('lg:col-span-1'); } } });
    } catch {}
  }
  updateLayoutButton();
}

export function initDragAndDrop() {
  const container = document.getElementById('dashboard-container');
  const modules = document.querySelectorAll('.draggable-module');
  const handles = document.querySelectorAll('.drag-handle');
  handles.forEach((handle) => {
    handle.addEventListener('mousedown', (e) => { if (App.state.isLayoutLocked) return; const card = e.target.closest('.draggable-module'); if (card) card.setAttribute('draggable', 'true'); });
    handle.addEventListener('mouseup', (e) => { const card = e.target.closest('.draggable-module'); if (card) card.setAttribute('draggable', 'false'); });
    handle.addEventListener('mouseleave', (e) => { const card = e.target.closest('.draggable-module'); if (card) card.setAttribute('draggable', 'false'); });
  });
  modules.forEach((module) => {
    module.addEventListener('dragstart', function (e) { if (App.state.isLayoutLocked) { e.preventDefault(); return; } dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.style.opacity = '0.4', 0); });
    module.addEventListener('dragover', function (e) { if (App.state.isLayoutLocked) return true; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; });
    module.addEventListener('dragenter', function (e) { if (App.state.isLayoutLocked) return; e.preventDefault(); this.classList.add('drop-target'); });
    module.addEventListener('dragleave', function () { if (App.state.isLayoutLocked) return; this.classList.remove('drop-target'); });
    module.addEventListener('drop', function (e) { if (App.state.isLayoutLocked) return; e.preventDefault(); e.stopPropagation(); this.classList.remove('drop-target'); if (dragSrcEl !== this) { const allItems = Array.from(container.children); if (allItems.indexOf(dragSrcEl) < allItems.indexOf(this)) this.after(dragSrcEl); else this.before(dragSrcEl); saveLayout(); } return false; });
    module.addEventListener('dragend', function () { this.style.opacity = '1'; modules.forEach((m) => { m.classList.remove('drop-target'); m.setAttribute('draggable', 'false'); }); });
  });
  loadLayout();
}
