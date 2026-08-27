const $ = id => document.getElementById(id);

// 6개 방어 스탯 — 이름에 이 문자열이 들어간 옵션만 각 스탯으로 인정한다.
// "치명타 저항"은 공백 포함으로 매칭해야 "치명타"(치명타 확률)와 안 섞인다.
// "PVP 회피/명중/막기/치명타 저항"은 일반 버전과는 별개로 PVP 전투에서만 적용되는 다른 스탯이라
// 여기서 제외한다 — 안 걸러내면 마석 목록에서 일반 버전이랑 PVP 버전이 같은 통계로 합산돼버려서
// 총합이 실제보다 부풀려지는 계산 오류가 생긴다.
const isPvpStat = s => s.indexOf('PVP') >= 0;
const STATS = [
  { key: 'iron', label: '철벽', match: s => !isPvpStat(s) && s.indexOf('철벽') >= 0 },
  { key: 'regen', label: '재생', match: s => !isPvpStat(s) && s.indexOf('재생') >= 0 },
  { key: 'block', label: '막기', match: s => !isPvpStat(s) && s.indexOf('막기') >= 0 },
  { key: 'evade', label: '회피', match: s => !isPvpStat(s) && s.indexOf('회피') >= 0 },
  { key: 'hit', label: '명중', match: s => !isPvpStat(s) && s.indexOf('명중') >= 0 },
  { key: 'critres', label: '치명타 저항', match: s => !isPvpStat(s) && s.indexOf('치명타 저항') >= 0 },
];
const STAT_OF = stat => (STATS.find(sd => sd.match(stat)) || null);

const EQUIP_SLOTS = ['무기', '투구', '상의', '하의', '장갑', '신발', '견갑', '망토', '목걸이', '반지1', '반지2', '귀걸이1', '귀걸이2', '브로치'];
const GRADE_MAX = { '유일': 4, '영웅': 5 };

const PET_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ---------- 마석/영석: 6개 스탯에 해당하는 (아이템,단계,스탯,수치) 전부를 한 번만 뽑아둔다 ----------
const MANA_OPTIONS = []; // [{item, stage, stat, val, statKey, label}]
(function buildManaOptions() {
  const STAGE_ORDER = ['기본', '상급', '최상급'];
  Object.keys(MANASTONE_DATA).forEach(item => {
    STAGE_ORDER.forEach(stage => {
      const st = MANASTONE_DATA[item][stage];
      if (!st) return;
      st.opts.forEach(([stat, val]) => {
        const sd = STAT_OF(stat);
        if (!sd) return;
        MANA_OPTIONS.push({ item, stage, stat, val: parseFloat(val), statKey: sd.key, label: `${item} ${stage} · ${stat} (${val})` });
      });
    });
  });
  MANA_OPTIONS.sort((a, b) => b.val - a.val);
  MANA_OPTIONS.forEach((o, i) => { o.idx = i; });
})();

// ---------- 펫: 종족·슬롯별 유일·영웅 등급 옵션 전부(스탯 종류 제한 없음) ----------
// 유일/영웅만 보는 이유: 그 아래 등급은 실전에서 챙길 만한 수치가 아니라서 제외.
// 스탯 종류를 6개로 좁히지 않고 전부 보여주되, 그중 6개 방어 스탯에 해당하는 것만
// 아래 "총합 요약"에 statKey로 집계되고 나머지는 슬롯 표에서만 확인 가능하다.
const PET_GRADES_SHOWN = ['유일', '영웅'];
function petMatchesForSlot(race, slot) {
  const out = [];
  PET_GRADES_SHOWN.forEach(g => {
    (PET_OPTIONS[race][String(slot)][g] || []).forEach(([stat, range]) => {
      const sd = STAT_OF(stat);
      out.push({ grade: g, stat, range, statKey: sd ? sd.key : null });
    });
  });
  return out;
}
function parseRange(rangeStr) {
  const isPercent = rangeStr.indexOf('%') >= 0;
  const nums = rangeStr.replace(/%/g, '').split('~').map(s => parseFloat(s.trim()));
  return { min: nums[0], max: nums.length > 1 ? nums[1] : nums[0], isPercent };
}

// ---------- 상태 ----------
const petState = PET_SLOTS.reduce((acc, s) => { acc[s] = { idx: -1, value: 0 }; return acc; }, {});
const gearState = EQUIP_SLOTS.reduce((acc, part) => {
  acc[part] = {
    grade: '유일',
    manaTargets: [], // [{idx into MANA_OPTIONS}]
    engrave: STATS.reduce((e, sd) => { e[sd.key] = 0; return e; }, {}),
  };
  return acc;
}, {});

