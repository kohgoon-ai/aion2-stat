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
  { key: 'atk_crit', label: '치명타 공격력', cat: 'offense', mode: 'general', names: ['치명타 공격력'] },
  { key: 'atk_back', label: '후방 공격력', cat: 'offense', mode: 'general', names: ['후방 공격력'] },
  { key: 'atk_front', label: '전방 공격력', cat: 'offense', mode: 'general', names: ['전방 공격력'] },
  { key: 'critrate', label: '치명타', cat: 'offense', mode: 'general', names: ['치명타'] },
  { key: 'pen', label: '관통', cat: 'offense', mode: 'general', names: ['관통'] },
  { key: 'smite', label: '강타', cat: 'offense', mode: 'general', names: ['강타'] },
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
  { key: 'ironwall', label: '철벽', cat: 'defense', mode: 'general', names: ['철벽'] },
  { key: 'regen', label: '재생', cat: 'defense', mode: 'general', names: ['재생'] },
  { key: 'pve_def', label: 'PVE 방어력', cat: 'defense', mode: 'pve', names: ['PVE 방어력'] },
  { key: 'pvp_def', label: 'PVP 방어력', cat: 'defense', mode: 'pvp', names: ['PVP 방어력'] },
  { key: 'pvp_hit', label: 'PVP 명중', cat: 'defense', mode: 'pvp', names: ['PVP 명중'] },
  { key: 'pvp_evade', label: 'PVP 회피', cat: 'defense', mode: 'pvp', names: ['PVP 회피'] },
  { key: 'pvp_critres', label: 'PVP 치명타 저항', cat: 'defense', mode: 'pvp', names: ['PVP 치명타 저항'] },
  { key: 'pvp_block', label: 'PVP 막기', cat: 'defense', mode: 'pvp', names: ['PVP 막기'] },

  { key: 'dmgamp', label: '피해 증폭', cat: 'amplify', mode: 'general', names: ['피해 증폭'] },
  { key: 'wdmgamp', label: '무기 피해 증폭', cat: 'amplify', mode: 'general', names: ['무기 피해 증폭'] },
  { key: 'backdmgamp', label: '후방 피해 증폭', cat: 'amplify', mode: 'general', names: ['후방 피해 증폭'] },
  { key: 'frontdmgamp', label: '전방 피해 증폭', cat: 'amplify', mode: 'general', names: ['전방 피해 증폭'] },
  { key: 'critdmgamp', label: '치명타 피해 증폭', cat: 'amplify', mode: 'general', names: ['치명타 피해 증폭'] },
  { key: 'racedmgamp', label: '종족 피해 증폭', cat: 'amplify', mode: 'general', names: ['지성족 피해 증폭', '야성족 피해 증폭', '자연족 피해 증폭', '변형족 피해 증폭'] },
  { key: 'perfect', label: '완벽', cat: 'amplify', mode: 'general', names: ['완벽'] },
  { key: 'pve_dmgamp', label: 'PVE 피해 증폭', cat: 'amplify', mode: 'pve', names: ['PVE 피해 증폭'] },
  { key: 'pvp_dmgamp', label: 'PVP 피해 증폭', cat: 'amplify', mode: 'pvp', names: ['PVP 피해 증폭'] },
  { key: 'dmgres', label: '피해 내성', cat: 'amplify', mode: 'general', names: ['피해 내성'] },
  { key: 'wdmgres', label: '무기 피해 내성', cat: 'amplify', mode: 'general', names: ['무기 피해 내성'] },
  { key: 'backdmgres', label: '후방 피해 내성', cat: 'amplify', mode: 'general', names: ['후방 피해 내성'] },
  { key: 'frontdmgres', label: '전방 피해 내성', cat: 'amplify', mode: 'general', names: ['전방 피해 내성'] },
  { key: 'critdmgres', label: '치명타 피해 내성', cat: 'amplify', mode: 'general', names: ['치명타 피해 내성'] },
  { key: 'racedmgres', label: '종족 피해 내성', cat: 'amplify', mode: 'general', names: ['지성족 피해 내성', '야성족 피해 내성', '자연족 피해 내성', '변형족 피해 내성'] },
  { key: 'pve_dmgres', label: 'PVE 피해 내성', cat: 'amplify', mode: 'pve', names: ['PVE 피해 내성'] },

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
const GRADE_MAX = { '유일': 4, '영웅': 5 };
const PET_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PET_GRADES_SHOWN = ['유일', '영웅'];

