const $ = id => document.getElementById(id);

// 스탯 카탈로그·마석/영석 옵션·펫 옵션 조회 함수는 gear-defs.js(공용) 참고.
// 이 페이지는 스탯 하나만 다루므로 PVE/PVP 탭·관심 스탯 필터 없이 STAT_DEFS 전체를 그대로 쓴다.

// ---------- 상태: 5개 종족 이해도가 전부 동시에 적용되므로 종족별로 독립된 9슬롯 상태를 갖는다 ----------
const petStates = {};
PET_RACES.forEach(race => { petStates[race] = PET_SLOTS.reduce((acc, s) => { acc[s] = { idx: -1, value: 0 }; return acc; }, {}); });

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
  PET_SLOTS.forEach(s => {
    const matches = petMatchesForSlot(race, s);
    state[s].idx = -1;
    const sel = document.querySelector(`.${selClass}[data-slot="${s}"]`);
    const tagged = matches.map((m, i) => ({ ...m, i }));
    const relevant = tagged.filter(m => m.statKey);
    const other = tagged.filter(m => !m.statKey);
    const byCat = {};
    relevant.forEach(m => { const cat = STAT_BY_KEY[m.statKey].cat; (byCat[cat] = byCat[cat] || []).push(m); });
    const optHtml = m => `<option value="${m.i}">[${m.grade}] ${m.stat} (${m.range})</option>`;
    sel.innerHTML = `<option value="-1">— 선택 안함 —</option>` +
      CATEGORIES.filter(c => byCat[c.key] && byCat[c.key].length).map(c => `<optgroup label="${c.label}">${byCat[c.key].map(optHtml).join('')}</optgroup>`).join('') +
      (other.length ? `<optgroup label="기타 옵션">${other.map(optHtml).join('')}</optgroup>` : '');
    sel._matches = matches;
    sel.addEventListener('change', () => {
      state[s].idx = parseInt(sel.value, 10);
      renderPetValueCell(s, state, selClass, cellPrefix);
      renderGoalResult();
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
    renderGoalResult();
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

// ---------- 목표 수치 달성 경로: 스탯 하나를 어디서 얼마나 챙길 수 있는지 ----------
function computeGoalPath(statKey) {
  const sd = STAT_BY_KEY[statKey];
  const petRows = [];
  let petMaxTotal = 0;
  // 5개 종족 이해도가 전부 동시에 적용되므로 다 합산한다.
  PET_RACES.forEach(race => {
    PET_SLOTS.forEach(s => {
      if (!sd.pct && PET_AMPRES_SLOTS.has(s)) return;
      const matches = petMatchesForSlot(race, s).filter(m => m.statKey === statKey);
      if (!matches.length) return;
      let best = null, bestMax = -Infinity;
      matches.forEach(m => {
        const r = parseRange(m.range);
        if (r.max > bestMax) { bestMax = r.max; best = { grade: m.grade, range: m.range, min: r.min, max: r.max }; }
      });
      if (best) { petRows.push({ race, slot: s, grade: best.grade, range: best.range, min: best.min, max: best.max }); petMaxTotal += best.max; }
    });
  });

  const manaOpts = MANA_OPTIONS.filter(o => o.statKey === statKey);
  const stoneRows = manaOpts.filter(o => o.item.indexOf('마석') >= 0).sort((a, b) => b.val - a.val).slice(0, 8);
  const spiritRows = manaOpts.filter(o => o.item.indexOf('영석') >= 0).sort((a, b) => b.val - a.val).slice(0, 8);

  const involved = new Set(petRows.map(r => r.race));
  const noOptionRaces = PET_RACES.filter(r => !involved.has(r));

  return { petRows, petMaxTotal, stoneRows, spiritRows, noOptionRaces };
}

// 위 "펫 이해도 입력"에 종족별로 이미 입력해 둔 실제 값을 그대로 읽어서 합산한다 —
// 평균으로 어림잡지 않고 실제로 뭘 챙겼다고 표시했는지를 쓰는 쪽이 더 정확하다.
function computeActualPetTotal(statKey) {
  let total = 0;
  const byRace = {};
  PET_RACES.forEach(race => {
    const state = petStates[race];
    let raceSum = 0;
    PET_SLOTS.forEach(s => {
      const idx = state[s].idx;
      if (idx < 0) return;
      const sel = document.querySelector(`.petSel_${race}[data-slot="${s}"]`);
      const m = sel && sel._matches && sel._matches[idx];
      if (!m || m.statKey !== statKey) return;
      raceSum += state[s].value;
    });
    if (raceSum > 0) byRace[race] = raceSum;
    total += raceSum;
  });
  return { total, byRace };
}

// 부위별로 이미 챙긴 마석/영석 수치를 참고용으로 수기 입력하는 선택 섹션 — 스탯을 바꾸면 초기화된다.
let goalManaStatKey = null;
let goalManaEntries = {}; // part -> { grade: '유일'|'영웅', value: number }

function goalMetricBox(id, label, valueHtml, opts) {
  opts = opts || {};
  const big = opts.big ? 'font-size:26px' : 'font-size:20px';
  const color = opts.color || 'var(--txt)';
  return `
    <div style="background:#15151f;border:1px solid ${opts.border || 'var(--line)'};border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${label}</div>
      <div id="${id}" style="${big};font-weight:800;color:${color}">${valueHtml}</div>
    </div>`;
}

function renderGoalResult() {
  const statKey = $('goalStat').value;
  const target = parseFloat($('goalTarget').value) || 0;
  const engraveVal = parseFloat($('goalCurrentEngrave').value) || 0;
  const rawManual = $('goalCurrentValue').value;
  const hasManual = rawManual.trim() !== '';
  const manualValue = hasManual ? (parseFloat(rawManual) || 0) : 0;
  const box = $('goalResult');
  if (!statKey) { box.innerHTML = ''; return; }
  if (goalManaStatKey !== statKey) { goalManaStatKey = statKey; goalManaEntries = {}; }
  const sd = STAT_BY_KEY[statKey];
  const unit = sd.pct ? '%' : '';
  const dp = sd.pct ? 2 : 1;
  const { petRows, stoneRows, spiritRows, noOptionRaces } = computeGoalPath(statKey);
  const { total: petActualTotal, byRace: petActualByRace } = computeActualPetTotal(statKey);

  const relevantParts = EQUIP_SLOTS.filter(part => {
    const type = stoneTypeFor(part);
    return (type === '마석' && stoneRows.length) || (type === '영석' && spiritRows.length);
  });
  const manaEnteredSum = relevantParts.reduce((a, part) => a + ((goalManaEntries[part] && goalManaEntries[part].value) || 0), 0);
  const autoTotal = petActualTotal + engraveVal + manaEnteredSum;
  const currentTotal = hasManual ? manualValue : autoTotal;
  const remain = target - currentTotal;

  const petTableHtml = petRows.length ? `
    <table class="odd-table">
      <thead><tr><th>펫</th><th>슬롯</th><th>등급</th><th>필요 수치</th></tr></thead>
      <tbody>${petRows.map(r => {
        const avg = (r.min + r.max) / 2;
        return `<tr><td>${r.race}</td><td>${r.slot}번</td><td>${r.grade}</td><td>최소 ${r.min}${unit} 이상 · 평균 ${avg.toFixed(dp)}${unit} 이상 필요 (최대 ${r.max}${unit})</td></tr>`;
      }).join('')}</tbody>
    </table>` : `<div class="odd-nick">이 스탯을 주는 펫 이해도 옵션이 없습니다.</div>`;
  const manaTableHtml = rows => rows.length
    ? `<table class="odd-table"><thead><tr><th>아이템·단계</th><th>수치</th></tr></thead><tbody>${rows.map(o => `<tr><td>${o.item} ${o.stage}</td><td>${o.val.toFixed(dp)}${unit}</td></tr>`).join('')}</tbody></table>`
    : `<div class="odd-nick">해당 옵션 없음</div>`;

  const bestMana = [stoneRows[0], spiritRows[0]].filter(Boolean).sort((a, b) => b.val - a.val)[0];
  let tip = '';
  if (remain > 0 && bestMana) {
    const isStone = bestMana.item.indexOf('마석') >= 0;
    const totalPartsOfType = isStone ? (EQUIP_SLOTS.length - ACCESSORY_SLOTS.size) : ACCESSORY_SLOTS.size;
    // 한 부위 안에서 최상급이 여러 칸 뜨는 건 기대하기 어려우니, 부위당 딱 1칸만 최고값이 뜨고
    // 나머지 칸은 0이라고 보수적으로 잡는다("최대치 1개 · 나머지 최소 0개").
    const partsNeeded = Math.ceil(remain / bestMana.val);
    if (partsNeeded > totalPartsOfType) {
      const maxFromMana = totalPartsOfType * bestMana.val;
      const stillShort = remain - maxFromMana;
      tip = `남은 ${remain.toFixed(dp)}${unit}를 부위당 1칸(최고값)만 뜬다고 보수적으로 잡아도 <b>${partsNeeded}부위</b>가 필요한데, ${isStone ? '마석' : '영석'}을 꽂을 수 있는 부위는 전체 <b>${totalPartsOfType}개</b>뿐이라 다 못 채웁니다. 그 부위 전부에 <b>${bestMana.item} ${bestMana.stage}(칸당 ${bestMana.val.toFixed(dp)}${unit})</b>를 챙겨도 최대 <b>${maxFromMana.toFixed(dp)}${unit}</b> 정도까지고, 나머지 <b>${stillShort.toFixed(dp)}${unit}</b>는 펫 이해도를 더 챙기거나 영혼각인으로 채워야 합니다.`;
    } else {
      tip = `남은 ${remain.toFixed(dp)}${unit}는 마석/영석으로 채운다고 하면, 한 부위에서 최상급이 여러 칸 뜨길 기대하기보다 <b>부위당 1칸만 최고값(${bestMana.item} ${bestMana.stage}, 칸당 ${bestMana.val.toFixed(dp)}${unit})이 뜨고 나머지 칸은 0</b>이라고 보수적으로 잡으면, 총 <b>${partsNeeded}부위</b>에서 이 스탯을 챙기면 됩니다.`;
    }
  } else if (remain > 0 && !bestMana) {
    tip = `마석/영석엔 이 스탯 옵션이 없어서, 나머지는 펫 이해도를 더 챙기거나 영혼각인으로 채워야 합니다.`;
  }

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:4px 0 12px">
      ${goalMetricBox('goalMetricTarget', '목표', `${target.toFixed(dp)}${unit}`)}
      ${goalMetricBox('goalMetricPet', '펫 이해도 총합 (내 입력값)', `${petActualTotal.toFixed(dp)}${unit}`)}
      ${goalMetricBox('goalMetricEngrave', '영혼각인', `${engraveVal.toFixed(dp)}${unit}`)}
      ${goalMetricBox('goalMetricMana', '마석/영석 합계', `${manaEnteredSum.toFixed(dp)}${unit}`)}
      ${goalMetricBox('goalMetricTotal', hasManual ? '현재 총합 (직접 입력)' : '현재 총합 (자동 계산)', `${currentTotal.toFixed(dp)}${unit}`, { color: 'var(--gold)' })}
      ${goalMetricBox('goalMetricRemain', remain > 0 ? '부족분' : '달성!', remain > 0 ? `${remain.toFixed(dp)}${unit}` : `+${(-remain).toFixed(dp)}${unit}`, { big: true, color: remain > 0 ? 'var(--red)' : 'var(--gold)', border: remain > 0 ? 'var(--red)' : 'var(--gold)' })}
    </div>
    <div class="odd-nick" style="margin-top:0">※ 펫 이해도 총합은 아래 "펫 이해도 입력"에 종족별로 실제 입력한 값을 그대로 합산한 값입니다${Object.keys(petActualByRace).length ? ` — ${Object.entries(petActualByRace).map(([r, v]) => `${r} ${v.toFixed(dp)}${unit}`).join(', ')}` : ' (아직 입력된 게 없어서 0입니다 — 아래 펫 이해도 입력에서 슬롯을 골라 입력하면 여기 자동 반영됩니다)'}.</div>
    ${hasManual ? `<div class="odd-nick" style="margin-top:0">※ ③에 값을 직접 입력해서 그 수치(${manualValue.toFixed(dp)}${unit})를 그대로 기준으로 씁니다. 위 펫 이해도·영혼각인·마석 합계는 참고용이며 부족분 계산에 다시 더하지 않습니다.</div>` : ''}
    ${tip ? `<div class="note" style="margin-top:0">${tip}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
      <div>
        <div class="engrave-cat-label">펫 이해도 (5종족) — 슬롯별 참고 범위(실제 반영 값 아님, 참고용)</div>
        ${petTableHtml}
        ${noOptionRaces.length ? `<div class="odd-nick" style="margin-top:4px">※ ${noOptionRaces.join(', ')} 종족엔 이 스탯 옵션이 아예 없어서 빠졌습니다.</div>` : ''}
      </div>
      <div>
        <div class="engrave-cat-label">마석 (무기/방어구)</div>
        ${manaTableHtml(stoneRows.slice(0, 3))}
        <div class="engrave-cat-label" style="margin-top:10px">영석 (악세서리)</div>
        ${manaTableHtml(spiritRows.slice(0, 3))}
      </div>
    </div>
    <details class="card" style="margin-top:12px;padding:10px 14px" open>
      <summary style="cursor:pointer;color:var(--muted);font-size:13px">⑤ 부위별 마석/영석 수치 입력 — 입력하면 위 "마석/영석 합계"에 자동 반영됩니다${hasManual ? ' (③을 직접 입력했으므로 부족분엔 반영되지 않음)' : ''}</summary>
      <div id="goalManaGrid" style="margin-top:10px"></div>
    </details>`;

  renderGoalManaGrid(statKey, relevantParts, sd, dp, unit, target, petActualTotal, engraveVal, hasManual, manualValue, stoneRows, spiritRows);
}

function renderGoalManaGrid(statKey, relevantParts, sd, dp, unit, target, petActualTotal, engraveVal, hasManual, manualValue, stoneRows, spiritRows) {
  const box = $('goalManaGrid');
  if (!box) return;
  const bestFor = part => (stoneTypeFor(part) === '마석' ? stoneRows[0] : spiritRows[0]);

  // 한 부위 안에서 최상급이 여러 칸 뜨는 건 기대하기 어려우니, 부위당 딱 1칸만 최고값이 뜨고
  // 나머지 칸은 0이라고 보수적으로 잡는다("최대치 1개 · 나머지 최소 0개").
  const updateHint = part => {
    const hintEl = $('goalManaHint_' + part);
    if (!hintEl) return;
    const entry = goalManaEntries[part] || { grade: '유일', value: 0 };
    const best = bestFor(part);
    if (!best) { hintEl.textContent = ''; return; }
    const theoreticalMax = best.val;
    const gap = theoreticalMax - (entry.value || 0);
    hintEl.textContent = gap > 0
      ? `${best.item} ${best.stage} 기준 이 부위 1칸 최고값 ${theoreticalMax.toFixed(dp)}${unit} 가능(나머지 칸은 0으로 보수적으로 가정) · 지금보다 +${gap.toFixed(dp)}${unit} 더 채울 수 있음`
      : `이 부위는 보수적 목표치(1칸 최고값 ${theoreticalMax.toFixed(dp)}${unit})에 이미 도달했습니다`;
  };

  const updatePriority = remain => {
    const el = $('goalManaPriority');
    if (!el) return;
    if (remain <= 0) { el.innerHTML = `<div class="odd-nick" style="margin-top:8px">이미 목표를 채웠습니다 — 더 스왑할 필요 없습니다.</div>`; return; }
    const candidates = relevantParts.map(part => {
      const entry = goalManaEntries[part] || { grade: '유일', value: 0 };
      const best = bestFor(part);
      if (!best) return null;
      const theoreticalMax = best.val;
      const gap = theoreticalMax - (entry.value || 0);
      return gap > 0 ? { part, gap, best } : null;
    }).filter(Boolean).sort((a, b) => b.gap - a.gap);
    if (!candidates.length) { el.innerHTML = `<div class="odd-nick" style="margin-top:8px">지금 입력된 부위들은 이미 이론상 최대치라, 이 스탯은 다른 부위·펫·영혼각인으로 더 채워야 합니다.</div>`; return; }
    let acc = 0, picked = [];
    for (const c of candidates) { if (acc >= remain) break; picked.push(c); acc += c.gap; }
    el.innerHTML = `<div class="note" style="margin-top:8px">부족분 ${remain.toFixed(dp)}${unit}를 마석/영석 스왑으로 채우려면, 우선순위 순으로 <b>${picked.map(c => `${c.part}(${c.best.item} ${c.best.stage}, +${c.gap.toFixed(dp)}${unit})`).join(' → ')}</b>로 바꾸면 됩니다${acc < remain ? ' (그래도 부족하면 다른 부위도 추가로 필요)' : ''}.</div>`;
  };

  const updateSum = () => {
    const sum = relevantParts.reduce((a, part) => a + ((goalManaEntries[part] && goalManaEntries[part].value) || 0), 0);
    const total = hasManual ? manualValue : (petActualTotal + engraveVal + sum);
    const remain = target - total;
    const manaEl = $('goalMetricMana');
    const totalEl = $('goalMetricTotal');
    const remainEl = $('goalMetricRemain');
    if (manaEl) manaEl.textContent = `${sum.toFixed(dp)}${unit}`;
    if (totalEl) totalEl.textContent = `${total.toFixed(dp)}${unit}`;
    if (remainEl) {
      const remainBox = remainEl.closest('div[style*="border"]');
      remainEl.textContent = remain > 0 ? `${remain.toFixed(dp)}${unit}` : `+${(-remain).toFixed(dp)}${unit}`;
      const label = remainEl.parentElement.querySelector('div');
      if (label) label.textContent = remain > 0 ? '부족분' : '달성!';
      const color = remain > 0 ? 'var(--red)' : 'var(--gold)';
      remainEl.style.color = color;
      if (remainBox) remainBox.style.borderColor = color;
    }
    updatePriority(remain);
  };
  if (!relevantParts.length) { box.innerHTML = `<div class="odd-nick">이 스탯은 마석/영석 옵션이 없어서 입력할 부위가 없습니다.</div>`; return; }
  box.innerHTML = `
    <div class="cost-grid">
      ${relevantParts.map(part => {
        const entry = goalManaEntries[part] || { grade: '유일', value: 0 };
        return `
        <div class="cost-cell">
          <label>${part} (${stoneTypeFor(part)})</label>
          <div style="display:flex;gap:4px">
            <select class="goalManaGradeSel" data-part="${part}" style="width:70px">
              <option value="유일" ${entry.grade === '유일' ? 'selected' : ''}>유일(4)</option>
              <option value="영웅" ${entry.grade === '영웅' ? 'selected' : ''}>영웅(5)</option>
            </select>
            <input type="number" class="goalManaValInput" data-part="${part}" value="${entry.value || 0}" step="${sd.pct ? '0.1' : '1'}" style="width:70px">
          </div>
          <div id="goalManaHint_${part}" class="odd-nick" style="margin-top:3px;font-size:11px"></div>
        </div>`;
      }).join('')}
    </div>
    <div id="goalManaPriority"></div>`;
  relevantParts.forEach(part => {
    const gradeSel = document.querySelector(`.goalManaGradeSel[data-part="${part}"]`);
    const valInput = document.querySelector(`.goalManaValInput[data-part="${part}"]`);
    gradeSel.addEventListener('change', () => {
      goalManaEntries[part] = goalManaEntries[part] || { grade: '유일', value: 0 };
      goalManaEntries[part].grade = gradeSel.value;
      updateHint(part);
      updateSum();
    });
    valInput.addEventListener('input', () => {
      goalManaEntries[part] = goalManaEntries[part] || { grade: '유일', value: 0 };
      goalManaEntries[part].value = parseFloat(valInput.value) || 0;
      updateHint(part);
      updateSum();
    });
    updateHint(part);
  });
  const initialSum = relevantParts.reduce((a, part) => a + ((goalManaEntries[part] && goalManaEntries[part].value) || 0), 0);
  const initialTotal = hasManual ? manualValue : (petActualTotal + engraveVal + initialSum);
  updatePriority(target - initialTotal);
}

function renderGoalFinder() {
  const sel = $('goalStat');
  const prev = sel.value;
  sel.innerHTML = CATEGORIES.map(c => {
    const opts = STAT_DEFS.filter(sd => sd.cat === c.key);
    if (!opts.length) return '';
    return `<optgroup label="${c.label}">${opts.map(sd => `<option value="${sd.key}">${sd.label}${sd.pct ? ' (%)' : ''}${sd.mode !== 'general' ? ` (${sd.mode === 'pve' ? 'PVE' : 'PVP'} 전용)` : ''}</option>`).join('')}</optgroup>`;
  }).join('');
  if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
  renderGoalResult();
}

$('goalStat').addEventListener('change', renderGoalResult);
$('goalTarget').addEventListener('input', renderGoalResult);
$('goalCurrentValue').addEventListener('input', renderGoalResult);
$('goalCurrentEngrave').addEventListener('input', renderGoalResult);

renderPetRaceBlocks();
renderGoalFinder();
