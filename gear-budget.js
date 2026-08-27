const $ = id => document.getElementById(id);

// 스탯 카탈로그·마석/영석 옵션·펫 옵션 조회 함수는 gear-defs.js(공용) 참고.

let activeMode = 'pve'; // 'pve' | 'pvp'
let focusStats = new Set(); // 관심 스탯으로 고른 키들 — 비어있으면 필터 없이 전체 표시
function visibleStats() {
  const modeStats = statsForMode(activeMode);
  if (focusStats.size === 0) return modeStats;
  return modeStats.filter(sd => focusStats.has(sd.key));
}

// ---------- 상태 (PVE/PVP 탭 전환과 무관하게 공유 — 같은 장비/펫 세팅을 다른 관점으로 볼 뿐) ----------
// 5개 종족 이해도가 전부 동시에 적용되므로 종족별로 독립된 9슬롯 상태를 갖는다.
const petStates = {};
PET_RACES.forEach(race => { petStates[race] = PET_SLOTS.reduce((acc, s) => { acc[s] = { idx: -1, value: 0 }; return acc; }, {}); });
const gearState = EQUIP_SLOTS.reduce((acc, part) => {
  acc[part] = { grade: '유일', manaTargets: [], engrave: {}, base: {} }; // engrave/base: { [statKey]: value }
  return acc;
}, {});

// ---------- 탭 ----------
function renderTabs() {
  $('modeTabs').innerHTML = `
    <div class="tabbar" role="tablist" aria-label="PVE/PVP 전환">
      <button type="button" role="tab" id="tab-pve" class="tab-btn" aria-selected="${activeMode === 'pve'}">PVE</button>
      <button type="button" role="tab" id="tab-pvp" class="tab-btn" aria-selected="${activeMode === 'pvp'}">PVP</button>
    </div>`;
  $('tab-pve').addEventListener('click', () => setMode('pve'));
  $('tab-pvp').addEventListener('click', () => setMode('pvp'));
}
function setMode(mode) {
  if (mode === activeMode) return;
  activeMode = mode;
  document.querySelectorAll('.tab-btn').forEach(b => b.setAttribute('aria-selected', b.id === 'tab-' + mode ? 'true' : 'false'));
  renderPetRaceBlocks();
  renderGearParts();
  calc();
}

// ---------- 관심 스탯 선택: 체크한 것만 남기고 펫/마석/영혼각인/요약에서 다 걸러낸다 ----------
// PVE/PVP 탭을 바꿔도 체크 목록 자체는 안 바뀌게, 전체 STAT_DEFS 기준으로 그린다.
function renderFocusPicker() {
  const box = $('focusPicker');
  box.innerHTML = `
    <div class="targetCheckList" style="max-height:180px;min-width:100%">
      ${CATEGORIES.map(c => `
        <div class="cl-grade">${c.label}</div>
        ${STAT_DEFS.filter(sd => sd.cat === c.key).map(sd => `
          <label class="cl-item"><input type="checkbox" class="focusChk" value="${sd.key}" ${focusStats.has(sd.key) ? 'checked' : ''}> ${sd.label}${sd.mode !== 'general' ? ` (${sd.mode === 'pve' ? 'PVE' : 'PVP'} 전용)` : ''}</label>`).join('')}
      `).join('')}
    </div>
    <button type="button" id="clearFocusBtn" style="margin-top:8px;background:#15151f;border:1px solid var(--line);color:var(--muted);border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:inherit">전체 선택 해제 (다시 전체 표시)</button>`;
  box.querySelectorAll('.focusChk').forEach(chk => {
    chk.addEventListener('change', () => {
      if (chk.checked) focusStats.add(chk.value); else focusStats.delete(chk.value);
      renderPetRaceBlocks();
      renderGearParts();
      calc();
    });
  });
  $('clearFocusBtn').addEventListener('click', () => {
    focusStats.clear();
    renderFocusPicker();
    renderPetRaceBlocks();
    renderGearParts();
    calc();
  });
}

