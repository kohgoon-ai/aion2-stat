const $ = id => document.getElementById(id);

// 스탯 카탈로그·마석/영석 옵션·펫 옵션 조회 함수는 gear-defs.js(공용) 참고.
// 이 페이지는 스탯 하나만 다루므로 PVE/PVP 탭·관심 스탯 필터 없이 STAT_DEFS 전체를 그대로 쓴다.
// 펫 이해도는 슬롯마다 "지금 실제로 어떤 옵션이 들어있는지"를 고르고 값을 입력받는다(목표
// 스탯이 아닌 옵션도 고를 수 있다). 목표 스탯이 들어있는 슬롯만 총합에 더해지고, 다른
// 스탯이 들어있는 슬롯은 이 슬롯을 목표 스탯으로 바꾸면 얼마나 오르는지 계산해서 보여준다.

// ---------- 목표 수치 달성 경로: 스탯 하나를 어디서 얼마나 챙길 수 있는지 ----------
function computeGoalPath(statKey) {
  const sd = STAT_BY_KEY[statKey];
  const petRows = [];
  let petMaxTotal = 0;
  // 종족별로 따로 집계한다 — 지성/야성/자연/변형/특수가 이 스탯에서 각각 최대 얼마까지
  // 나올 수 있는지 알아야 종족마다 얼마나 챙겼는지 비교해서 보여줄 수 있다.
  const petByRace = {};
  PET_RACES.forEach(race => { petByRace[race] = { minTotal: 0, avgTotal: 0, maxTotal: 0, slotCount: 0 }; });
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
      if (best) {
        petRows.push({ race, slot: s, grade: best.grade, range: best.range, min: best.min, max: best.max });
        petMaxTotal += best.max;
        petByRace[race].minTotal += best.min;
        petByRace[race].avgTotal += (best.min + best.max) / 2;
        petByRace[race].maxTotal += best.max;
        petByRace[race].slotCount += 1;
      }
    });
  });

  const manaOpts = MANA_OPTIONS.filter(o => o.statKey === statKey);
  const stoneRows = manaOpts.filter(o => o.item.indexOf('마석') >= 0).sort((a, b) => b.val - a.val).slice(0, 8);
  const spiritRows = manaOpts.filter(o => o.item.indexOf('영석') >= 0).sort((a, b) => b.val - a.val).slice(0, 8);

  const involved = new Set(petRows.map(r => r.race));
  const noOptionRaces = PET_RACES.filter(r => !involved.has(r));

  return { petRows, petByRace, petMaxTotal, stoneRows, spiritRows, noOptionRaces };
}

// 부위마다 마석/영석 칸이 여러 개인데, 어떤 칸에 뭐가 들어있는지 전부 고르게 하면 입력이
// 너무 번거롭다는 피드백에 따라 더 간단하게: 등급(칸 수 결정) → 이 부위에 목표 스탯이
// 몇 칸 들어있는지 개수만 고르면 → 그 개수만큼 수치 입력칸이 뜨는 방식으로 바꿨다.
let goalManaStatKey = null;
let goalManaGrade = {}; // part -> '유일'|'영웅' — 부위 등급은 목표 스탯과 무관하니 스탯을 바꿔도 유지한다.
let goalManaCount = {}; // part -> 이 부위에서 목표 스탯이 들어있는 칸 수 — 스탯을 바꾸면 초기화된다.
let goalManaValues = {}; // part -> [칸별 수치, ...] (길이 = goalManaCount[part])

function goalManaSlotCount(part) { return GRADE_MAX[goalManaGrade[part] || '유일']; }
function goalManaPartContribution(part) {
  return (goalManaValues[part] || []).reduce((a, v) => a + (v || 0), 0);
}

