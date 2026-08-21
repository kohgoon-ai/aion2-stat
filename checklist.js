const $ = id => document.getElementById(id);
const STORAGE_KEY = 'aion2-checklist-v2';

// 그룹 구성 · 기본 항목은 aion2tool.com 숙제 페이지 실제 목록 참고 (비공식, 공식 확정 아님)
const GROUP_DEFS = [
  { key: 'daily', label: '일일 리셋', schedule: { type: 'daily' }, items: ['사명 의뢰', '슈고페스타', '악몽'] },
  { key: 'weekly', label: '주간 리셋', schedule: { type: 'weekly' }, items: ['일일 던전', '각성전'] },
  { key: 'charge', label: '충전형 (5시·17시)', schedule: { type: 'multiDaily', hours: [5, 17] }, items: ['원정 - 정복', '초월'] },
  { key: 'abyss', label: '요일 지정 리셋 (화·목·토 21시)', schedule: { type: 'weekdays', days: [2, 4, 6], hour: 21 }, items: ['어비스 회랑 (하층)', '어비스 회랑 (중층)'] },
];

let uidCounter = 1;
const nextId = () => 'i' + (uidCounter++) + '-' + Date.now().toString(36);
const makeTasks = texts => texts.map(text => ({ id: nextId(), text, done: false }));

function defaultState() {
  const groups = {};
  GROUP_DEFS.forEach(g => { groups[g.key] = { items: makeTasks(g.items), resetAt: 0 }; });
  return { groups, settings: { dailyHour: 6, weeklyDay: 3, weeklyHour: 6 } };
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* 프라이빗 모드 등 */ }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.groups) {
        // 새 그룹이 추가된 버전 업데이트 대비: 없는 그룹은 기본값으로 채움
        GROUP_DEFS.forEach(g => { if (!parsed.groups[g.key]) parsed.groups[g.key] = { items: makeTasks(g.items), resetAt: 0 }; });
        if (!parsed.settings) parsed.settings = { dailyHour: 6, weeklyDay: 3, weeklyHour: 6 };
        return parsed;
      }
    } catch { /* 손상된 데이터면 기본값으로 */ }
  }
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* 저장 실패 시 무시 */ }
}

const state = loadState();

function lastDailyBoundary(now, hour) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() > now) d.setDate(d.getDate() - 1);
  return d.getTime();
}
function lastWeeklyBoundary(now, day, hour) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  let diff = d.getDay() - day;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() - diff);
  if (d.getTime() > now) d.setDate(d.getDate() - 7);
  return d.getTime();
}
function lastMultiDailyBoundary(now, hours) {
  let best = -Infinity;
  for (let back = 0; back <= 1; back++) {
    for (const h of hours) {
      const d = new Date(now);
      d.setDate(d.getDate() - back);
      d.setHours(h, 0, 0, 0);
      if (d.getTime() <= now && d.getTime() > best) best = d.getTime();
    }
  }
  return best === -Infinity ? 0 : best;
}
function lastWeekdaysBoundary(now, days, hour) {
  for (let back = 0; back < 8; back++) {
    const d = new Date(now);
    d.setDate(d.getDate() - back);
    d.setHours(hour, 0, 0, 0);
    if (days.includes(d.getDay()) && d.getTime() <= now) return d.getTime();
  }
  return 0;
}

function scheduleFor(def) {
  const s = state.settings;
  if (def.schedule.type === 'daily') return { type: 'daily', hour: s.dailyHour };
  if (def.schedule.type === 'weekly') return { type: 'weekly', day: s.weeklyDay, hour: s.weeklyHour };
  return def.schedule; // multiDaily/weekdays는 확인된 고정값
}

function lastBoundary(now, schedule) {
  if (schedule.type === 'daily') return lastDailyBoundary(now, schedule.hour);
  if (schedule.type === 'weekly') return lastWeeklyBoundary(now, schedule.day, schedule.hour);
  if (schedule.type === 'multiDaily') return lastMultiDailyBoundary(now, schedule.hours);
  if (schedule.type === 'weekdays') return lastWeekdaysBoundary(now, schedule.days, schedule.hour);
  return 0;
}
function nextBoundaryAfter(boundary, schedule) {
  if (schedule.type === 'daily') return boundary + 24 * 60 * 60 * 1000;
  if (schedule.type === 'weekly') return boundary + 7 * 24 * 60 * 60 * 1000;
  if (schedule.type === 'multiDaily') {
    // 다음 충전 시각: 현재 boundary 이후 가장 가까운 시각
    const sorted = [...schedule.hours].sort((a, b) => a - b);
    const d = new Date(boundary);
    for (const h of sorted) {
      const cand = new Date(boundary); cand.setHours(h, 0, 0, 0);
      if (cand.getTime() > boundary) return cand.getTime();
    }
    const d2 = new Date(boundary); d2.setDate(d2.getDate() + 1); d2.setHours(sorted[0], 0, 0, 0);
    return d2.getTime();
  }
  if (schedule.type === 'weekdays') {
    for (let fwd = 1; fwd <= 8; fwd++) {
      const d = new Date(boundary); d.setDate(d.getDate() + fwd); d.setHours(schedule.hour, 0, 0, 0);
      if (schedule.days.includes(d.getDay())) return d.getTime();
    }
  }
  return boundary;
}

