import { App } from './app-context.js';

export function buildDefaultAppData() {
  return {
    tasks: [{ id: Date.now() + 1, name: '阅读核心文献', category: '📚 文献', priority: 'high', status: '待议', tags: ['文献'], createdAt: Date.now(), completedAt: null }],
    focusSessions: [],
    checkRecords: {},
    ideas: [],
    moodHistory: {},
    tagPool: ['文献', '实验', '写作'],
    habitDefs: [],
    habitRecords: {},
    ingredientDefs: [],
    foodRecords: {},
  };
}

export function initDefault() { App.data = buildDefaultAppData(); }

function normalizeIngredientType(type) {
  return ['coffee', 'tea', 'herbal', 'other'].includes(type) ? type : 'other';
}

function normalizeFoodCategory(category) {
  return ['drink', 'food', 'supplement', 'other'].includes(category) ? category : 'drink';
}

export function normalizeAppData(raw) {
  const base = {
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
    focusSessions: Array.isArray(raw?.focusSessions) ? raw.focusSessions : [],
    checkRecords: raw?.checkRecords && typeof raw.checkRecords === 'object' ? raw.checkRecords : {},
    ideas: Array.isArray(raw?.ideas) ? raw.ideas : (Array.isArray(raw?.foods) ? raw.foods : []),
    moodHistory: raw?.moodHistory && typeof raw.moodHistory === 'object' ? raw.moodHistory : {},
    tagPool: Array.isArray(raw?.tagPool) ? raw.tagPool : [],
    habitDefs: Array.isArray(raw?.habitDefs) ? raw.habitDefs : [],
    habitRecords: raw?.habitRecords && typeof raw?.habitRecords === 'object' ? raw?.habitRecords : {},
    ingredientDefs: Array.isArray(raw?.ingredientDefs) ? raw.ingredientDefs : [],
    foodRecords: raw?.foodRecords && typeof raw?.foodRecords === 'object' ? raw.foodRecords : {},
  };

  base.tasks.forEach((t, idx) => {
    if (!t.id) t.id = Date.now() + idx;
    if (!t.name) t.name = '未命名计划';
    if (typeof t.startDate !== 'string') t.startDate = '';
    if (typeof t.dueDate !== 'string') t.dueDate = '';
    if (!Array.isArray(t.subtasks)) t.subtasks = [];
    t.subtasks = t.subtasks.map((st, sIdx) => ({ id: st?.id || Date.now() + idx * 100 + sIdx, text: typeof st?.text === 'string' ? st.text : '', done: !!st?.done }));
    if (!t.status) t.status = '待议';
    if (!t.priority) t.priority = 'medium';
    if (!Array.isArray(t.tags)) t.tags = [];
    t.tags = [...new Set(t.tags.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean))];
    if (typeof t.noteMarkdown !== 'string') t.noteMarkdown = '';
    if (!('createdAt' in t)) t.createdAt = Date.now();
    if (!('completedAt' in t)) t.completedAt = null;
  });

  const mergedTags = [...base.tagPool, ...base.tasks.flatMap((t) => Array.isArray(t.tags) ? t.tags : [])];
  base.tagPool = [...new Set(mergedTags.map((tag) => typeof tag === 'string' ? tag.trim() : '').filter(Boolean))];

  base.habitDefs = base.habitDefs.map((h, idx) => ({
    id: h?.id || `habit_${Date.now()}_${idx}`,
    name: typeof h?.name === 'string' && h.name.trim() ? h.name.trim() : '未命名习惯',
    unit: typeof h?.unit === 'string' ? h.unit.trim() : '',
    targetValue: h?.targetValue === '' || h?.targetValue == null || !Number.isFinite(Number(h?.targetValue)) ? null : Number(h.targetValue),
  }));

  Object.keys(base.habitRecords).forEach((dateStr) => {
    const dayRecords = base.habitRecords[dateStr];
    if (!dayRecords || typeof dayRecords !== 'object') {
      base.habitRecords[dateStr] = {};
      return;
    }
    Object.keys(dayRecords).forEach((habitId) => {
      const record = dayRecords[habitId] || {};
      base.habitRecords[dateStr][habitId] = {
        value: record.value == null || record.value === '' || !Number.isFinite(Number(record.value)) ? 0 : Number(record.value),
        checked: !!record.checked,
        updatedAt: record.updatedAt || 0,
      };
    });
  });

  base.ingredientDefs = base.ingredientDefs.map((item, idx) => ({
    id: item?.id || `ingredient_${Date.now()}_${idx}`,
    name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : '未命名饮子',
    type: normalizeIngredientType(item?.type),
    category: typeof item?.category === 'string' ? item.category.trim() : '',
    brand: typeof item?.brand === 'string' ? item.brand.trim() : '',
    origin: typeof item?.origin === 'string' ? item.origin.trim() : '',
    process: typeof item?.process === 'string' ? item.process.trim() : '',
    roastLevel: typeof item?.roastLevel === 'string' ? item.roastLevel.trim() : '',
    flavor: typeof item?.flavor === 'string' ? item.flavor.trim() : '',
    status: typeof item?.status === 'string' ? item.status.trim() : '在饮',
    note: typeof item?.note === 'string' ? item.note : '',
  }));

  Object.keys(base.foodRecords).forEach((dateStr) => {
    const records = Array.isArray(base.foodRecords[dateStr]) ? base.foodRecords[dateStr] : [];
    base.foodRecords[dateStr] = records.map((record, idx) => ({
      id: record?.id || `food_${Date.now()}_${idx}`,
      time: typeof record?.time === 'string' ? record.time : '',
      category: normalizeFoodCategory(record?.category),
      name: typeof record?.name === 'string' && record.name.trim() ? record.name.trim() : '未命名记录',
      amount: record?.amount === '' || record?.amount == null || !Number.isFinite(Number(record?.amount)) ? '' : Number(record.amount),
      unit: typeof record?.unit === 'string' ? record.unit.trim() : '',
      ingredientId: typeof record?.ingredientId === 'string' ? record.ingredientId : '',
      note: typeof record?.note === 'string' ? record.note : '',
      createdAt: record?.createdAt || Date.now(),
    }));
  });

  return base;
}

