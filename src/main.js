import { App } from './core/app-context.js';
import { getTodayStr } from './core/utils.js';
import { loadData, bindAppDataStorageSync } from './core/storage.js';
import * as Focus from './modules/focus.js';
import * as Layout from './modules/layout.js';
import * as Routine from './modules/routine.js';
import * as Tasks from './modules/tasks.js';
import * as Habits from './modules/habits.js';
import * as Misc from './modules/ideas-mood-etc.js';
import * as CalendarStats from './modules/calendar-stats.js';
import * as Food from './modules/food.js';
import { renderAppShell } from './templates/app-shell.js';

Object.assign(App.api, {
  getTodayStr,
  ensureTabId: Focus.ensureTabId,
  renderAll,
  updateStatistics: CalendarStats.updateStatistics,
});

function renderAll() {
  document.getElementById('todayFocusMinutes').innerText = Focus.getTodayFocusMinutes();
  Routine.renderCheckDisplay();
  Tasks.renderTasks();
  Misc.renderIdeas();
  Habits.renderHabits();
  Food.renderFoods();
  CalendarStats.updateStatistics();
  Misc.updateMoodUI();
  Routine.updateStreakBadge();
  CalendarStats.renderCalendar();
  CalendarStats.renderTrendChart();
  Focus.updateFocusButtons();
}

function handleActionClick(target, event) {
  const actionEl = target.closest('[data-action]');
  if (!actionEl) return false;

  const { action } = actionEl.dataset;

  switch (action) {
    case 'toggle-layout-lock':
      Layout.toggleLayoutLock();
      return true;
    case 'export-data':
      Misc.exportData();
      return true;
    case 'close-habit-modal':
      Habits.closeHabitModal();
      return true;
    case 'save-habit':
      Habits.saveHabitFromModal();
      return true;
    case 'delete-habit':
      Habits.deleteHabitFromModal();
      return true;
    case 'close-habit-record-modal':
      Habits.closeHabitRecordModal();
      return true;
    case 'save-habit-record':
      Habits.saveHabitRecordFromModal();
      return true;
    case 'save-check-modal':
      Routine.saveCheckModal();
      return true;
    case 'close-task-modal':
      Tasks.closeTaskModal();
      return true;
    case 'cycle-task-modal-status':
      Tasks.cycleTaskModalStatus();
      return true;
    case 'add-tag-from-input':
      Tasks.addTagFromInput();
      return true;
    case 'add-subtask':
      Tasks.addSubtaskInput();
      return true;
    case 'toggle-task-markdown-editor':
      Tasks.toggleTaskMarkdownEditor();
      return true;
    case 'save-task':
      Tasks.saveTaskFromModal(actionEl.dataset.close !== 'false');
      return true;
    case 'delete-task-from-modal':
      Tasks.deleteTaskFromModal();
      return true;
    case 'toggle-module-size':
      Layout.toggleModuleSize(actionEl);
      return true;
    case 'check-time':
      Routine.checkTime(actionEl.dataset.period, actionEl.dataset.type, actionEl);
      return true;
    case 'open-check-modal':
      Routine.openCheckModal(actionEl.dataset.period);
      return true;
    case 'add-task':
      Tasks.addTask();
      return true;
    case 'add-idea':
      Misc.addIdea();
      return true;
    case 'open-habit-modal':
      Habits.openHabitModal(actionEl.dataset.habitId || '');
      return true;
    case 'open-ingredient-modal':
      Food.openIngredientModal(actionEl.dataset.ingredientId || '');
      return true;
    case 'close-ingredient-modal':
      Food.closeIngredientModal();
      return true;
    case 'save-ingredient':
      Food.saveIngredientFromModal();
      return true;
    case 'delete-ingredient':
      Food.deleteIngredientFromModal();
      return true;
    case 'open-food-record-modal':
      Food.openFoodRecordModal(actionEl.dataset.foodRecordId || '');
      return true;
    case 'close-food-record-modal':
      Food.closeFoodRecordModal();
      return true;
    case 'save-food-record':
      Food.saveFoodRecordFromModal();
      return true;
    case 'delete-food-record':
      Food.deleteFoodRecord(actionEl.dataset.foodRecordId);
      return true;
    case 'delete-food-record-from-modal':
      Food.deleteFoodRecordFromModal();
      return true;
    case 'open-task-modal':
      Tasks.openTaskModal(actionEl.dataset.taskId);
      return true;
    case 'cycle-task-status':
      Tasks.cycleTaskStatus(actionEl.dataset.taskId, event);
      return true;
    case 'delete-task':
      Tasks.deleteTask(actionEl.dataset.taskId, event);
      return true;
    case 'remove-subtask':
      Tasks.removeSubtaskInput(actionEl);
      return true;
    case 'quick-habit-punch':
      Habits.quickHabitPunch(actionEl.dataset.habitId);
      return true;
    case 'open-habit-record-modal':
      Habits.openHabitRecordModal(actionEl.dataset.habitId);
      return true;
    case 'delete-idea':
      Misc.deleteIdea(Number(actionEl.dataset.index));
      return true;
    default:
      return false;
  }
}