// ---------- 펫 이해도 렌더 ----------
function renderPetSection(containerId, race, state, selClass, cellPrefix) {
  $(containerId).innerHTML = `
    <table class="odd-table">
      <thead><tr><th>슬롯</th><th>챙길 스탯 옵션</th><th>수치</th></tr></thead>
      <tbody>${PET_SLOTS.map(s => `
        <tr>
          <td>${s}번</td>
          <td><select class="${selClass}" data-slot="${s}"></select></td>
          <td id="${cellPrefix}${s}"></td>
        </tr>`).join('')}</tbody>
    </table>`;
  const shown = new Set(visibleStats().map(sd => sd.key));
  PET_SLOTS.forEach(s => {
    const matches = petMatchesForSlot(race, s);
    state[s].idx = -1;
    const sel = document.querySelector(`.${selClass}[data-slot="${s}"]`);
    const tagged = matches.map((m, i) => ({ ...m, i }));
    const relevant = tagged.filter(m => m.statKey && shown.has(m.statKey));
    const other = tagged.filter(m => !(m.statKey && shown.has(m.statKey)));
    const byCat = {};
    relevant.forEach(m => { const cat = STAT_BY_KEY[m.statKey].cat; (byCat[cat] = byCat[cat] || []).push(m); });
    const optHtml = m => `<option value="${m.i}">[${m.grade}] ${m.stat} (${m.range})</option>`;
    sel.innerHTML = `<option value="-1">— 선택 안함 —</option>` +
      CATEGORIES.filter(c => byCat[c.key] && byCat[c.key].length).map(c => `<optgroup label="${c.label}">${byCat[c.key].map(optHtml).join('')}</optgroup>`).join('') +
      (other.length ? `<optgroup label="기타 옵션 (요약 미포함)">${other.map(optHtml).join('')}</optgroup>` : '');
    sel._matches = matches;
    sel.addEventListener('change', () => {
      state[s].idx = parseInt(sel.value, 10);
      renderPetValueCell(s, state, selClass, cellPrefix);
      calc();
    });
    renderPetValueCell(s, state, selClass, cellPrefix);
  });
}
function renderPetValueCell(s, state, selClass, cellPrefix) {
  const cell = $(cellPrefix + s);
  const sel = document.querySelector(`.${selClass}[data-slot="${s}"]`);
  const idx = state[s].idx;
  if (idx < 0 || !sel._matches[idx]) { cell.innerHTML = '—'; return; }
  const m = sel._matches[idx];
  const range = parseRange(m.range);
  if (state[s].value === 0 || state[s].value < range.min || state[s].value > range.max) {
    state[s].value = range.max;
  }
  cell.innerHTML = `<input type="number" class="petValInput" data-slot="${s}" value="${state[s].value}" min="${range.min}" max="${range.max}" step="${range.isPercent ? '0.1' : '1'}" style="width:70px"> <span class="odd-nick">(${m.range})</span>`;
  cell.querySelector('.petValInput').addEventListener('input', e => {
    const range2 = parseRange(sel._matches[idx].range);
    let v = parseFloat(e.target.value) || 0;
    v = Math.max(range2.min, Math.min(range2.max, v));
    state[s].value = v;
    calc();
  });
}
function renderPetRaceBlocks() {
  $('petRaceBlocks').innerHTML = `
    <div class="gear-part-grid">
    ${PET_RACES.map(race => `
    <details class="card gear-part" open>
      <summary><span class="gear-part-name">${race}</span></summary>
      <div id="petTable_${race}" style="overflow-x:auto"></div>
    </details>`).join('')}
    </div>`;
  $('petExpandAllBtn').addEventListener('click', () => document.querySelectorAll('#petRaceBlocks .gear-part').forEach(d => { d.open = true; }));
  $('petCollapseAllBtn').addEventListener('click', () => document.querySelectorAll('#petRaceBlocks .gear-part').forEach(d => { d.open = false; }));
  PET_RACES.forEach(race => {
    renderPetSection(`petTable_${race}`, race, petStates[race], `petSel_${race}`, `petVal_${race}_`);
  });
}

