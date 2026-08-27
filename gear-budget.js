const $ = id => document.getElementById(id);

// ---------- 스탯 카탈로그 ----------
// mode: 'general'(PVE·PVP 공통) | 'pve'(PVE 탭에서만) | 'pvp'(PVP 탭에서만)
// names: 실제 데이터(마석/영석·펫 이해도)에 등장하는 정확한 스탯 표기 — 부분일치가 아니라
// 정확히 일치하는 것만 매칭한다("치명타"가 "치명타 저항"/"치명타 공격력" 등과 안 섞이도록).
const CATEGORIES = [
  { key: 'offense', label: '공격' },
  { key: 'defense', label: '방어' },
  { key: 'amplify', label: '피해 증폭·내성' },
  { key: 'misc', label: '기타' },
];
const STAT_DEFS = [
  { key: 'atk', label: '공격력', cat: 'offense', mode: 'general', names: ['공격력'] },
  { key: 'atk_add', label: '추가 공격력', cat: 'offense', mode: 'general', names: ['추가 공격력'] },
  { key: 'atk_max', label: '최대 공격력', cat: 'offense', mode: 'general', names: ['최대 공격력'] },
  // "위력"·"파괴"는 공격력을 %만큼 증가시키는 스탯(스탯 계산기 참고: 위력 1당 0.1%, 파괴 1당 0.2%).
  // 마석/영석·펫 이해도 데이터엔 없고 영혼각인에만 있는 걸로 확인돼 직접 입력 목록에 추가.
  { key: 'power', label: '위력', cat: 'offense', mode: 'general', names: ['위력'] },
  { key: 'destr', label: '파괴', cat: 'offense', mode: 'general', names: ['파괴'] },
  // "공격력 증가"는 스탯창의 flat "공격력"과 별개로, 영혼각인에 %로 붙는 공격력 증가 스탯.
  { key: 'atk_pct', label: '공격력 증가', cat: 'offense', mode: 'general', names: ['공격력 증가'], pct: true },
  { key: 'atk_crit', label: '치명타 공격력', cat: 'offense', mode: 'general', names: ['치명타 공격력'] },
  { key: 'atk_back', label: '후방 공격력', cat: 'offense', mode: 'general', names: ['후방 공격력'] },
  { key: 'atk_front', label: '전방 공격력', cat: 'offense', mode: 'general', names: ['전방 공격력'] },
  { key: 'critrate', label: '치명타', cat: 'offense', mode: 'general', names: ['치명타'] },
  { key: 'pen', label: '관통', cat: 'offense', mode: 'general', names: ['관통'] },
  { key: 'smite', label: '강타', cat: 'offense', mode: 'general', names: ['강타'], pct: true },
  { key: 'backcrit', label: '후방 치명타', cat: 'offense', mode: 'general', names: ['후방 치명타'] },
  { key: 'frontcrit', label: '전방 치명타', cat: 'offense', mode: 'general', names: ['전방 치명타'] },
  { key: 'boss_atk', label: '보스 공격력', cat: 'offense', mode: 'pve', names: ['보스 공격력'] },
  { key: 'pve_atk', label: 'PVE 공격력', cat: 'offense', mode: 'pve', names: ['PVE 공격력'] },
  { key: 'pvp_atk', label: 'PVP 공격력', cat: 'offense', mode: 'pvp', names: ['PVP 공격력'] },
  { key: 'pvp_critrate', label: 'PVP 치명타', cat: 'offense', mode: 'pvp', names: ['PVP 치명타'] },

  { key: 'def', label: '방어력', cat: 'defense', mode: 'general', names: ['방어력'] },
  { key: 'def_add', label: '추가 방어력', cat: 'defense', mode: 'general', names: ['추가 방어력'] },
  { key: 'def_back', label: '후방 방어력', cat: 'defense', mode: 'general', names: ['후방 방어력'] },
  { key: 'def_front', label: '전방 방어력', cat: 'defense', mode: 'general', names: ['전방 방어력'] },
  { key: 'def_crit', label: '치명타 방어력', cat: 'defense', mode: 'general', names: ['치명타 방어력'] },
  { key: 'block', label: '막기', cat: 'defense', mode: 'general', names: ['막기'] },
  { key: 'evade', label: '회피', cat: 'defense', mode: 'general', names: ['추가 회피'] },
  { key: 'hit', label: '명중', cat: 'defense', mode: 'general', names: ['추가 명중'] },
  { key: 'critres', label: '치명타 저항', cat: 'defense', mode: 'general', names: ['치명타 저항'] },
  { key: 'backcritres', label: '후방 치명타 저항', cat: 'defense', mode: 'general', names: ['후방 치명타 저항'] },
  { key: 'frontcritres', label: '전방 치명타 저항', cat: 'defense', mode: 'general', names: ['전방 치명타 저항'] },
  { key: 'ironwall', label: '철벽', cat: 'defense', mode: 'general', names: ['철벽'], pct: true },
  { key: 'regen', label: '재생', cat: 'defense', mode: 'general', names: ['재생'], pct: true },
  { key: 'pve_def', label: 'PVE 방어력', cat: 'defense', mode: 'pve', names: ['PVE 방어력'] },
  { key: 'pvp_def', label: 'PVP 방어력', cat: 'defense', mode: 'pvp', names: ['PVP 방어력'] },
  { key: 'pvp_hit', label: 'PVP 명중', cat: 'defense', mode: 'pvp', names: ['PVP 명중'] },
  { key: 'pvp_evade', label: 'PVP 회피', cat: 'defense', mode: 'pvp', names: ['PVP 회피'] },
  { key: 'pvp_critres', label: 'PVP 치명타 저항', cat: 'defense', mode: 'pvp', names: ['PVP 치명타 저항'] },
  { key: 'pvp_block', label: 'PVP 막기', cat: 'defense', mode: 'pvp', names: ['PVP 막기'] },

  { key: 'dmgamp', label: '피해 증폭', cat: 'amplify', mode: 'general', names: ['피해 증폭'], pct: true },
  { key: 'wdmgamp', label: '무기 피해 증폭', cat: 'amplify', mode: 'general', names: ['무기 피해 증폭'], pct: true },
  { key: 'backdmgamp', label: '후방 피해 증폭', cat: 'amplify', mode: 'general', names: ['후방 피해 증폭'], pct: true },
  { key: 'frontdmgamp', label: '전방 피해 증폭', cat: 'amplify', mode: 'general', names: ['전방 피해 증폭'], pct: true },
  { key: 'critdmgamp', label: '치명타 피해 증폭', cat: 'amplify', mode: 'general', names: ['치명타 피해 증폭'], pct: true },
  { key: 'racedmgamp', label: '종족 피해 증폭', cat: 'amplify', mode: 'general', names: ['지성족 피해 증폭', '야성족 피해 증폭', '자연족 피해 증폭', '변형족 피해 증폭'], pct: true },
  { key: 'perfect', label: '완벽', cat: 'amplify', mode: 'general', names: ['완벽'], pct: true },
  { key: 'pve_dmgamp', label: 'PVE 피해 증폭', cat: 'amplify', mode: 'pve', names: ['PVE 피해 증폭'], pct: true },
  { key: 'pvp_dmgamp', label: 'PVP 피해 증폭', cat: 'amplify', mode: 'pvp', names: ['PVP 피해 증폭'], pct: true },
  { key: 'dmgres', label: '피해 내성', cat: 'amplify', mode: 'general', names: ['피해 내성'], pct: true },
  { key: 'wdmgres', label: '무기 피해 내성', cat: 'amplify', mode: 'general', names: ['무기 피해 내성'], pct: true },
  { key: 'backdmgres', label: '후방 피해 내성', cat: 'amplify', mode: 'general', names: ['후방 피해 내성'], pct: true },
  { key: 'frontdmgres', label: '전방 피해 내성', cat: 'amplify', mode: 'general', names: ['전방 피해 내성'], pct: true },
  { key: 'critdmgres', label: '치명타 피해 내성', cat: 'amplify', mode: 'general', names: ['치명타 피해 내성'], pct: true },
  { key: 'racedmgres', label: '종족 피해 내성', cat: 'amplify', mode: 'general', names: ['지성족 피해 내성', '야성족 피해 내성', '자연족 피해 내성', '변형족 피해 내성'], pct: true },
  { key: 'pve_dmgres', label: 'PVE 피해 내성', cat: 'amplify', mode: 'pve', names: ['PVE 피해 내성'], pct: true },

  { key: 'hp', label: '생명력', cat: 'misc', mode: 'general', names: ['생명력'] },
  { key: 'mp', label: '정신력', cat: 'misc', mode: 'general', names: ['정신력'] },
  { key: 'soulstone', label: '봉혼석 추가 피해', cat: 'misc', mode: 'general', names: ['봉혼석 추가 피해'] },
];
const STAT_BY_KEY = {};
STAT_DEFS.forEach(sd => { STAT_BY_KEY[sd.key] = sd; });
const NAME_TO_STAT = {};
STAT_DEFS.forEach(sd => sd.names.forEach(n => { NAME_TO_STAT[n] = sd; }));
const STAT_OF = rawName => NAME_TO_STAT[rawName] || null;
function statsForMode(mode) { return STAT_DEFS.filter(sd => sd.mode === 'general' || sd.mode === mode); }