// 마석/영석과 똑같이: 종족마다 슬롯을 하나씩 고르게 하지 않고, "이 종족에 목표 스탯이
// 몇 슬롯 들어있는지" 개수만 고르면 그 개수만큼 수치 입력칸이 뜨는 방식으로 단순화했다.
let goalPetStatKey = null;
let goalPetCount = {}; // race -> 이 종족에서 목표 스탯이 들어있는 슬롯 수 — 스탯을 바꾸면 초기화된다.
let goalPetValues = {}; // race -> [슬롯별 수치, ...] (길이 = goalPetCount[race])

function goalPetRaceContribution(race) {
  return (goalPetValues[race] || []).reduce((a, v) => a + (v || 0), 0);
}

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
  if (goalManaStatKey !== statKey) { goalManaStatKey = statKey; goalManaCount = {}; goalManaValues = {}; }
  if (goalPetStatKey !== statKey) { goalPetStatKey = statKey; goalPetCount = {}; goalPetValues = {}; }
  const sd = STAT_BY_KEY[statKey];
  const unit = sd.pct ? '%' : '';
  const dp = sd.pct ? 2 : 1;
  const { petRows, petByRace, petMaxTotal, stoneRows, spiritRows, noOptionRaces } = computeGoalPath(statKey);
  const petRacesWithOption = PET_RACES.filter(r => petByRace[r].slotCount > 0);
  const petActualTotal = PET_RACES.reduce((a, race) => a + goalPetRaceContribution(race), 0);
  const petAvgSum = petRacesWithOption.reduce((a, r) => a + petByRace[r].avgTotal, 0);

  const relevantParts = EQUIP_SLOTS.filter(part => {
    const type = stoneTypeFor(part);
    return (type === '마석' && stoneRows.length) || (type === '영석' && spiritRows.length);
  });
  const manaEnteredSum = relevantParts.reduce((a, part) => a + goalManaPartContribution(part), 0);
  const autoTotal = petActualTotal + engraveVal + manaEnteredSum;
  const currentTotal = hasManual ? manualValue : autoTotal;
  const remain = target - currentTotal;

  const petSynergyNote = petRacesWithOption.length
    ? `각 종족에서 평균만큼(<b>${petRacesWithOption.map(r => `${r} ${petByRace[r].avgTotal.toFixed(dp)}${unit}`).join(' · ')}</b>) 챙기면 펫 이해도 합계는 <b>${petAvgSum.toFixed(dp)}${unit}</b>입니다.`
    : '';

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

  const bestStoneVal = stoneRows[0] ? stoneRows[0].val : null;
  const bestSpiritVal = spiritRows[0] ? spiritRows[0].val : null;

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:4px 0 12px">
      ${goalMetricBox('goalMetricTarget', '목표', `${target.toFixed(dp)}${unit}`)}
      ${goalMetricBox('goalMetricTotal', hasManual ? '현재 총합 (직접 입력)' : '현재 총합 (자동 계산)', `${currentTotal.toFixed(dp)}${unit}`, { color: 'var(--gold)' })}
      ${goalMetricBox('goalMetricRemain', remain > 0 ? '부족분' : '달성!', remain > 0 ? `${remain.toFixed(dp)}${unit}` : `+${(-remain).toFixed(dp)}${unit}`, { big: true, color: remain > 0 ? 'var(--red)' : 'var(--gold)', border: remain > 0 ? 'var(--red)' : 'var(--gold)' })}
    </div>
    ${hasManual ? `<div class="odd-nick" style="margin-top:0">※ ③에 값을 직접 입력해서 그 수치(${manualValue.toFixed(dp)}${unit})를 그대로 기준으로 씁니다. 아래 펫 이해도·영혼각인·마석 합계는 참고용이며 부족분 계산엔 다시 더하지 않습니다.</div>` : ''}

    <div class="card" style="margin-top:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="engrave-cat-label" style="margin:0">🐾 펫 이해도</div>
        <div style="font-size:20px;font-weight:800;color:var(--txt)" id="goalPetTotalDisplay">${petActualTotal.toFixed(dp)}${unit}</div>
      </div>
      <div class="odd-nick" style="margin-top:6px">종족·슬롯마다 <b>지금 실제로 어떤 옵션이 들어있는지 고르고</b> 수치를 입력하세요 — 목표 스탯이 아닌 다른 옵션을 골라도 됩니다. 이미 목표 스탯이 들어있는 슬롯은 총합에 더해지고, 다른 스탯이 들어있는 슬롯은 "바꾸면 얼마나 오르는지"를 옆에 보여줘서 어느 슬롯을 스왑하면 좋을지 알 수 있습니다.${petSynergyNote ? ' ' + petSynergyNote : ''}</div>
      <div id="goalPetGrid" style="margin-top:10px"></div>
      <div id="goalPetPriority"></div>
      ${noOptionRaces.length ? `<div class="odd-nick" style="margin-top:4px">※ ${noOptionRaces.join(', ')} 종족엔 이 스탯 옵션이 아예 없어서 뺐습니다.</div>` : ''}
    </div>

    <div class="card" style="margin-top:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="engrave-cat-label" style="margin:0">💎 마석/영석</div>
        <div style="font-size:20px;font-weight:800;color:var(--txt)" id="goalMetricMana">${manaEnteredSum.toFixed(dp)}${unit}</div>
      </div>
      <div class="odd-nick" style="margin-top:6px">※ 아래 칸마다 <b>지금 그 부위에 이미 챙긴 수치</b>를 입력하세요. "+N" 배지는 <b>이 부위에서 1칸을 최고 등급 아이템으로 바꾸면(나머지 칸은 0으로 가정) 얼마나 더 늘릴 수 있는지</b>입니다.${bestStoneVal ? ` 마석 최고값: ${stoneRows[0].item} ${stoneRows[0].stage}(${bestStoneVal.toFixed(dp)}${unit}).` : ''}${bestSpiritVal ? ` 영석 최고값: ${spiritRows[0].item} ${spiritRows[0].stage}(${bestSpiritVal.toFixed(dp)}${unit}).` : ''}</div>
      ${tip ? `<div class="note" style="margin-top:8px">${tip}</div>` : ''}
      <div id="goalManaGrid" style="margin-top:10px"></div>
    </div>

    <div class="card" style="margin-top:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="engrave-cat-label" style="margin:0">✒ 영혼각인</div>
        <div style="font-size:20px;font-weight:800;color:var(--txt)">${engraveVal.toFixed(dp)}${unit}</div>
      </div>
      <div class="odd-nick" style="margin-top:6px">위 ④ 칸에 입력한 값이 그대로 반영됩니다. 부위별 데이터가 없어서 총합만 직접 입력합니다.</div>
    </div>`;

  renderGoalPetGrid(petRows, petByRace, petMaxTotal, statKey, sd, dp, unit, target, engraveVal, hasManual, manualValue);
  renderGoalManaGrid(statKey, relevantParts, sd, dp, unit, target, petActualTotal, engraveVal, hasManual, manualValue, stoneRows, spiritRows);
}

// 종족 총합만 입력하면 "지금 어떤 슬롯이 목표 스탯이고 어떤 슬롯을 바꿔야 하는지" 알 수 없으니,
// 슬롯마다 지금 실제로 어떤 옵션이 들어있는지 고르게 하고(목표 스탯이 아니어도 됨), 목표
// 스탯이 아닌 슬롯은 "바꾸면 얼마나 오르는지"를 계산해서 스왑 우선순위까지 알려준다.
// 마석/영석과 똑같이: 종족마다 슬롯 하나하나 뭐가 들어있는지 고르게 하는 대신,
// "이 종족에 목표 스탯이 몇 슬롯 들어있는지" 개수만 고르면 그 개수만큼 수치 입력칸만 뜬다.
function renderGoalPetGrid(petRows, petByRace, petMaxTotal, statKey, sd, dp, unit, target, engraveVal, hasManual, manualValue) {
  const box = $('goalPetGrid');
  if (!box) return;
  if (!petRows.length) { box.innerHTML = `<div class="odd-nick">이 스탯을 주는 펫 이해도 옵션이 없습니다.</div>`; return; }

  const racesWithOption = PET_RACES.filter(race => petByRace[race].slotCount > 0);
  const rangeFor = race => {
    const rows = petRows.filter(r => r.race === race);
    return { min: Math.min(...rows.map(r => r.min)), max: Math.max(...rows.map(r => r.max)) };
  };

  const updateBottomSummary = total => {
    const gap = petMaxTotal - total;
    const grandEl = $('goalPetGrandTotal');
    const gapEl = $('goalPetGapToMax');
    if (grandEl) grandEl.textContent = `${total.toFixed(dp)}${unit}`;
    if (gapEl) gapEl.textContent = gap > 0 ? `−${gap.toFixed(dp)}${unit} 낮음` : `최대치 달성`;
  };

  const updateAll = () => {
    const total = PET_RACES.reduce((a, race) => a + goalPetRaceContribution(race), 0);
    const petTotalEl = $('goalPetTotalDisplay');
    if (petTotalEl) petTotalEl.textContent = `${total.toFixed(dp)}${unit}`;
    updateBottomSummary(total);
    // 마석/영석 합계는 그대로 두고, 펫 총합만 갱신된 상태로 현재 총합·부족분을 다시 계산한다.
    const manaSum = parseFloat(($('goalMetricMana') && $('goalMetricMana').textContent) || '0') || 0;
    const grandTotal = hasManual ? manualValue : (total + engraveVal + manaSum);
    const remain = target - grandTotal;
    const totalEl = $('goalMetricTotal');
    const remainEl = $('goalMetricRemain');
    if (totalEl) totalEl.textContent = `${grandTotal.toFixed(dp)}${unit}`;
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

  const updateRaceSubtotal = race => {
    const el = $('goalPetRaceSubtotal_' + race);
    if (el) el.textContent = `${goalPetRaceContribution(race).toFixed(dp)}${unit}`;
  };

  const updatePriority = remain => {
    const el = $('goalPetPriority');
    if (!el) return;
    if (remain <= 0) { el.innerHTML = ''; return; }
    // 종족마다 비어있는(목표 스탯을 아직 안 채운) 슬롯 수 = 그 종족 최대 슬롯 수 - 채운 개수.
    const candidates = [];
    racesWithOption.forEach(race => {
      const emptySlots = petByRace[race].slotCount - (goalPetCount[race] || 0);
      const bestMax = rangeFor(race).max;
      for (let i = 0; i < emptySlots; i++) candidates.push({ race, gain: bestMax });
    });
    candidates.sort((a, b) => b.gain - a.gain);
    if (!candidates.length) { el.innerHTML = `<div class="odd-nick" style="margin-top:8px">더 채울 수 있는 빈 슬롯이 없습니다 — 마석/영석이나 영혼각인으로 채워야 합니다.</div>`; return; }
    let acc = 0, count = 0;
    for (const c of candidates) { if (acc >= remain) break; acc += c.gain; count++; }
    const totalAvailable = candidates.length;
    if (acc < remain) {
      const stillShort = remain - acc;
      el.innerHTML = `<div class="note" style="margin-top:8px">비어있는 슬롯을 <b>전부(${totalAvailable}개)</b> ${sd.label}(으)로 채워도 최대 <b>${acc.toFixed(dp)}${unit}</b>까지고, 부족분 <b>${remain.toFixed(dp)}${unit}</b> 중 <b>${stillShort.toFixed(dp)}${unit}</b>는 펫 슬롯만으로는 못 채웁니다 — 마석/영석이나 영혼각인으로 채우세요.</div>`;
    } else {
      el.innerHTML = `<div class="note" style="margin-top:8px">부족분 ${remain.toFixed(dp)}${unit}는 빈 슬롯 중 최소 <b>${count}개</b>(전체 빈 슬롯 ${totalAvailable}개 중)를 최고값 기준으로 채우면 됩니다.</div>`;
    }
  };

  const renderValueInputs = race => {
    const container = $('goalPetValuesFor_' + race);
    if (!container) return;
    const count = goalPetCount[race] || 0;
    const values = goalPetValues[race] || (goalPetValues[race] = []);
    values.length = count;
    const { min: rangeMin, max: rangeMax } = rangeFor(race);
    if (!count) { container.innerHTML = `<div class="odd-nick">이 종족에 ${sd.label}이(가) 없다면 0으로 두세요.</div>`; return; }
    const step = (Number.isInteger(rangeMin) && Number.isInteger(rangeMax)) ? '1' : '0.1';
    container.innerHTML = Array.from({ length: count }, (_, i) => `
      <div class="cost-cell" style="min-width:110px">
        <label>슬롯 ${i + 1}</label>
        <input type="number" class="goalPetValInput" data-race="${race}" data-i="${i}" value="${values[i] || 0}" min="${rangeMin}" max="${rangeMax}" step="${step}">
      </div>`).join('');
    for (let i = 0; i < count; i++) {
      const inp = document.querySelector(`.goalPetValInput[data-race="${race}"][data-i="${i}"]`);
      inp.addEventListener('input', () => {
        let v = parseFloat(inp.value) || 0;
        v = Math.max(rangeMin, Math.min(rangeMax, v));
        values[i] = v;
        updateRaceSubtotal(race);
        updateAll();
      });
    }
  };

  const renderCountSel = race => {
    const el = $('goalPetCountSel_' + race);
    if (!el) return;
    const max = petByRace[race].slotCount;
    const cur = Math.min(goalPetCount[race] || 0, max);
    el.innerHTML = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}개</option>`).join('');
  };

  const raceCardsHtml = racesWithOption.map(race => {
    const b = petByRace[race];
    const { min: rangeMin, max: rangeMax } = rangeFor(race);
    const raceSum = goalPetRaceContribution(race);
    return `
    <details class="card" style="margin-top:8px;padding:10px 12px" open>
      <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-weight:700">${race}</span>
        <span style="font-size:13px">현재 <b id="goalPetRaceSubtotal_${race}" style="color:var(--gold)">${raceSum.toFixed(dp)}${unit}</b></span>
      </summary>
      <div class="odd-nick" style="margin-top:4px">참고 — 슬롯당 범위 ${rangeMin}${unit} ~ ${rangeMax}${unit} · 최대 ${b.slotCount}슬롯까지 가능(이론상 최대 ${b.maxTotal.toFixed(dp)}${unit})</div>
      <div class="field" style="margin-top:8px"><label>${sd.label} 몇 슬롯?</label>
        <select id="goalPetCountSel_${race}" data-race="${race}"></select>
      </div>
      <div class="cost-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));margin-top:8px" id="goalPetValuesFor_${race}"></div>
    </details>`;
  }).join('');

  const initialPetTotalForBottom = PET_RACES.reduce((a, race) => a + goalPetRaceContribution(race), 0);
  const initialGap = petMaxTotal - initialPetTotalForBottom;
  box.innerHTML = raceCardsHtml + `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px">
      ${goalMetricBox('goalPetGrandTotal', `펫 이해도 ${sd.label} 총합`, `${initialPetTotalForBottom.toFixed(dp)}${unit}`, { color: 'var(--gold)' })}
      ${goalMetricBox('goalPetGapToMax', '이론상 최대 대비', initialGap > 0 ? `−${initialGap.toFixed(dp)}${unit} 낮음` : '최대치 달성', { color: initialGap > 0 ? 'var(--red)' : 'var(--gold)' })}
    </div>
    <div id="goalPetPriority"></div>`;

  racesWithOption.forEach(race => {
    const countSel = $('goalPetCountSel_' + race);
    countSel.addEventListener('change', () => {
      goalPetCount[race] = parseInt(countSel.value, 10);
      renderValueInputs(race);
      updateRaceSubtotal(race);
      updateAll();
    });
    renderCountSel(race);
    renderValueInputs(race);
  });

  updateAll();
}

