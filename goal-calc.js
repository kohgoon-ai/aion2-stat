const $ = id => document.getElementById(id);

// 스탯 카탈로그·마석/영석 옵션·펫 옵션 조회 함수는 gear-defs.js(공용) 참고.
// 이 페이지는 스탯 하나만 다루므로 PVE/PVP 탭·관심 스탯 필터 없이 STAT_DEFS 전체를 그대로 쓴다.
// 펫 이해도는 "챙길 옵션을 골라 범위 안에서 값을 가정"하는 방식이 아니라, 지금 실제로
// 캐릭터에 붙어 있는 총합을 ④에 직접 입력받는다(영혼각인과 동일한 방식) — 슬롯별 참고
// 범위는 computeGoalPath()가 계산해서 "얼마나 더 나올 수 있는지" 참고용으로만 보여준다.

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

// 부위별로 이미 챙긴 마석/영석 수치를 참고용으로 수기 입력하는 선택 섹션 — 스탯을 바꾸면 초기화된다.
let goalManaStatKey = null;
let goalManaEntries = {}; // part -> { grade: '유일'|'영웅', value: number }

// 종족별로 지금 이 스탯을 얼마나 챙겼는지 — 스탯을 바꾸면 초기화된다.
let goalPetStatKey = null;
let goalPetEntries = {}; // race -> value

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
  if (goalPetStatKey !== statKey) { goalPetStatKey = statKey; goalPetEntries = {}; }
  const sd = STAT_BY_KEY[statKey];
  const unit = sd.pct ? '%' : '';
  const dp = sd.pct ? 2 : 1;
  const { petRows, petByRace, stoneRows, spiritRows, noOptionRaces } = computeGoalPath(statKey);
  const petRacesWithOption = PET_RACES.filter(r => petByRace[r].slotCount > 0);
  const petActualTotal = petRows.reduce((a, r) => a + (goalPetEntries[`${r.race}__${r.slot}`] || 0), 0);
  const petAvgSum = petRacesWithOption.reduce((a, r) => a + petByRace[r].avgTotal, 0);

  const relevantParts = EQUIP_SLOTS.filter(part => {
    const type = stoneTypeFor(part);
    return (type === '마석' && stoneRows.length) || (type === '영석' && spiritRows.length);
  });
  const manaEnteredSum = relevantParts.reduce((a, part) => a + ((goalManaEntries[part] && goalManaEntries[part].value) || 0), 0);
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
      <div class="odd-nick" style="margin-top:6px">종족·슬롯마다 지금 이 스탯을 얼마나 챙겼는지 입력하세요 — 슬롯별로 입력해야 어느 슬롯이 낮아서 부족한지 알 수 있습니다. 각 종족 단락의 "평균 목표"는 그 종족 슬롯들을 평균만큼 챙겼을 때, "최대"는 전 슬롯이 최고값일 때 기준입니다.${petSynergyNote ? ' ' + petSynergyNote : ''}</div>
      <div id="goalPetGrid" style="margin-top:10px"></div>
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

  renderGoalPetGrid(petRows, petByRace, dp, unit, target, engraveVal, hasManual, manualValue);
  renderGoalManaGrid(statKey, relevantParts, sd, dp, unit, target, petActualTotal, engraveVal, hasManual, manualValue, stoneRows, spiritRows);
}