const EQUIP_SLOTS = ['무기', '투구', '상의', '하의', '장갑', '신발', '견갑', '망토', '목걸이', '반지1', '반지2', '귀걸이1', '귀걸이2', '브로치'];
// 무기·방어구엔 마석만, 악세서리(목걸이·반지·귀걸이·브로치)엔 영석만 박을 수 있다.
const ACCESSORY_SLOTS = new Set(['목걸이', '반지1', '반지2', '귀걸이1', '귀걸이2', '브로치']);
const stoneTypeFor = part => (ACCESSORY_SLOTS.has(part) ? '영석' : '마석');
const GRADE_MAX = { '유일': 4, '영웅': 5 };
const PET_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PET_GRADES_SHOWN = ['유일', '영웅'];

let activeMode = 'pve'; // 'pve' | 'pvp'
let focusStats = new Set(); // 관심 스탯으로 고른 키들 — 비어있으면 필터 없이 전체 표시
function visibleStats() {
  const modeStats = statsForMode(activeMode);
  if (focusStats.size === 0) return modeStats;
  return modeStats.filter(sd => focusStats.has(sd.key));
}

// 마석/영석 원문 표는 증폭·내성류도 "%" 표기 없이 raw 수치(예: 100)로만 나온다.
// 이 프로젝트 스탯 계산기(index.html/app.js)에서 이미 쓰고 있는 "raw 100 ≈ +1.2%p(사용자 실측 제보 기준)"
// 환산을 그대로 적용해 raw 값을 %p로 바꿔서 합산한다 — 공식 수치가 아닌 커뮤니티 추정 환산값이다.
const RAW_TO_PCT = 1.2 / 100;