// ---------- 펫 이해도 렌더 ----------
function renderPetTable() {
  const race = $('petRace').value;
  $('petTable').innerHTML = `
    <table class="odd-table">
      <thead><tr><th>슬롯</th><th>챙길 스탯 옵션</th><th>수치</th></tr></thead>
      <tbody>${PET_SLOTS.map(s => `
        <tr>
          <td>${s}번</td>
          <td><select class="petSel" data-slot="${s}"></select></td>
          <td id="petValCell${s}"></td>
        </tr>`).join('')}</tbody>
    </table>`;
  PET_SLOTS.forEach(s => {
    const matches = petMatchesForSlot(race, s);
    petState[s].idx = -1; // 종족 바뀌면 매칭 목록이 달라지므로 선택 초기화
    const sel = document.querySelector(`.petSel[data-slot="${s}"]`);
    const tagged = matches.map((m, i) => ({ ...m, i }));
    const main = tagged.filter(m => m.statKey);
    const other = tagged.filter(m => !m.statKey);
    const optHtml = m => `<option value="${m.i}">[${m.grade}] ${m.stat} (${m.range})</option>`;
    sel.innerHTML = `<option value="-1">— 선택 안함 —</option>` +
      (main.length ? `<optgroup label="방어 스탯 (요약에 포함)">${main.map(optHtml).join('')}</optgroup>` : '') +
      (other.length ? `<optgroup label="기타 옵션 (요약 미포함)">${other.map(optHtml).join('')}</optgroup>` : '');
    sel._matches = matches;
    sel.addEventListener('change', () => {
      petState[s].idx = parseInt(sel.value, 10);
      renderPetValueCell(s);
      calc();
    });
    renderPetValueCell(s);
  });
}
function renderPetValueCell(s) {
  const cell = $('petValCell' + s);
  const sel = document.querySelector(`.petSel[data-slot="${s}"]`);
  const idx = petState[s].idx;
  if (idx < 0 || !sel._matches[idx]) { cell.innerHTML = '—'; return; }
  const m = sel._matches[idx];
  const range = parseRange(m.range);
  if (petState[s].value === 0 || petState[s].value < range.min || petState[s].value > range.max) {
    petState[s].value = range.max; // 기본값: 그 옵션의 최댓값
  }
  cell.innerHTML = `<input type="number" class="petValInput" data-slot="${s}" value="${petState[s].value}" min="${range.min}" max="${range.max}" step="${range.isPercent ? '0.1' : '1'}" style="width:70px"> <span class="odd-nick">(${m.range})</span>`;
  cell.querySelector('.petValInput').addEventListener('input', e => {
    const range2 = parseRange(sel._matches[idx].range);
    let v = parseFloat(e.target.value) || 0;
    v = Math.max(range2.min, Math.min(range2.max, v));
    petState[s].value = v;
    calc();
  });
}

// ---------- 장비 부위 렌더 ----------
function renderGearParts() {
  $('gearParts').innerHTML = EQUIP_SLOTS.map(part => `
    <div class="card" style="margin-top:16px">
      <h2>${part}</h2>
      <div class="field"><label>등급</label>
        <select class="gradeSel" data-part="${part}">
          <option value="유일">유일 (4칸)</option>
          <option value="영웅">영웅 (5칸)</option>
        </select>
      </div>
      <div class="field"><label>마석/영석 사용 칸 수</label>
        <select class="manaCountSel" data-part="${part}"></select>
      </div>
      <div id="manaRows-${part}"></div>
      <div class="sect" style="margin-top:14px">영혼각인 (직접 입력 · 데이터 없음)</div>
      <div class="cost-grid">
        ${STATS.map(sd => `
          <div class="cost-cell">
            <label>${sd.label}</label>
            <input type="number" class="engraveInput" data-part="${part}" data-stat="${sd.key}" value="0" step="1">
          </div>`).join('')}
      </div>
    </div>`).join('');

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
    renderManaCountSel(part);
    renderManaRows(part);

    STATS.forEach(sd => {
      const inp = document.querySelector(`.engraveInput[data-part="${part}"][data-stat="${sd.key}"]`);
      inp.addEventListener('input', () => {
        gearState[part].engrave[sd.key] = parseFloat(inp.value) || 0;
        calc();
      });
    });
  });
}

