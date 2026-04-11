import { renderModals } from './modals.js';
import { renderHeader, renderDashboard } from './sections.js';

export function renderAppShell(root = document.body) {
  root.innerHTML = `
    <div id="imperialCourtOverlay" class="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center opacity-0 transition-opacity duration-500 hidden" style="background: radial-gradient(circle, rgba(100,30,0,0.9) 0%, rgba(0,0,0,0.95) 100%);"><div class="relative z-10 text-center flex flex-col items-center"><h1 class="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 mb-12 tracking-[0.2em] drop-shadow-[0_0_20px_rgba(253,224,71,0.6)]" style="font-family: '楷体', 'STKaiti', serif; text-shadow: 0 4px 10px rgba(0,0,0,0.8);">吾皇万岁万万岁</h1><div class="text-6xl md:text-8xl flex justify-center gap-6 animate-bowing">🙇‍♂️ 🙇🏻‍♂️ 🙇🏼‍♂️ 🙇🏽‍♂️ 🙇🏾‍♂️</div><div class="text-5xl md:text-7xl flex justify-center gap-8 mt-6 opacity-80 animate-bowing" style="animation-delay: 0.3s;">🙇🏻‍♂️ 🙇🏼‍♂️ 🙇🏽‍♂️ 🙇🏾‍♂️ 🙇🏿‍♂️</div></div></div>
    <div class="max-w-7xl mx-auto">
      ${renderHeader()}
      ${renderModals()}
      ${renderDashboard()}
      <div class="text-center text-gray-400 text-xs mt-8 pt-4 border-t border-dopamine-yellow/30 flex justify-center gap-3"><span><i class="far fa-save"></i> 史库自动存档</span><span>·</span><span><i class="fas fa-arrows-alt"></i> 支持拖动排序与满宽半宽并列</span><span>·</span><span><i class="far fa-smile"></i> 圣意起居相伴</span></div>
    </div>
  `;
}