// ---------- 마석/영석: 매칭되는 (아이템,단계,스탯,수치) 전부를 한 번만 뽑아둔다 ----------
const MANA_OPTIONS = [];
(function buildManaOptions() {
  const STAGE_ORDER = ['기본', '상급', '최상급'];
  Object.keys(MANASTONE_DATA).forEach(item => {
    STAGE_ORDER.forEach(stage => {
      const st = MANASTONE_DATA[item][stage];
      if (!st) return;
      st.opts.forEach(([stat, val]) => {
        const sd = STAT_OF(stat);
        if (!sd) return;
        const raw = parseFloat(val);
        const isPct = !!sd.pct;
        const finalVal = isPct ? raw * RAW_TO_PCT : raw;
        const label = isPct
          ? `${item} ${stage} · ${stat} (raw ${raw} → 약 ${finalVal.toFixed(2)}%p 환산)`
          : `${item} ${stage} · ${stat} (${raw})`;
        MANA_OPTIONS.push({ item, stage, stat, val: finalVal, rawVal: raw, isPct, statKey: sd.key, label });
      });
    });
  });
  MANA_OPTIONS.sort((a, b) => b.val - a.val);
  MANA_OPTIONS.forEach((o, i) => { o.idx = i; });
})();

// ---------- 펫: 종족·슬롯별 유일·영웅 등급 옵션 전부 ----------
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