// 부위 하나엔 마석/영석 칸이 유일4/영웅5개 있는데 부위당 값 하나로 퉁치면 이미 다른
// 스탯으로 채운 칸을 반영할 수 없다 — 펫 슬롯과 똑같이 칸마다 "지금 뭐가 꽂혀있는지"
// 고르게 한다. 마석/영석은 아이템+단계를 고르면 수치가 고정값이라 범위 입력은 필요 없다.
function renderGoalManaGrid(statKey, relevantParts, sd, dp, unit, target, petActualTotal, engraveVal, hasManual, manualValue, stoneRows, spiritRows) {
  const box = $('goalManaGrid');
  if (!box) return;
  const bestFor = part => (stoneTypeFor(part) === '마석' ? stoneRows[0] : spiritRows[0]);

  const updatePartTotal = part => {
    const el = $('goalManaPartSubtotal_' + part);
    if (el) el.textContent = `${goalManaPartContribution(part).toFixed(dp)}${unit}`;
  };

  const updatePriority = remain => {
    const el = $('goalManaPriority');
    if (!el) return;
    if (remain <= 0) { el.innerHTML = `<div class="odd-nick" style="margin-top:8px">이미 목표를 채웠습니다 — 더 채울 필요 없습니다.</div>`; return; }
    // 아직 목표 스탯을 넣지 않은 빈 칸 수 = 부위 전체 칸 수 - 이미 목표 스탯 넣은 칸 수.
    const candidates = [];
    relevantParts.forEach(part => {
      const best = bestFor(part);
      if (!best) return;
      const emptySlots = goalManaSlotCount(part) - (goalManaCount[part] || 0);
      for (let i = 0; i < emptySlots; i++) candidates.push({ part, gain: best.val });
    });
    candidates.sort((a, b) => b.gain - a.gain);
    if (!candidates.length) { el.innerHTML = `<div class="odd-nick" style="margin-top:8px">더 채울 수 있는 빈 칸이 없습니다 — 펫 이해도나 영혼각인으로 채워야 합니다.</div>`; return; }
    let acc = 0, count = 0;
    for (const c of candidates) { if (acc >= remain) break; acc += c.gain; count++; }
    const totalAvailable = candidates.length;
    if (acc < remain) {
      const stillShort = remain - acc;
      el.innerHTML = `<div class="note" style="margin-top:8px">비어있는 칸을 <b>전부(${totalAvailable}칸)</b> ${sd.label}(으)로 채워도 최대 <b>${acc.toFixed(dp)}${unit}</b>까지고, 부족분 <b>${remain.toFixed(dp)}${unit}</b> 중 <b>${stillShort.toFixed(dp)}${unit}</b>는 마석/영석만으로는 못 채웁니다 — 펫 이해도나 영혼각인으로 채우세요.</div>`;
    } else {
      el.innerHTML = `<div class="note" style="margin-top:8px">부족분 ${remain.toFixed(dp)}${unit}는 빈 칸 중 최소 <b>${count}칸</b>(전체 빈 칸 ${totalAvailable}칸 중)을 최고 등급 ${sd.label}(으)로 채우면 됩니다.</div>`;
    }
  };

  const updateSum = () => {
    const sum = relevantParts.reduce((a, part) => a + goalManaPartContribution(part), 0);
    // 펫 이해도 쪽 입력은 별도 그리드(renderGoalPetGrid)가 실시간으로 갱신하므로,
    // 여기서도 화면에 지금 떠 있는 펫 총합을 그대로 읽어서 합친다(최신 값 보장).
    const livePetTotal = parseFloat(($('goalPetTotalDisplay') && $('goalPetTotalDisplay').textContent) || '0') || petActualTotal;
    const total = hasManual ? manualValue : (livePetTotal + engraveVal + sum);
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

  // count(이 부위에 목표 스탯이 몇 칸 들어있는지)만큼 수치 입력칸을 그린다.
  const renderValueInputs = part => {
    const container = $('goalManaValuesFor_' + part);
    if (!container) return;
    const count = goalManaCount[part] || 0;
    const values = goalManaValues[part] || (goalManaValues[part] = []);
    values.length = count; // 칸 수가 줄면 뒤쪽 값은 버리고, 늘면 undefined로 채워진다.
    if (!count) { container.innerHTML = `<div class="odd-nick">이 부위에 ${sd.label}이(가) 없다면 0칸으로 두세요.</div>`; return; }
    container.innerHTML = Array.from({ length: count }, (_, i) => `
      <div class="cost-cell" style="min-width:110px">
        <label>칸 ${i + 1}</label>
        <input type="number" class="goalManaValInput" data-part="${part}" data-i="${i}" value="${values[i] || 0}" step="${dp === 2 ? '0.1' : '1'}">
      </div>`).join('');
    for (let i = 0; i < count; i++) {
      const inp = document.querySelector(`.goalManaValInput[data-part="${part}"][data-i="${i}"]`);
      inp.addEventListener('input', () => {
        values[i] = parseFloat(inp.value) || 0;
        updatePartTotal(part);
        updateSum();
      });
    }
  };

  const renderCountSel = part => {
    const el = $('goalManaCountSel_' + part);
    if (!el) return;
    const max = goalManaSlotCount(part);
    const cur = Math.min(goalManaCount[part] || 0, max);
    el.innerHTML = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}칸</option>`).join('');
  };

  if (!relevantParts.length) { box.innerHTML = `<div class="odd-nick">이 스탯은 마석/영석 옵션이 없어서 입력할 부위가 없습니다.</div>`; return; }

  box.innerHTML = relevantParts.map(part => {
    const grade = goalManaGrade[part] || '유일';
    const best = bestFor(part);
    const partSum = goalManaPartContribution(part);
    return `
    <details class="card" style="margin-top:8px;padding:10px 12px" open>
      <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-weight:700">${part} <span style="font-weight:400;color:var(--muted);font-size:12px">(${stoneTypeFor(part)})</span></span>
        <span style="font-size:13px">현재 <b id="goalManaPartSubtotal_${part}" style="color:var(--gold)">${partSum.toFixed(dp)}${unit}</b></span>
      </summary>
      ${best ? `<div class="odd-nick" style="margin-top:4px">참고 — 이 부위 ${stoneTypeFor(part)} 최고값: ${best.item} ${best.stage} (${best.val.toFixed(dp)}${unit})</div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <div class="field" style="margin:0"><label>등급</label>
          <select class="goalManaGradeSel" data-part="${part}">
            <option value="유일" ${grade === '유일' ? 'selected' : ''}>유일 (4칸)</option>
            <option value="영웅" ${grade === '영웅' ? 'selected' : ''}>영웅 (5칸)</option>
          </select>
        </div>
        <div class="field" style="margin:0"><label>${sd.label} 몇 칸?</label>
          <select id="goalManaCountSel_${part}" data-part="${part}"></select>
        </div>
      </div>
      <div class="cost-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));margin-top:8px" id="goalManaValuesFor_${part}"></div>
    </details>`;
  }).join('') + `<div id="goalManaPriority"></div>`;

  relevantParts.forEach(part => {
    const gradeSel = document.querySelector(`.goalManaGradeSel[data-part="${part}"]`);
    gradeSel.addEventListener('change', () => {
      goalManaGrade[part] = gradeSel.value;
      renderCountSel(part);
      renderValueInputs(part);
      updatePartTotal(part);
      updateSum();
    });
    const countSel = $('goalManaCountSel_' + part);
    countSel.addEventListener('change', () => {
      goalManaCount[part] = parseInt(countSel.value, 10);
      renderValueInputs(part);
      updatePartTotal(part);
      updateSum();
    });
    renderCountSel(part);
    renderValueInputs(part);
  });

  updateSum();
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

renderGoalFinder();