// ---------- 장비 부위 렌더 ----------
function renderGearParts() {
  $('gearParts').innerHTML = `
    <div class="gear-part-toolbar">
      <button type="button" id="expandAllBtn">전체 펼치기</button>
      <button type="button" id="collapseAllBtn">전체 접기</button>
    </div>
    <div class="gear-part-grid">
    ${EQUIP_SLOTS.map(part => `
    <details class="card gear-part" open>
      <summary>
        <span class="gear-part-name">${part}</span>
        <span class="gear-part-badge" id="partBadge-${part}">—</span>
      </summary>
      <div class="field"><label>등급</label>
        <select class="gradeSel" data-part="${part}">
          <option value="유일">유일 (4칸)</option>
          <option value="영웅">영웅 (5칸)</option>
        </select>
      </div>
      <div class="sect" style="margin-top:0">장비 자체 스탯 (직접 입력 · 지금 착용 중인 아이템에 적힌 수치)</div>
      <div id="baseGrid-${part}"></div>
      <div class="field" style="margin-top:14px"><label>${stoneTypeFor(part)} 사용 칸 수</label>
        <select class="manaCountSel" data-part="${part}"></select>
      </div>
      <div id="manaRows-${part}"></div>
      <div class="sect" style="margin-top:14px">영혼각인 (직접 입력 · 데이터 없음 · 지금 탭에 해당하는 스탯만)</div>
      <div id="engraveGrid-${part}"></div>
    </details>`).join('')}
    </div>`;

  $('expandAllBtn').addEventListener('click', () => document.querySelectorAll('.gear-part').forEach(d => { d.open = true; }));
  $('collapseAllBtn').addEventListener('click', () => document.querySelectorAll('.gear-part').forEach(d => { d.open = false; }));

  EQUIP_SLOTS.forEach(part => {
    const gradeSel = document.querySelector(`.gradeSel[data-part="${part}"]`);
    gradeSel.value = gearState[part].grade;
    gradeSel.addEventListener('change', () => {
      gearState[part].grade = gradeSel.value;
      const max = GRADE_MAX[gearState[part].grade];
      if (gearState[part].manaTargets.length > max) gearState[part].manaTargets.length = max;
      renderManaCountSel(part);
      renderManaRows(part);
      calc();
    });
    renderBaseGrid(part);
    renderManaCountSel(part);
    renderManaRows(part);
    renderEngraveGrid(part);
  });
}

// 무기·방어구는 마석만, 악세서리는 영석만 — 부위별로 쓸 수 있는 MANA_OPTIONS만 걸러서 돌려준다.
function manaOptionsFor(part) {
  const stoneType = stoneTypeFor(part);
  return MANA_OPTIONS.filter(o => o.item.indexOf(stoneType) >= 0);
}