let activeMode = 'pve'; // 'pve' | 'pvp'

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
        MANA_OPTIONS.push({ item, stage, stat, val: parseFloat(val), statKey: sd.key, label: `${item} ${stage} · ${stat} (${val})` });
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
  acc[part] = { grade: '유일', manaTargets: [], engraveRows: [] }; // engraveRows: [{statKey, value}]
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
  calc();
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
  const shown = new Set(statsForMode(activeMode).map(sd => sd.key));
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
    <details class="card gear-part">
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
      <div class="field"><label>마석/영석 사용 칸 수</label>
        <select class="manaCountSel" data-part="${part}"></select>
      </div>
      <div id="manaRows-${part}"></div>
      <div class="sect" style="margin-top:14px">영혼각인 (직접 입력 · 데이터 없음)</div>
      <div id="engraveRows-${part}"></div>
      <button type="button" class="addEngraveBtn" data-part="${part}">+ 스탯 추가</button>
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
    renderEngraveRows(part);

    document.querySelector(`.addEngraveBtn[data-part="${part}"]`).addEventListener('click', () => {
      const opts = statsForMode(activeMode);
      const used = new Set(gearState[part].engraveRows.map(r => r.statKey));
      const next = opts.find(sd => !used.has(sd.key)) || opts[0];
      gearState[part].engraveRows.push({ statKey: next.key, value: 0 });
      renderEngraveRows(part);
      calc();
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
    // 새 칸을 추가할 때마다 매번 같은 옵션만 기본으로 잡으면 여러 칸이 겹쳐 보여 헷갈리므로,
    // 지금 탭(PVE/PVP)에서 실제로 마석에 존재하는 스탯들을 순환하며 서로 다른 기본값을 준다.
    const availStats = statsForMode(activeMode).filter(sd => MANA_OPTIONS.some(o => o.statKey === sd.key));
    while (targets.length < n) {
      const sd = availStats[targets.length % availStats.length];
      const best = MANA_OPTIONS.find(o => o.statKey === sd.key);
      targets.push({ idx: best ? best.idx : MANA_OPTIONS[0].idx });
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
  const shown = new Set(statsForMode(activeMode).map(sd => sd.key));
  box.innerHTML = `
    <table class="odd-table">
      <thead><tr><th>#</th><th>마석/영석 · 스탯 (수치)</th></tr></thead>
      <tbody>${targets.map((t, i) => `
        <tr><td>${i + 1}</td><td><select class="manaTargetSel" data-part="${part}" data-i="${i}"></select></td></tr>`).join('')}</tbody>
    </table>`;
  targets.forEach((t, i) => {
    const sel = document.querySelector(`.manaTargetSel[data-part="${part}"][data-i="${i}"]`);
    sel.innerHTML = CATEGORIES.map(c => {
      const catStats = STAT_DEFS.filter(sd => sd.cat === c.key && shown.has(sd.key));
      const rows = [];
      catStats.forEach(sd => {
        MANA_OPTIONS.filter(o => o.statKey === sd.key).forEach(o => rows.push(o));
      });
      if (!rows.length) return '';
      return `<optgroup label="${c.label}">${rows.map(o => `<option value="${o.idx}">${o.label}</option>`).join('')}</optgroup>`;
    }).join('');
    if (!sel.querySelector(`option[value="${t.idx}"]`)) {
      const fallback = MANA_OPTIONS.find(o => shown.has(o.statKey));
      if (fallback) t.idx = fallback.idx;
    }
    sel.value = String(t.idx);
    sel.addEventListener('change', () => {
      t.idx = parseInt(sel.value, 10);
      calc();
    });
  });
}

// ---------- 영혼각인: 추가/삭제 가능한 행 ----------
function renderEngraveRows(part) {
  const box = $('engraveRows-' + part);
  const rows = gearState[part].engraveRows;
  const shown = statsForMode(activeMode);
  const shownKeys = new Set(shown.map(sd => sd.key));
  // 탭이 바뀌어 지금 목록에 없는(다른 모드 전용) 스탯 행은 화면엔 숨기되 값은 보존한다(state는 안 지움).
  if (rows.length === 0) { box.innerHTML = '<div class="odd-nick" style="padding:4px 0">추가된 영혼각인 스탯 없음</div>'; return; }
  box.innerHTML = `
    <table class="odd-table">
      <thead><tr><th>스탯</th><th>수치</th><th></th></tr></thead>
      <tbody>${rows.map((r, i) => {
        if (!shownKeys.has(r.statKey)) return `<tr data-hidden="1" style="display:none"></tr>`;
        return `<tr>
          <td><select class="engraveStatSel" data-part="${part}" data-i="${i}"></select></td>
          <td><input type="number" class="engraveValInput" data-part="${part}" data-i="${i}" value="${r.value}" step="1" style="width:80px"></td>
          <td><button type="button" class="engraveDelBtn" data-part="${part}" data-i="${i}">삭제</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  rows.forEach((r, i) => {
    if (!shownKeys.has(r.statKey)) return;
    const statSel = document.querySelector(`.engraveStatSel[data-part="${part}"][data-i="${i}"]`);
    statSel.innerHTML = CATEGORIES.map(c => {
      const opts = shown.filter(sd => sd.cat === c.key);
      if (!opts.length) return '';
      return `<optgroup label="${c.label}">${opts.map(sd => `<option value="${sd.key}" ${sd.key === r.statKey ? 'selected' : ''}>${sd.label}</option>`).join('')}</optgroup>`;
    }).join('');
    statSel.addEventListener('change', () => { r.statKey = statSel.value; calc(); });
    const valInput = document.querySelector(`.engraveValInput[data-part="${part}"][data-i="${i}"]`);
    valInput.addEventListener('input', () => { r.value = parseFloat(valInput.value) || 0; calc(); });
    document.querySelector(`.engraveDelBtn[data-part="${part}"][data-i="${i}"]`).addEventListener('click', () => {
      gearState[part].engraveRows.splice(i, 1);
      renderEngraveRows(part);
      calc();
    });
  });
}

// ---------- 합산 & 요약 ----------
function calc() {
  const shown = statsForMode(activeMode);
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
    gearState[part].engraveRows.forEach(r => {
      if (shownKeys.has(r.statKey)) { engraveTotals[r.statKey] += r.value || 0; engraveSum += r.value || 0; }
    });
    const badge = $('partBadge-' + part);
    if (badge) {
      const manaN = gearState[part].manaTargets.length;
      badge.textContent = `${gearState[part].grade} · 마석 ${manaN}칸(${manaSum.toFixed(0)}) · 각인 ${gearState[part].engraveRows.length}개(${engraveSum.toFixed(0)})`;
    }
  });

  $('summaryTable').innerHTML = `
    <table class="odd-table">
      <thead><tr><th>스탯</th><th>펫 이해도</th><th>마석/영석</th><th>영혼각인</th><th>총합</th></tr></thead>
      <tbody>${CATEGORIES.map(c => {
        const catStats = shown.filter(sd => sd.cat === c.key);
        if (!catStats.length) return '';
        return `<tr class="cat-row"><td colspan="5">${c.label}</td></tr>` + catStats.map(sd => {
          const total = petTotals[sd.key] + manaTotals[sd.key] + engraveTotals[sd.key];
          return `<tr>
            <td>${sd.label}</td>
            <td>${petTotals[sd.key].toFixed(1)}</td>
            <td>${manaTotals[sd.key].toFixed(1)}</td>
            <td>${engraveTotals[sd.key].toFixed(1)}</td>
            <td class="odd-eff">${total.toFixed(1)}</td>
          </tr>`;
        }).join('');
      }).join('')}</tbody>
    </table>`;
}

$('petRace').addEventListener('change', () => { renderPetTable(); calc(); });

renderTabs();
renderPetTable();
renderGearParts();
calc();
