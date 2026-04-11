import { App } from '../core/app-context.js';
import { getTodayStr, escapeHtml } from '../core/utils.js';
import { saveData } from '../core/storage.js';

export function getTodayFoodRecords() {
  const today = getTodayStr();
  if (!Array.isArray(App.data.foodRecords[today])) App.data.foodRecords[today] = [];
  return App.data.foodRecords[today];
}

export function hydrateFoodDays() {
  if (!App.data.foodRecords || typeof App.data.foodRecords !== 'object') App.data.foodRecords = {};
  if (!Array.isArray(App.data.ingredientDefs)) App.data.ingredientDefs = [];
  getTodayFoodRecords();
}

export function getIngredientById(id) {
  return App.data.ingredientDefs.find((item) => String(item.id) === String(id));
}

export function getFoodRecordById(id, dateStr = getTodayStr()) {
  const records = App.data.foodRecords?.[dateStr] || [];
  return records.find((item) => String(item.id) === String(id));
}

export function getIngredientTypeMeta(type) {
  if (type === 'coffee') return { label: '咖啡', chipClass: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (type === 'tea') return { label: '茶', chipClass: 'bg-green-50 text-green-700 border-green-100' };
  if (type === 'herbal') return { label: '花草', chipClass: 'bg-lime-50 text-lime-700 border-lime-100' };
  return { label: '其他', chipClass: 'bg-slate-50 text-slate-600 border-slate-200' };
}

export function getFoodCategoryMeta(category) {
  if (category === 'food') return { label: '膳食', chipClass: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (category === 'supplement') return { label: '补剂', chipClass: 'bg-violet-50 text-violet-700 border-violet-100' };
  if (category === 'other') return { label: '其他', chipClass: 'bg-slate-50 text-slate-600 border-slate-200' };
  return { label: '饮子', chipClass: 'bg-sky-50 text-sky-700 border-sky-100' };
}

function getTodaySummary() {
  const records = getTodayFoodRecords();
  const drinkCount = records.filter((item) => item.category === 'drink').length;
  const foodCount = records.filter((item) => item.category === 'food').length;
  const linkedCount = records.filter((item) => item.ingredientId && getIngredientById(item.ingredientId)).length;
  return { total: records.length, drinkCount, foodCount, linkedCount };
}

export function renderIngredientOptions(selectedId = '') {
  const options = ['<option value="">不关联饮子</option>'];
  const list = [...(App.data.ingredientDefs || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'));
  list.forEach((item) => {
    const meta = getIngredientTypeMeta(item.type);
    options.push(`<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(meta.label)}</option>`);
  });
  return options.join('');
}

export function renderIngredientsPanel() {
  const list = document.getElementById('ingredientList');
  if (!list) return;
  const items = [...(App.data.ingredientDefs || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'));
  if (!items.length) {
    list.innerHTML = '<div class="text-xs text-gray-400 py-3">还没有饮子，先记一个茶叶或咖啡吧。</div>';
    return;
  }
  list.innerHTML = items.map((item) => {
    const meta = getIngredientTypeMeta(item.type);
    const subLine = [item.category, item.brand, item.origin].filter(Boolean).join(' · ');
    const detailLine = [item.process, item.roastLevel, item.status].filter(Boolean).join(' · ');
    return `<button type="button" class="ingredient-mini-card w-full text-left" data-action="open-ingredient-modal" data-ingredient-id="${escapeHtml(item.id)}"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="font-semibold text-gray-800 truncate">${escapeHtml(item.name)}</div><div class="text-[11px] text-gray-500 mt-1 truncate">${escapeHtml(subLine || '未补充类别/品牌/产地')}</div>${detailLine ? `<div class="text-[11px] text-gray-400 mt-1 truncate">${escapeHtml(detailLine)}</div>` : ''}</div><span class="inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold flex-shrink-0 ${meta.chipClass}">${escapeHtml(meta.label)}</span></div></button>`;
  }).join('');
}

export function renderFoods() {
  hydrateFoodDays();
  const summary = getTodaySummary();
  const totalEl = document.getElementById('foodSummaryTotal');
  const drinkEl = document.getElementById('foodSummaryDrink');
  const linkedEl = document.getElementById('foodSummaryLinked');
  if (totalEl) totalEl.innerText = String(summary.total);
  if (drinkEl) drinkEl.innerText = String(summary.drinkCount);
  if (linkedEl) linkedEl.innerText = String(summary.linkedCount);

  const body = document.getElementById('foodTableBody');
  const empty = document.getElementById('emptyFoodHint');
  if (!body || !empty) return;
  const records = [...getTodayFoodRecords()].sort((a, b) => {
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  if (!records.length) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    body.innerHTML = records.map((item) => {
      const categoryMeta = getFoodCategoryMeta(item.category);
      const ingredient = item.ingredientId ? getIngredientById(item.ingredientId) : null;
      return `<tr class="border-b border-amber-100/70 hover:bg-amber-50/40 transition"><td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${escapeHtml(item.time || '--:--')}</td><td class="px-3 py-2"><span class="inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold ${categoryMeta.chipClass}">${escapeHtml(categoryMeta.label)}</span></td><td class="px-3 py-2 text-sm font-medium text-gray-800">${escapeHtml(item.name)}</td><td class="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">${item.amount === '' ? '-' : escapeHtml(String(item.amount))}${item.unit ? ` ${escapeHtml(item.unit)}` : ''}</td><td class="px-3 py-2 text-sm text-gray-600">${ingredient ? escapeHtml(ingredient.name) : '<span class="text-gray-300">-</span>'}</td><td class="px-3 py-2 text-sm text-gray-500 max-w-[180px]"><div class="truncate" title="${escapeHtml(item.note || '')}">${escapeHtml(item.note || '-')}</div></td><td class="px-3 py-2"><div class="flex items-center gap-1"><button type="button" class="food-table-icon-btn" data-action="open-food-record-modal" data-food-record-id="${escapeHtml(item.id)}" title="编辑记录"><i class="fas fa-pen"></i></button><button type="button" class="food-table-icon-btn danger" data-action="delete-food-record" data-food-record-id="${escapeHtml(item.id)}" title="删除记录"><i class="fas fa-trash"></i></button></div></td></tr>`;
    }).join('');
  }

  renderIngredientsPanel();
}

export function openIngredientModal(id = '') {
  const item = id ? getIngredientById(id) : null;
  document.getElementById('ingredientModalTitle').innerText = item ? '编辑饮子' : '新增饮子';
  document.getElementById('ingredientModalId').value = item?.id || '';
  document.getElementById('ingredientModalName').value = item?.name || '';
  document.getElementById('ingredientModalType').value = item?.type || 'tea';
  document.getElementById('ingredientModalCategory').value = item?.category || '';
  document.getElementById('ingredientModalBrand').value = item?.brand || '';
  document.getElementById('ingredientModalOrigin').value = item?.origin || '';
  document.getElementById('ingredientModalProcess').value = item?.process || '';
  document.getElementById('ingredientModalRoastLevel').value = item?.roastLevel || '';
  document.getElementById('ingredientModalStatus').value = item?.status || '在饮';
  document.getElementById('ingredientModalFlavor').value = item?.flavor || '';
  document.getElementById('ingredientModalNote').value = item?.note || '';
  document.getElementById('ingredientModalDeleteBtn').classList.toggle('hidden', !item);
  document.getElementById('ingredientModal').classList.add('active');
}

export function closeIngredientModal() {
  document.getElementById('ingredientModal').classList.remove('active');
}

export function saveIngredientFromModal() {
  const id = document.getElementById('ingredientModalId').value;
  const name = document.getElementById('ingredientModalName').value.trim();
  const type = document.getElementById('ingredientModalType').value;
  const category = document.getElementById('ingredientModalCategory').value.trim();
  const brand = document.getElementById('ingredientModalBrand').value.trim();
  const origin = document.getElementById('ingredientModalOrigin').value.trim();
  const process = document.getElementById('ingredientModalProcess').value.trim();
  const roastLevel = document.getElementById('ingredientModalRoastLevel').value.trim();
  const flavor = document.getElementById('ingredientModalFlavor').value.trim();
  const status = document.getElementById('ingredientModalStatus').value.trim() || '在饮';
  const note = document.getElementById('ingredientModalNote').value.trim();
  if (!name) {
    alert('饮子名称不能为空。');
    return;
  }
  if (id) {
    const target = getIngredientById(id);
    if (!target) return;
    Object.assign(target, { name, type, category, brand, origin, process, roastLevel, flavor, status, note });
  } else {
    App.data.ingredientDefs.push({ id: `ingredient_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, type, category, brand, origin, process, roastLevel, flavor, status, note });
  }
  saveData();
  renderFoods();
  closeIngredientModal();
}

export function deleteIngredientFromModal() {
  const id = document.getElementById('ingredientModalId').value;
  const target = getIngredientById(id);
  if (!target) return;
  if (!confirm(`确定删除“${target.name}”吗？已关联的今日记录会保留，但不再显示关联项。`)) return;
  App.data.ingredientDefs = App.data.ingredientDefs.filter((item) => String(item.id) !== String(id));
  saveData();
  renderFoods();
  closeIngredientModal();
}

export function openFoodRecordModal(id = '') {
  const record = id ? getFoodRecordById(id) : null;
  document.getElementById('foodRecordModalTitle').innerText = record ? '编辑今日饮馔' : '新增今日饮馔';
  document.getElementById('foodRecordModalId').value = record?.id || '';
  document.getElementById('foodRecordModalTime').value = record?.time || '';
  document.getElementById('foodRecordModalCategory').value = record?.category || 'drink';
  document.getElementById('foodRecordModalName').value = record?.name || '';
  document.getElementById('foodRecordModalAmount').value = record?.amount === '' || record?.amount == null ? '' : String(record.amount);
  document.getElementById('foodRecordModalUnit').value = record?.unit || '';
  document.getElementById('foodRecordModalIngredientId').innerHTML = renderIngredientOptions(record?.ingredientId || '');
  document.getElementById('foodRecordModalNote').value = record?.note || '';
  document.getElementById('foodRecordModalDeleteBtn').classList.toggle('hidden', !record);
  document.getElementById('foodRecordModal').classList.add('active');
}

export function closeFoodRecordModal() {
  document.getElementById('foodRecordModal').classList.remove('active');
}

export function saveFoodRecordFromModal() {
  const id = document.getElementById('foodRecordModalId').value;
  const time = document.getElementById('foodRecordModalTime').value;
  const category = document.getElementById('foodRecordModalCategory').value;
  const name = document.getElementById('foodRecordModalName').value.trim();
  const rawAmount = document.getElementById('foodRecordModalAmount').value.trim();
  const amount = rawAmount === '' ? '' : Number(rawAmount);
  const unit = document.getElementById('foodRecordModalUnit').value.trim();
  const ingredientId = document.getElementById('foodRecordModalIngredientId').value;
  const note = document.getElementById('foodRecordModalNote').value.trim();
  if (!name) {
    alert('名称不能为空。');
    return;
  }
  if (rawAmount !== '' && (!Number.isFinite(amount) || amount < 0)) {
    alert('数量需要是大于等于 0 的数字。');
    return;
  }
  const todayRecords = getTodayFoodRecords();
  if (id) {
    const target = getFoodRecordById(id);
    if (!target) return;
    Object.assign(target, { time, category, name, amount, unit, ingredientId, note });
  } else {
    todayRecords.push({ id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, time, category, name, amount, unit, ingredientId, note, createdAt: Date.now() });
  }
  saveData();
  renderFoods();
  closeFoodRecordModal();
}

export function deleteFoodRecord(id) {
  const target = getFoodRecordById(id);
  if (!target) return;
  if (!confirm(`确定删除“${target.name}”这条记录吗？`)) return;
  const today = getTodayStr();
  App.data.foodRecords[today] = getTodayFoodRecords().filter((item) => String(item.id) !== String(id));
  saveData();
  renderFoods();
}

export function deleteFoodRecordFromModal() {
  const id = document.getElementById('foodRecordModalId').value;
  if (!id) return;
  deleteFoodRecord(id);
  closeFoodRecordModal();
}