function renderManaCountSel(part) {
  const max = GRADE_MAX[gearState[part].grade];
  const sel = document.querySelector(`.manaCountSel[data-part="${part}"]`);
  const cur = Math.min(gearState[part].manaTargets.length, max);
  sel.innerHTML = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}칸</option>`).join('');
  sel.onchange = () => {
    const n = parseInt(sel.value, 10);
    const targets = gearState[part].manaTargets;
    const partOptions = manaOptionsFor(part);
    // 새 칸을 추가할 때마다 매번 같은 옵션만 기본으로 잡으면 여러 칸이 겹쳐 보여 헷갈리므로,
    // 지금 탭(PVE/PVP)에서 이 부위가 실제로 쓸 수 있는(마석 또는 영석) 스탯들을 순환하며 기본값을 준다.
    const availStats = visibleStats().filter(sd => partOptions.some(o => o.statKey === sd.key));
    while (targets.length < n) {
      const sd = availStats[targets.length % availStats.length];
      const best = partOptions.find(o => o.statKey === sd.key);
      targets.push({ idx: best ? best.idx : partOptions[0].idx });
    }
    targets.length = n;
    renderManaRows(part);
    calc();
  };
}

function renderManaRows(part) {
  const box = $('manaRows-' + part);
  const targets = gearState[part].manaTargets;
  if (targets.length === 0) { box.innerHTML = ''; return; }
  const shown = new Set(visibleStats().map(sd => sd.key));
  const partOptions = manaOptionsFor(part);
  const stoneType = stoneTypeFor(part);
  box.innerHTML = `
    <table class="odd-table">
      <thead><tr><th>#</th><th>${stoneType} · 스탯 (수치)</th></tr></thead>
      <tbody>${targets.map((t, i) => `
        <tr><td>${i + 1}</td><td><select class="manaTargetSel" data-part="${part}" data-i="${i}"></select></td></tr>`).join('')}</tbody>
    </table>`;
  targets.forEach((t, i) => {
    const sel = document.querySelector(`.manaTargetSel[data-part="${part}"][data-i="${i}"]`);
    sel.innerHTML = CATEGORIES.map(c => {
      const catStats = STAT_DEFS.filter(sd => sd.cat === c.key && shown.has(sd.key));
      const rows = [];
      catStats.forEach(sd => {
        partOptions.filter(o => o.statKey === sd.key).forEach(o => rows.push(o));
      });
      if (!rows.length) return '';
      return `<optgroup label="${c.label}">${rows.map(o => `<option value="${o.idx}">${o.label}</option>`).join('')}</optgroup>`;
    }).join('');
    if (!sel.querySelector(`option[value="${t.idx}"]`)) {
      const fallback = partOptions.find(o => shown.has(o.statKey));
      if (fallback) t.idx = fallback.idx;
    }
    sel.value = String(t.idx);
    sel.addEventListener('change', () => {
      t.idx = parseInt(sel.value, 10);
      calc();
    });
  });
}

// ---------- 장비 자체 스탯: 마석/영석·영혼각인과 별개로, 착용 중인 아이템에 이미 붙어 있는 수치를 직접 입력 ----------
function renderBaseGrid(part) {
  const box = $('baseGrid-' + part);
  const shown = visibleStats();
  box.innerHTML = CATEGORIES.map(c => {
    const opts = shown.filter(sd => sd.cat === c.key);
    if (!opts.length) return '';
    return `
      <div class="engrave-cat-label">${c.label}</div>
      <div class="cost-grid">
        ${opts.map(sd => `
          <div class="cost-cell">
            <label>${sd.label}${sd.pct ? ' (%)' : ''}</label>
            <input type="number" class="baseInput" data-part="${part}" data-stat="${sd.key}" value="${gearState[part].base[sd.key] || 0}" step="${sd.pct ? '0.1' : '1'}">
          </div>`).join('')}
      </div>`;
  }).join('');
  shown.forEach(sd => {
    const inp = document.querySelector(`.baseInput[data-part="${part}"][data-stat="${sd.key}"]`);
    inp.addEventListener('input', () => {
      gearState[part].base[sd.key] = parseFloat(inp.value) || 0;
      calc();
    });
  });
}

// ---------- 영혼각인: 지금 탭에 해당하는 스탯 전부를 바로 입력 가능한 칸으로 ----------
function renderEngraveGrid(part) {
  const box = $('engraveGrid-' + part);
  const shown = visibleStats();
  box.innerHTML = CATEGORIES.map(c => {
    const opts = shown.filter(sd => sd.cat === c.key);
    if (!opts.length) return '';
    return `
      <div class="engrave-cat-label">${c.label}</div>
      <div class="cost-grid">
        ${opts.map(sd => `
          <div class="cost-cell">
            <label>${sd.label}${sd.pct ? ' (%)' : ''}</label>
            <input type="number" class="engraveInput" data-part="${part}" data-stat="${sd.key}" value="${gearState[part].engrave[sd.key] || 0}" step="${sd.pct ? '0.1' : '1'}">
          </div>`).join('')}
      </div>`;
  }).join('');
  shown.forEach(sd => {
    const inp = document.querySelector(`.engraveInput[data-part="${part}"][data-stat="${sd.key}"]`);
    inp.addEventListener('input', () => {
      gearState[part].engrave[sd.key] = parseFloat(inp.value) || 0;
      calc();
    });
  });
}

// ---------- 합산 & 요약 ----------
function calc() {
  const shown = visibleStats();
  const petTotals = {}, manaTotals = {}, engraveTotals = {}, baseTotals = {};
  shown.forEach(sd => { petTotals[sd.key] = 0; manaTotals[sd.key] = 0; engraveTotals[sd.key] = 0; baseTotals[sd.key] = 0; });
  const shownKeys = new Set(shown.map(sd => sd.key));

  PET_RACES.forEach(race => {
    const state = petStates[race];
    const selClass = `petSel_${race}`;
    PET_SLOTS.forEach(s => {
      const idx = state[s].idx;
      if (idx < 0) return;
      const sel = document.querySelector(`.${selClass}[data-slot="${s}"]`);
      const m = sel && sel._matches && sel._matches[idx];
      if (!m || !m.statKey || !shownKeys.has(m.statKey)) return;
      petTotals[m.statKey] += state[s].value;
    });
  });

  EQUIP_SLOTS.forEach(part => {
    let manaSum = 0, engraveSum = 0, baseSum = 0;
    gearState[part].manaTargets.forEach(t => {
      const o = MANA_OPTIONS[t.idx];
      if (o && shownKeys.has(o.statKey)) { manaTotals[o.statKey] += o.val; manaSum += o.val; }
    });
    let engraveN = 0;
    Object.keys(gearState[part].engrave).forEach(key => {
      const v = gearState[part].engrave[key] || 0;
      if (v && shownKeys.has(key)) { engraveTotals[key] += v; engraveSum += v; engraveN++; }
    });
    let baseN = 0;
    Object.keys(gearState[part].base).forEach(key => {
      const v = gearState[part].base[key] || 0;
      if (v && shownKeys.has(key)) { baseTotals[key] += v; baseSum += v; baseN++; }
    });
    const badge = $('partBadge-' + part);
    if (badge) {
      const manaN = gearState[part].manaTargets.length;
      badge.textContent = `${gearState[part].grade} · 기본 ${baseN}개(${baseSum.toFixed(0)}) · 마석 ${manaN}칸(${manaSum.toFixed(0)}) · 각인 ${engraveN}개(${engraveSum.toFixed(0)})`;
    }
  });

  const showAll = $('showAllStatsChk') && $('showAllStatsChk').checked;
  const rowsByCategory = CATEGORIES.map(c => {
    const catStats = shown.filter(sd => sd.cat === c.key).filter(sd => {
      if (showAll) return true;
      return petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key] + baseTotals[sd.key] > 0;
    });
    return { c, catStats };
  }).filter(g => g.catStats.length);

  if (rowsByCategory.length === 0) {
    $('summaryTable').innerHTML = `<div class="odd-nick" style="padding:10px 0">아직 입력한 값이 없습니다 — 아래 "펫 이해도 기여분"과 각 장비 부위 카드에서 장비 기본 스탯·마석/영석·영혼각인 수치를 입력하면 여기 표시됩니다.</div>`;
    return;
  }
  $('summaryTable').innerHTML = `
    <table class="odd-table">
      <thead><tr><th>스탯</th><th>펫 이해도</th><th>장비 기본</th><th>마석/영석</th><th>영혼각인</th><th>총합</th></tr></thead>
      <tbody>${rowsByCategory.map(({ c, catStats }) => {
        return `<tr class="cat-row"><td colspan="6">${c.label}</td></tr>` + catStats.map(sd => {
          const total = petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key] + baseTotals[sd.key];
          const unit = sd.pct ? '%' : '';
          return `<tr>
            <td>${sd.label}${sd.pct ? ' <span class="odd-nick">(%)</span>' : ''}</td>
            <td>${petTotals[sd.key].toFixed(1)}${unit}</td>
            <td>${baseTotals[sd.key].toFixed(1)}${unit}</td>
            <td>${manaTotals[sd.key].toFixed(1)}${unit}</td>
            <td>${engraveTotals[sd.key].toFixed(1)}${unit}</td>
            <td class="odd-eff">${total.toFixed(1)}${unit}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table>`;
}

$('showAllStatsChk').addEventListener('change', calc);

renderFocusPicker();
renderTabs();
renderPetRaceBlocks();
renderGearParts();
calc();