function applyResets() {
  const now = Date.now();
  GROUP_DEFS.forEach(def => {
    const g = state.groups[def.key];
    const sched = scheduleFor(def);
    const boundary = lastBoundary(now, sched);
    if (g.resetAt < boundary) {
      g.items.forEach(t => t.done = false);
      g.resetAt = boundary;
    }
  });
  saveState();
}

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmtDate(ts) {
  const d = new Date(ts);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:00`;
}

function render() {
  const now = Date.now();
  $('groups').innerHTML = GROUP_DEFS.map(def => {
    const g = state.groups[def.key];
    const done = g.items.filter(t => t.done).length;
    const sched = scheduleFor(def);
    const next = nextBoundaryAfter(lastBoundary(now, sched), sched);
    const rows = g.items.length ? g.items.map(t => `
      <div class="task-row${t.done ? ' done' : ''}">
        <label class="task-check">
          <input type="checkbox" ${t.done ? 'checked' : ''} data-group="${def.key}" data-id="${t.id}">
          <span>${escapeHtml(t.text)}</span>
        </label>
        <button class="task-del" data-group="${def.key}" data-id="${t.id}" title="삭제">✕</button>
      </div>`).join('') : '<div class="hint">항목이 없습니다. 아래에서 추가해보세요.</div>';
    return `<div class="card">
      <h2>${def.label} <span class="progress-tag">${g.items.length ? done + '/' + g.items.length : ''}</span></h2>
      <div class="task-list">${rows}</div>
      <div class="add-row">
        <input type="text" id="input-${def.key}" placeholder="새 항목 추가">
        <button data-add="${def.key}">+ 추가</button>
      </div>
      <div class="hint">다음 초기화: ${fmtDate(next)}</div>
    </div>`;
  }).join('');
}

function toggle(groupKey, id) {
  const t = state.groups[groupKey].items.find(x => x.id === id);
  if (t) t.done = !t.done;
  saveState();
  render();
}
function remove(groupKey, id) {
  state.groups[groupKey].items = state.groups[groupKey].items.filter(x => x.id !== id);
  saveState();
  render();
}
function add(groupKey, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  state.groups[groupKey].items.push({ id: nextId(), text: trimmed, done: false });
  saveState();
  render();
}

$('groups').addEventListener('click', e => {
  const del = e.target.closest('.task-del');
  if (del) { remove(del.dataset.group, del.dataset.id); return; }
  const addBtn = e.target.closest('button[data-add]');
  if (addBtn) {
    const key = addBtn.dataset.add;
    const input = $('input-' + key);
    add(key, input.value);
    input.value = '';
  }
});
$('groups').addEventListener('change', e => {
  const cb = e.target.closest('input[type=checkbox]');
  if (cb) toggle(cb.dataset.group, cb.dataset.id);
});
$('groups').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('input[type=text]')) {
    const key = e.target.id.replace('input-', '');
    add(key, e.target.value);
    e.target.value = '';
  }
});

function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, parseInt(v, 10) || 0)); }
$('dailyHour').value = state.settings.dailyHour;
$('weeklyDay').value = state.settings.weeklyDay;
$('weeklyHour').value = state.settings.weeklyHour;
['dailyHour', 'weeklyDay', 'weeklyHour'].forEach(id => {
  $(id).addEventListener('change', () => {
    state.settings.dailyHour = clampInt($('dailyHour').value, 0, 23);
    state.settings.weeklyDay = clampInt($('weeklyDay').value, 0, 6);
    state.settings.weeklyHour = clampInt($('weeklyHour').value, 0, 23);
    saveState();
    applyResets();
    render();
  });
});

applyResets();
render();
setInterval(() => { applyResets(); render(); }, 60000);