// 종족 총합 하나만 입력하면 "어느 슬롯이 낮아서 부족한지"를 알 수 없으니,
// 이 스탯을 챙길 수 있는 슬롯마다(종족별로 최대 9개) 따로 입력받는다.
function renderGoalPetGrid(petRows, petByRace, dp, unit, target, engraveVal, hasManual, manualValue) {
  const box = $('goalPetGrid');
  if (!box) return;
  if (!petRows.length) { box.innerHTML = `<div class="odd-nick">이 스탯을 주는 펫 이해도 옵션이 없습니다.</div>`; return; }

  const rowKey = r => `${r.race}__${r.slot}`;

  const updateAll = () => {
    const total = petRows.reduce((a, r) => a + (goalPetEntries[rowKey(r)] || 0), 0);
    const petTotalEl = $('goalPetTotalDisplay');
    if (petTotalEl) petTotalEl.textContent = `${total.toFixed(dp)}${unit}`;
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
  };

  const updateRaceSubtotal = race => {
    const el = $('goalPetRaceSubtotal_' + race);
    if (!el) return;
    const sum = petRows.filter(r => r.race === race).reduce((a, r) => a + (goalPetEntries[rowKey(r)] || 0), 0);
    el.textContent = `${sum.toFixed(dp)}${unit}`;
  };

  box.innerHTML = PET_RACES.filter(race => petByRace[race].slotCount > 0).map(race => {
    const rows = petRows.filter(r => r.race === race).sort((a, b) => a.slot - b.slot);
    const b = petByRace[race];
    const raceSum = rows.reduce((a, r) => a + (goalPetEntries[rowKey(r)] || 0), 0);
    return `
    <details class="card" style="margin-top:8px;padding:10px 12px" open>
      <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span style="font-weight:700">${race}</span>
        <span style="font-size:12px;color:var(--muted)">현재 <b id="goalPetRaceSubtotal_${race}" style="color:var(--txt)">${raceSum.toFixed(dp)}${unit}</b> · 평균 목표 ${b.avgTotal.toFixed(dp)}${unit} · 최대 ${b.maxTotal.toFixed(dp)}${unit}</span>
      </summary>
      <table class="odd-table" style="margin-top:8px">
        <thead><tr><th>슬롯</th><th>등급</th><th>범위(참고)</th><th>현재 챙긴 수치</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${r.slot}번</td>
            <td>${r.grade}</td>
            <td>${r.min}${unit} ~ ${r.max}${unit}</td>
            <td><input type="number" class="goalPetValInput" data-key="${rowKey(r)}" value="${goalPetEntries[rowKey(r)] || 0}" step="${dp === 2 ? '0.1' : '1'}" style="width:80px"></td>
          </tr>`).join('')}</tbody>
      </table>
    </details>`;
  }).join('');

  petRows.forEach(r => {
    const inp = document.querySelector(`.goalPetValInput[data-key="${rowKey(r)}"]`);
    inp.addEventListener('input', () => {
      goalPetEntries[rowKey(r)] = parseFloat(inp.value) || 0;
      updateRaceSubtotal(r.race);
      updateAll();
    });
  });
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
    // 자세한 설명(왜 +N인지, 무슨 아이템 기준인지)은 위쪽 마석/영석 단락 안내문 한 곳에만 적어두고,
    // 칸마다는 짧은 배지만 보여준다.
    hintEl.textContent = gap > 0 ? `+${gap.toFixed(dp)}${unit} 더 가능` : `최대치 도달`;
    hintEl.style.color = gap > 0 ? 'var(--gold)' : 'var(--muted)';
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
  if (!relevantParts.length) { box.innerHTML = `<div class="odd-nick">이 스탯은 마석/영석 옵션이 없어서 입력할 부위가 없습니다.</div>`; return; }
  box.innerHTML = `
    <div class="cost-grid" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">
      ${relevantParts.map(part => {
        const entry = goalManaEntries[part] || { grade: '유일', value: 0 };
        return `
        <div class="cost-cell">
          <label>${part} (${stoneTypeFor(part)})</label>
          <select class="goalManaGradeSel" data-part="${part}" style="width:100%;margin-bottom:4px;background:#12121c;border:1px solid var(--line);border-radius:6px;color:var(--txt);font-size:12px;padding:4px;font-family:inherit">
            <option value="유일" ${entry.grade === '유일' ? 'selected' : ''}>유일(4)</option>
            <option value="영웅" ${entry.grade === '영웅' ? 'selected' : ''}>영웅(5)</option>
          </select>
          <input type="number" class="goalManaValInput" data-part="${part}" value="${entry.value || 0}" step="${sd.pct ? '0.1' : '1'}">
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

renderGoalFinder();