function renderManaCountSel(part) {
  const max = GRADE_MAX[gearState[part].grade];
  const sel = document.querySelector(`.manaCountSel[data-part="${part}"]`);
  const cur = Math.min(gearState[part].manaTargets.length, max);
  sel.innerHTML = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}" ${n === cur ? 'selected' : ''}>${n}칸</option>`).join('');
  sel.onchange = () => {
    const n = parseInt(sel.value, 10);
    const targets = gearState[part].manaTargets;
    // 새 칸을 추가할 때마다 매번 idx:0(전체 1위 옵션)만 기본으로 잡으면 여러 칸이 전부 같은
    // 옵션으로 겹쳐 보여 헷갈리므로, 칸마다 서로 다른 스탯의 1위 옵션이 기본으로 잡히게 한다.
    // (철벽·재생은 마석/영석에 아예 없는 옵션이라 STATS_WITH_MANA로 걸러서 순환한다.)
    const statsWithMana = STATS.filter(sd => MANA_OPTIONS.some(o => o.statKey === sd.key));
    while (targets.length < n) {
      const sd = statsWithMana[targets.length % statsWithMana.length];
      const best = MANA_OPTIONS.find(o => o.statKey === sd.key);
      targets.push({ idx: best ? best.idx : 0 });
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
  box.innerHTML = `
    <table class="odd-table">
      <thead><tr><th>#</th><th>마석/영석 · 스탯 (수치)</th></tr></thead>
      <tbody>${targets.map((t, i) => `
        <tr><td>${i + 1}</td><td><select class="manaTargetSel" data-part="${part}" data-i="${i}"></select></td></tr>`).join('')}</tbody>
    </table>`;
  targets.forEach((t, i) => {
    const sel = document.querySelector(`.manaTargetSel[data-part="${part}"][data-i="${i}"]`);
    sel.innerHTML = STATS.map(sd => {
      const opts = MANA_OPTIONS.filter(o => o.statKey === sd.key);
      if (!opts.length) return '';
      return `<optgroup label="${sd.label}">${opts.map(o => `<option value="${o.idx}">${o.label}</option>`).join('')}</optgroup>`;
    }).join('');
    sel.value = String(t.idx);
    if (sel.value !== String(t.idx)) { t.idx = parseInt(sel.value, 10) || MANA_OPTIONS[0].idx; }
    sel.addEventListener('change', () => {
      t.idx = parseInt(sel.value, 10);
      calc();
    });
  });
}

// ---------- 합산 & 요약 ----------
function calc() {
  const petTotals = STATS.reduce((a, sd) => { a[sd.key] = 0; return a; }, {});
  const manaTotals = STATS.reduce((a, sd) => { a[sd.key] = 0; return a; }, {});
  const engraveTotals = STATS.reduce((a, sd) => { a[sd.key] = 0; return a; }, {});

  PET_SLOTS.forEach(s => {
    const idx = petState[s].idx;
    if (idx < 0) return;
    const sel = document.querySelector(`.petSel[data-slot="${s}"]`);
    const m = sel && sel._matches && sel._matches[idx];
    if (!m || !m.statKey) return; // 6개 방어 스탯에 해당 안 되는 옵션은 요약 합계에서 제외
    petTotals[m.statKey] += petState[s].value;
  });

  EQUIP_SLOTS.forEach(part => {
    gearState[part].manaTargets.forEach(t => {
      const o = MANA_OPTIONS[t.idx];
      if (o) manaTotals[o.statKey] += o.val;
    });
    STATS.forEach(sd => { engraveTotals[sd.key] += gearState[part].engrave[sd.key] || 0; });
  });

  $('summaryTable').innerHTML = `
    <table class="odd-table">
      <thead><tr><th>스탯</th><th>펫 이해도</th><th>마석/영석 (14부위 합)</th><th>영혼각인 (14부위 합 · 직접입력)</th><th>총합</th></tr></thead>
      <tbody>${STATS.map(sd => {
        const total = petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key];
        return `<tr>
          <td>${sd.label}</td>
          <td>${petTotals[sd.key].toFixed(1)}</td>
          <td>${manaTotals[sd.key].toFixed(1)}</td>
          <td>${engraveTotals[sd.key].toFixed(1)}</td>
          <td class="odd-eff">${total.toFixed(1)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
}

$('petRace').addEventListener('change', () => { renderPetTable(); calc(); });

renderPetTable();
renderGearParts();
calc();