// ---------- 상태 (PVE/PVP 탭 전환과 무관하게 공유 — 같은 장비/펫 세팅을 다른 관점으로 볼 뿐) ----------
const petState = PET_SLOTS.reduce((acc, s) => { acc[s] = { idx: -1, value: 0 }; return acc; }, {});
const gearState = EQUIP_SLOTS.reduce((acc, part) => {
  acc[part] = { grade: '유일', manaTargets: [], engrave: {} }; // engrave: { [statKey]: value }
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
  renderPetTable();
  renderGearParts();
  renderGoalFinder();
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
      renderPetTable();
      renderGearParts();
      renderGoalFinder();
      calc();
    });
  });
  $('clearFocusBtn').addEventListener('click', () => {
    focusStats.clear();
    renderFocusPicker();
    renderPetTable();
    renderGearParts();
    renderGoalFinder();
    calc();
  });
}

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
  const shown = new Set(visibleStats().map(sd => sd.key));
  PET_SLOTS.forEach(s => {
    const matches = petMatchesForSlot(race, s);
    const prevIdx = petState[s].idx;
    const prevMatch = prevIdx >= 0 ? matches.find(m => m.statKey && m.stat === (document.querySelector(`.petSel[data-slot="${s}"]`)._prevStat || '')) : null;
    petState[s].idx = -1;
    const sel = document.querySelector(`.petSel[data-slot="${s}"]`);
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
    petState[s].value = range.max;
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
      <div class="field"><label>${stoneTypeFor(part)} 사용 칸 수</label>
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

// 펫 이해도 9슬롯은 3개씩 방어(1·4·7)/공격(2·5·8)/증폭·내성(3·6·9) 전용으로 나뉜다.
// 3·6·9엔 막기·치명타처럼 다른 슬롯에도 공통으로 뜨는 옵션이 데이터상 같이 섞여 있지만,
// 실제로는 증폭·내성류를 챙기는 슬롯이라 증폭·내성이 아닌 스탯을 계산할 땐 제외해야 한다.
const PET_AMPRES_SLOTS = new Set([3, 6, 9]);

// ---------- 목표 수치 달성 경로: 스탯 하나를 어디서 얼마나 챙길 수 있는지 ----------
function computeGoalPath(statKey) {
  const sd = STAT_BY_KEY[statKey];
  const race = $('petRace').value;
  const petRows = [];
  let petMaxTotal = 0;
  PET_SLOTS.forEach(s => {
    if (!sd.pct && PET_AMPRES_SLOTS.has(s)) return;
    const matches = petMatchesForSlot(race, s).filter(m => m.statKey === statKey);
    if (!matches.length) return;
    let best = null, bestMax = -Infinity;
    matches.forEach(m => {
      const r = parseRange(m.range);
      if (r.max > bestMax) { bestMax = r.max; best = { grade: m.grade, range: m.range, max: r.max }; }
    });
    if (best) { petRows.push({ slot: s, grade: best.grade, range: best.range, max: best.max }); petMaxTotal += best.max; }
  });

  const manaOpts = MANA_OPTIONS.filter(o => o.statKey === statKey);
  const stoneRows = manaOpts.filter(o => o.item.indexOf('마석') >= 0).sort((a, b) => b.val - a.val).slice(0, 3);
  const spiritRows = manaOpts.filter(o => o.item.indexOf('영석') >= 0).sort((a, b) => b.val - a.val).slice(0, 3);

  return { race, petRows, petMaxTotal, stoneRows, spiritRows };
}

function renderGoalResult() {
  const statKey = $('goalStat').value;
  const target = parseFloat($('goalTarget').value) || 0;
  const box = $('goalResult');
  if (!statKey) { box.innerHTML = ''; return; }
  const sd = STAT_BY_KEY[statKey];
  const unit = sd.pct ? '%' : '';
  const dp = sd.pct ? 2 : 1;
  const { race, petRows, petMaxTotal, stoneRows, spiritRows } = computeGoalPath(statKey);
  const bestMana = [stoneRows[0], spiritRows[0]].filter(Boolean).sort((a, b) => b.val - a.val)[0];
  const remain = target - petMaxTotal;

  let suggestion;
  if (petMaxTotal <= 0 && !bestMana) {
    suggestion = `마석/영석·펫 이해도 데이터엔 이 스탯이 없습니다 — 영혼각인으로만 챙길 수 있는 스탯으로 보입니다(위 카드에서 부위별로 직접 입력).`;
  } else if (target <= petMaxTotal) {
    suggestion = `펫 이해도 슬롯만으로도 목표 ${target}${unit} 달성 가능합니다 (전 슬롯을 이 스탯으로 채우면 최대 ${petMaxTotal.toFixed(dp)}${unit}).`;
  } else if (bestMana) {
    const manaSlotsNeeded = Math.ceil(remain / bestMana.val);
    const isStone = bestMana.item.indexOf('마석') >= 0;
    const slotCap = (isStone ? (EQUIP_SLOTS.length - ACCESSORY_SLOTS.size) : ACCESSORY_SLOTS.size) * GRADE_MAX['영웅'];
    const overCap = manaSlotsNeeded > slotCap;
    suggestion = `펫 이해도 전 슬롯을 이 스탯으로 채워도 최대 ${petMaxTotal.toFixed(dp)}${unit}입니다. 부족한 ${remain.toFixed(dp)}${unit}는 <b>${bestMana.item} ${bestMana.stage}</b>(칸당 ${bestMana.val.toFixed(dp)}${unit}) 기준 약 <b>${manaSlotsNeeded}칸</b>이 더 필요합니다.` +
      (overCap ? ` 다만 ${isStone ? '무기·방어구' : '악세서리'} 전체 칸 수는 최대 ${slotCap}칸뿐이라 이 스탯 하나만으로는 현실적으로 다 못 채웁니다 — 다른 스탯과 나눠 챙기거나 영혼각인 비중을 늘려야 합니다.` : ` 그래도 부족하면 영혼각인으로 나머지를 채우세요.`);
  } else {
    suggestion = `펫 이해도 최대 ${petMaxTotal.toFixed(dp)}${unit}로는 목표에 못 미치고, 마석/영석엔 이 스탯 옵션이 없습니다 — 나머지는 영혼각인으로 채워야 합니다.`;
  }

  const petTableHtml = petRows.length ? `
    <table class="odd-table">
      <thead><tr><th>펫 슬롯</th><th>등급</th><th>범위</th></tr></thead>
      <tbody>${petRows.map(r => `<tr><td>${r.slot}번</td><td>${r.grade}</td><td>${r.range}</td></tr>`).join('')}</tbody>
    </table>` : `<div class="odd-nick">이 스탯을 주는 펫 이해도 옵션이 없습니다.</div>`;
  const manaTableHtml = rows => rows.length
    ? `<table class="odd-table"><thead><tr><th>아이템·단계</th><th>수치</th></tr></thead><tbody>${rows.map(o => `<tr><td>${o.item} ${o.stage}</td><td>${o.val.toFixed(dp)}${unit}</td></tr>`).join('')}</tbody></table>`
    : `<div class="odd-nick">해당 옵션 없음</div>`;

  box.innerHTML = `
    <div class="note" style="margin-top:0">${suggestion}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
      <div>
        <div class="engrave-cat-label">펫 이해도 (종족: ${race}) — 슬롯당 최대</div>
        ${petTableHtml}
      </div>
      <div>
        <div class="engrave-cat-label">마석 (무기/방어구)</div>
        ${manaTableHtml(stoneRows)}
        <div class="engrave-cat-label" style="margin-top:10px">영석 (악세서리)</div>
        ${manaTableHtml(spiritRows)}
      </div>
    </div>`;
}

function renderGoalFinder() {
  const sel = $('goalStat');
  const prev = sel.value;
  const shown = visibleStats();
  sel.innerHTML = CATEGORIES.map(c => {
    const opts = shown.filter(sd => sd.cat === c.key);
    if (!opts.length) return '';
    return `<optgroup label="${c.label}">${opts.map(sd => `<option value="${sd.key}">${sd.label}${sd.pct ? ' (%)' : ''}</option>`).join('')}</optgroup>`;
  }).join('');
  if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
  renderGoalResult();
}

// ---------- 합산 & 요약 ----------
function calc() {
  const shown = visibleStats();
  const petTotals = {}, manaTotals = {}, engraveTotals = {};
  shown.forEach(sd => { petTotals[sd.key] = 0; manaTotals[sd.key] = 0; engraveTotals[sd.key] = 0; });
  const shownKeys = new Set(shown.map(sd => sd.key));

  PET_SLOTS.forEach(s => {
    const idx = petState[s].idx;
    if (idx < 0) return;
    const sel = document.querySelector(`.petSel[data-slot="${s}"]`);
    const m = sel && sel._matches && sel._matches[idx];
    if (!m || !m.statKey || !shownKeys.has(m.statKey)) return;
    petTotals[m.statKey] += petState[s].value;
  });

  EQUIP_SLOTS.forEach(part => {
    let manaSum = 0, engraveSum = 0;
    gearState[part].manaTargets.forEach(t => {
      const o = MANA_OPTIONS[t.idx];
      if (o && shownKeys.has(o.statKey)) { manaTotals[o.statKey] += o.val; manaSum += o.val; }
    });
    let engraveN = 0;
    Object.keys(gearState[part].engrave).forEach(key => {
      const v = gearState[part].engrave[key] || 0;
      if (v && shownKeys.has(key)) { engraveTotals[key] += v; engraveSum += v; engraveN++; }
    });
    const badge = $('partBadge-' + part);
    if (badge) {
      const manaN = gearState[part].manaTargets.length;
      badge.textContent = `${gearState[part].grade} · 마석 ${manaN}칸(${manaSum.toFixed(0)}) · 각인 ${engraveN}개(${engraveSum.toFixed(0)})`;
    }
  });

  const showAll = $('showAllStatsChk') && $('showAllStatsChk').checked;
  const rowsByCategory = CATEGORIES.map(c => {
    const catStats = shown.filter(sd => sd.cat === c.key).filter(sd => {
      if (showAll) return true;
      return petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key] > 0;
    });
    return { c, catStats };
  }).filter(g => g.catStats.length);

  if (rowsByCategory.length === 0) {
    $('summaryTable').innerHTML = `<div class="odd-nick" style="padding:10px 0">아직 입력한 값이 없습니다 — 아래 "펫 이해도 기여분"과 각 장비 부위 카드에서 마석/영석·영혼각인 수치를 입력하면 여기 표시됩니다.</div>`;
    return;
  }
  $('summaryTable').innerHTML = `
    <table class="odd-table">
      <thead><tr><th>스탯</th><th>펫 이해도</th><th>마석/영석</th><th>영혼각인</th><th>총합</th></tr></thead>
      <tbody>${rowsByCategory.map(({ c, catStats }) => {
        return `<tr class="cat-row"><td colspan="5">${c.label}</td></tr>` + catStats.map(sd => {
          const total = petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key];
          const unit = sd.pct ? '%' : '';
          return `<tr>
            <td>${sd.label}${sd.pct ? ' <span class="odd-nick">(%)</span>' : ''}</td>
            <td>${petTotals[sd.key].toFixed(1)}${unit}</td>
            <td>${manaTotals[sd.key].toFixed(1)}${unit}</td>
            <td>${engraveTotals[sd.key].toFixed(1)}${unit}</td>
            <td class="odd-eff">${total.toFixed(1)}${unit}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table>`;
}

$('petRace').addEventListener('change', () => { renderPetTable(); renderGoalResult(); calc(); });
$('showAllStatsChk').addEventListener('change', calc);
$('goalStat').addEventListener('change', renderGoalResult);
$('goalTarget').addEventListener('input', renderGoalResult);

renderFocusPicker();
renderTabs();
renderPetTable();
renderGearParts();
renderGoalFinder();
calc();