export function extractStoredAppDataPayload(parsed) {
  if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') {
    return { data: normalizeAppData(parsed.data), meta: { updatedAt: parsed._meta?.updatedAt || 0, sourceTabId: parsed._meta?.sourceTabId || null } };
  }
  return { data: normalizeAppData(parsed || {}), meta: { updatedAt: 0, sourceTabId: null } };
}

export function saveData() {
  const payload = { data: App.data, _meta: { updatedAt: Date.now(), sourceTabId: App.api.ensureTabId() } };
  App.state.lastAppliedAppDataMeta = payload._meta;
  localStorage.setItem(App.constants.APP_DATA_KEY, JSON.stringify(payload));
}

export function loadData() {
  const stored = localStorage.getItem(App.constants.APP_DATA_KEY);
  if (!stored) {
    initDefault();
    saveData();
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    const payload = extractStoredAppDataPayload(parsed);
    App.data = payload.data;
    App.state.lastAppliedAppDataMeta = payload.meta;
    if (!parsed.data || !parsed._meta) saveData();
  } catch {
    initDefault();
    saveData();
  }
}

export function bindAppDataStorageSync() {
  window.addEventListener('storage', (e) => {
    if (e.key !== App.constants.APP_DATA_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      const payload = extractStoredAppDataPayload(parsed);
      if (payload.meta.sourceTabId === App.api.ensureTabId() && payload.meta.updatedAt === App.state.lastAppliedAppDataMeta.updatedAt) return;
      const incomingIsNewer = payload.meta.updatedAt > (App.state.lastAppliedAppDataMeta.updatedAt || 0)
        || (payload.meta.updatedAt === (App.state.lastAppliedAppDataMeta.updatedAt || 0) && payload.meta.sourceTabId !== App.api.ensureTabId());
      if (!incomingIsNewer) return;
      App.data = payload.data;
      App.state.lastAppliedAppDataMeta = payload.meta;
      App.api.renderAll();
    } catch (err) {
      console.warn('appData 跨标签页同步失败：', err);
    }
  });
}