function handleActionChange(target) {
  const actionEl = target.closest('[data-action]');
  if (!actionEl) return false;

  const { action } = actionEl.dataset;

  switch (action) {
    case 'toggle-habit-checked':
      Habits.toggleHabitChecked(actionEl.dataset.habitId);
      return true;
    default:
      return false;
  }
}

function handleActionFocusOut(target) {
  const actionEl = target.closest('[data-action]');
  if (!actionEl) return false;

  if (actionEl.dataset.action === 'habit-inline-value') {
    Habits.updateHabitValueInline(actionEl.dataset.habitId, actionEl.value);
    return true;
  }

  return false;
}

function handleActionKeydown(target, event) {
  const actionEl = target.closest('[data-action]');
  if (!actionEl) return false;

  if (actionEl.dataset.action === 'habit-inline-value' && event.key === 'Enter') {
    event.preventDefault();
    actionEl.blur();
    return true;
  }

  return false;
}

function bindEvents() {
  document.getElementById('startFocusBtn').addEventListener('click', Focus.startFocus);
  document.getElementById('stopFocusBtn').addEventListener('click', Focus.stopFocus);
  document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') Tasks.addTask();
  });
  document.getElementById('ideaInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      Misc.addIdea();
    }
  });
  document.querySelectorAll('.mood-emoji').forEach((el) => {
    el.addEventListener('click', (e) => Misc.setMood(e.currentTarget.getAttribute('data-mood')));
  });
  document.querySelectorAll('.energy-btn').forEach((btn) => btn.addEventListener('click', (e) => {
    document.querySelectorAll('.energy-btn').forEach((b) => {
      b.classList.remove('ring-2', 'ring-dopamine-orange', 'bg-orange-50', 'text-dopamine-orange');
      b.classList.add('bg-gray-50', 'text-gray-600');
    });
    e.currentTarget.classList.remove('bg-gray-50', 'text-gray-600');
    e.currentTarget.classList.add('ring-2', 'ring-dopamine-orange', 'bg-orange-50', 'text-dopamine-orange');
    document.getElementById('checkModalEnergy').value = e.currentTarget.getAttribute('data-energy');
  }));

  document.getElementById('avatarTrigger').addEventListener('click', () => document.getElementById('avatarInput').click());
  document.getElementById('avatarInput').addEventListener('change', Misc.handleAvatarUpload);
  document.getElementById('importTrigger').addEventListener('click', () => document.getElementById('importInput').click());
  document.getElementById('importInput').addEventListener('change', Misc.importData);

  document.getElementById('viewMoodHistoryBtn').addEventListener('click', Misc.showMoodHistory);
  document.getElementById('viewTaskHistoryBtn').addEventListener('click', Tasks.showTaskHistory);
  document.getElementById('viewIdeaHistoryBtn').addEventListener('click', Misc.showIdeaHistory);
  document.querySelectorAll('.close-modal-btn').forEach((btn) => btn.addEventListener('click', Misc.closeModals));
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m) Misc.closeModals();
    });
  });

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    App.state.currentCalendarDate.setMonth(App.state.currentCalendarDate.getMonth() - 1);
    CalendarStats.renderCalendar();
  });
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    App.state.currentCalendarDate.setMonth(App.state.currentCalendarDate.getMonth() + 1);
    CalendarStats.renderCalendar();
  });

  document.getElementById('confirmPendingSettlementBtn').addEventListener('click', Focus.confirmPendingSettlement);
  document.getElementById('discardPendingSettlementBtn').addEventListener('click', Focus.discardPendingSettlement);
  document.getElementById('postponePendingSettlementBtn').addEventListener('click', Focus.postponePendingSettlement);
  document.getElementById('pendingSettlementCloseBtn').addEventListener('click', Focus.postponePendingSettlement);
  document.getElementById('pendingSettlementMinutesInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Focus.confirmPendingSettlement();
  });
  document.getElementById('pendingSettlementModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Focus.postponePendingSettlement();
  });

  document.getElementById('taskModalNoteMarkdown').addEventListener('input', Tasks.updateTaskMarkdownPreview);
  document.getElementById('taskTagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      Tasks.addTagFromInput();
    }
  });
  document.getElementById('taskModalTags').addEventListener('click', (e) => {
    const chip = e.target.closest('.task-tag-chip');
    if (chip) Tasks.toggleTagSelection(chip.dataset.tag || '');
  });
  document.getElementById('taskModalTags').addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.task-tag-chip');
    if (chip) {
      e.preventDefault();
      Tasks.deleteTagFromPool(chip.dataset.tag || '');
    }
  });
  document.getElementById('taskDetailModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Tasks.closeTaskModal();
  });
  document.getElementById('habitModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Habits.closeHabitModal();
  });
  document.getElementById('habitRecordModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Habits.closeHabitRecordModal();
  });
  document.getElementById('ingredientModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Food.closeIngredientModal();
  });
  document.getElementById('foodRecordModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) Food.closeFoodRecordModal();
  });
  document.getElementById('habitModalName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Habits.saveHabitFromModal();
  });
  document.getElementById('habitRecordModalValue').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Habits.saveHabitRecordFromModal();
  });
  document.getElementById('ingredientModalName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Food.saveIngredientFromModal();
  });
  document.getElementById('foodRecordModalName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') Food.saveFoodRecordFromModal();
  });

  document.addEventListener('click', (event) => {
    handleActionClick(event.target, event);
  });
  document.addEventListener('change', (event) => {
    handleActionChange(event.target);
  });
  document.addEventListener('focusout', (event) => {
    handleActionFocusOut(event.target);
  });
  document.addEventListener('keydown', (event) => {
    handleActionKeydown(event.target, event);
  });
}

function init() {
  renderAppShell();
  App.api.ensureTabId();
  loadData();
  Habits.hydrateHabitDays();
  Food.hydrateFoodDays();
  Misc.loadAvatar();
  bindEvents();
  Focus.bindFocusLifecycle();
  Focus.bindUserActivityTracker();
  bindAppDataStorageSync();
  Focus.bindPendingSettlementStorageSync();
  document.getElementById('currentDate').innerText = new Date().toLocaleDateString();
  renderAll();
  Layout.initDragAndDrop();
  Focus.tryTakeoverOnForeground();
  Focus.restoreFocusState();
  Focus.promptPendingFocusSettlementIfNeeded();
  setInterval(() => {
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString();
    renderAll();
  }, 60000);
}

init();
