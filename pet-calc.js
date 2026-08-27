const $ = id => document.getElementById(id);


const SLOTS = [1,2,3,4,5,6,7,8,9];
const DEFAULT_COST = [45,50,55,75,120,215,310,405,500]; // 잠금 0~8개일 때 재분석 1회 비용 (사용자 제보값)

// 실제 파밍 순서(보통 3·9번=강타/무기피증, 6번=재생/철벽/무기피해내성을 먼저 맞추고 나머지) 기본값.
const DEFAULT_PHASE = { 1: 3, 2: 3, 3: 1, 4: 3, 5: 3, 6: 2, 7: 3, 8: 3, 9: 1 };
const PHASE_LABEL = { 1: '1차', 2: '2차', 3: '3차' };

const raceSel = $('race'), levelSel = $('level');
const costTableEl = $('costTable'), slotTableEl = $('slotTable'), phaseTableEl = $('phaseTable');

// 슬롯별 상태: 목표 옵션들(여러 개 중 하나라도 나오면 OK — [{idx, minVal}, ...]), 잠금 여부, 우선순위(1~3차).
const slotState = SLOTS.reduce((acc, s) => { acc[s] = { targets: [{ idx: 0, minVal: null }], locked: false, phase: DEFAULT_PHASE[s] }; return acc; }, {});

function optionsForSlot(race, slot) {
  const list = [];
  GRADES.forEach(g => {
    (PET_OPTIONS[race][String(slot)][g] || []).forEach(([opt, range, p]) => {
      list.push({ grade: g, opt, range, p });
    });
  });
  list.forEach((e, i) => { e.idx = i; });
  return list;
}

// "17 ~ 34" / "0.9% ~ 1.8%" 형태 파싱. min===max면 범위 없는 고정값.
function parseRange(rangeStr) {
  const isPercent = rangeStr.indexOf('%') >= 0;
  const nums = rangeStr.replace(/%/g, '').split('~').map(s => parseFloat(s.trim()));
  const min = nums[0], max = nums.length > 1 ? nums[1] : nums[0];
  return { min, max, isPercent };
}

// 허용 최소값 이상이 나올 확률(균등 분포 가정). %형은 연속균등, 정수형은 정수 개수 비율(근사).
function rangeFraction(range, minVal) {
  const { min, max, isPercent } = range;
  if (!(max > min)) return 1;
  const mv = Math.max(min, Math.min(max, minVal));
  if (isPercent) return (max - mv) / (max - min);
  const mvInt = Math.ceil(mv - 1e-9);
  const total = Math.floor(max) - Math.ceil(min) + 1;
  const countGE = Math.max(0, Math.floor(max) - mvInt + 1);
  return total > 0 ? countGE / total : 1;
}

function pOf(entry, level) {
  const gp = (GRADE_PROB[level][entry.grade] || 0) / 100;
  const op = entry.p / 100;
  const range = parseRange(entry.range);
  const rf = rangeFraction(range, entry.minVal != null ? entry.minVal : range.min);
  return gp * op * rf;
}

function renderCostTable() {
  costTableEl.innerHTML = DEFAULT_COST.map((v, i) => `
    <div class="cost-cell">
      <label>잠금 ${i}개</label>
      <input type="number" class="costInput" data-idx="${i}" value="${v}" min="0" step="1">
    </div>`).join('');
}

function readCostTable() {
  return Array.from(costTableEl.querySelectorAll('.costInput')).map(el => Math.max(0, parseFloat(el.value) || 0));
}

// 슬롯 하나의 1회 적중 확률 = 그 슬롯에 걸어둔 목표들(각각 등급×옵션×허용범위 확률) 합.
// 한 번의 재분석에서 한 슬롯엔 옵션이 하나만 나오므로 서로 겹치지 않아 그냥 더하면 된다.
function slotProb(race, s, level) {
  const list = optionsForSlot(race, s);
  return slotState[s].targets.reduce((sum, t) => {
    const entry = list[t.idx];
    if (!entry) return sum;
    return sum + pOf(Object.assign({}, entry, { minVal: t.minVal }), level);
  }, 0);
}

function renderTargetDetail(s) {
  const cell = document.getElementById('detailCell' + s);
  if (!cell) return;
  const race = raceSel.value;
  const list = optionsForSlot(race, s);
  if (slotState[s].targets.length === 0) {
    cell.innerHTML = '<span class="odd-nick">목표 없음</span>';
    return;
  }
  cell.innerHTML = slotState[s].targets.map(t => {
    const entry = list[t.idx];
    if (!entry) return '';
    const range = parseRange(entry.range);
    const hasRange = range.max > range.min;
    return `<div style="margin-bottom:3px;white-space:nowrap">${entry.opt} (${entry.range})${hasRange
      ? ` <input type="number" class="minValInput" data-slot="${s}" data-idx="${t.idx}" value="${t.minVal}" step="${range.isPercent ? '0.1' : '1'}" style="width:56px"> 이상`
      : ''}</div>`;
  }).join('');
  cell.querySelectorAll('.minValInput').forEach(inp => {
    inp.addEventListener('input', e => {
      const idx = parseInt(inp.dataset.idx, 10);
      const t = slotState[s].targets.find(tt => tt.idx === idx);
      if (t) t.minVal = parseFloat(e.target.value) || 0;
      calc();
    });
  });
}

function rebuildSlotOptions() {
  const race = raceSel.value;
  SLOTS.forEach(s => {
    const list = optionsForSlot(race, s);
    const groups = {};
    list.forEach(e => { (groups[e.grade] = groups[e.grade] || []).push(e); });
    const box = slotTableEl.querySelector(`.targetCheckList[data-slot="${s}"]`);
    if (!box) return;
    // 종족/레벨이 바뀌며 사라진 옵션은 목표에서 제외, 하나도 안 남으면 기본값으로.
    const validIdxs = new Set(list.map(e => e.idx));
    slotState[s].targets = slotState[s].targets.filter(t => validIdxs.has(t.idx));
    if (slotState[s].targets.length === 0) {
      slotState[s].targets = [{ idx: 0, minVal: parseRange(list[0].range).min }];
    }
    // 아직 허용 최소값을 안 정한(null) 목표는 그 옵션 범위의 최솟값(=전체 범위 허용)으로 채워준다.
    slotState[s].targets.forEach(t => {
      if (t.minVal == null) t.minVal = parseRange(list[t.idx].range).min;
    });
    const selectedIdxs = new Set(slotState[s].targets.map(t => t.idx));
    box.innerHTML = GRADES.filter(g => groups[g] && groups[g].length).map(g => `
      <div class="cl-grade">${g}</div>
      ${groups[g].map(e => `
        <label class="cl-item"><input type="checkbox" class="targetChk" value="${e.idx}" ${selectedIdxs.has(e.idx) ? 'checked' : ''}> ${e.opt} (${e.range})</label>`).join('')}
    `).join('');
    renderTargetDetail(s);
  });
}

function renderSlotTable() {
  slotTableEl.innerHTML = `
    <table class="odd-table">
      <thead><tr>
        <th>우선순위</th><th>슬롯</th><th>목표 옵션 (체크박스로 여러 개 가능)</th><th>선택된 목표 · 허용 최소값</th><th>1회 적중 확률</th><th>잠금</th>
      </tr></thead>
      <tbody>${SLOTS.map(s => `
        <tr class="${slotState[s].locked ? 'target-row' : ''}">
          <td><select class="phaseSel" data-slot="${s}">${[1, 2, 3].map(p => `<option value="${p}" ${slotState[s].phase === p ? 'selected' : ''}>${PHASE_LABEL[p]}</option>`).join('')}</select></td>
          <td>${s}번</td>
          <td><div class="targetCheckList" data-slot="${s}"></div></td>
          <td id="detailCell${s}"></td>
          <td class="odd-eff" id="pRow${s}">—</td>
          <td style="text-align:center"><input type="checkbox" class="lockChk" data-slot="${s}" ${slotState[s].locked ? 'checked' : ''}></td>
        </tr>`).join('')}</tbody>
    </table>`;
  rebuildSlotOptions();
  slotTableEl.querySelectorAll('.phaseSel').forEach(sel => {
    sel.addEventListener('change', () => {
      const s = parseInt(sel.dataset.slot, 10);
      slotState[s].phase = parseInt(sel.value, 10);
      calc();
    });
  });
  slotTableEl.querySelectorAll('.lockChk').forEach(chk => {
    chk.addEventListener('change', () => {
      const s = parseInt(chk.dataset.slot, 10);
      slotState[s].locked = chk.checked;
      chk.closest('tr').className = slotState[s].locked ? 'target-row' : '';
      calc();
    });
  });
}

// unlocked 슬롯들(각자 적중확률 ps)을 전부 잠글 때까지의 기대값. preLocked = 이 계산 시작 시점에
// 이미(다른 슬롯 포함) 잠겨 있는 슬롯 개수 — 단계별 계산에서 이전 단계까지 잠근 수를 그대로 넘긴다.
// costFn(lockedCount) : 그 시점까지 이미 잠긴 슬롯 개수(0~8) -> 재분석 1회 비용/가중치. 근사 없는 정확한 기대값.
function expectedToLockAll(ps, costFn, preLocked) {
  const m = ps.length;
  if (m === 0) return 0;
  const full = (1 << m) - 1;
  const E = new Float64Array(1 << m);
  const popcount = x => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
  const byPop = Array.from({ length: m + 1 }, () => []);
  for (let mask = 0; mask <= full; mask++) byPop[popcount(mask)].push(mask);
  for (let pc = 1; pc <= m; pc++) {
    for (const mask of byPop[pc]) {
      const lockedCount = preLocked + (m - pc);
      let q = 1;
      for (let i = 0; i < m; i++) if (mask & (1 << i)) q *= (1 - ps[i]);
      let sumOther = 0;
      for (let sub = (mask - 1) & mask; ; sub = (sub - 1) & mask) {
        if (sub !== mask) {
          let pTrans = 1;
          for (let i = 0; i < m; i++) {
            if (mask & (1 << i)) pTrans *= (sub & (1 << i)) ? (1 - ps[i]) : ps[i];
          }
          sumOther += pTrans * E[sub];
        }
        if (sub === 0) break;
      }
      const denom = 1 - q;
      E[mask] = denom > 1e-12 ? (costFn(lockedCount) + sumOther) / denom : Infinity;
    }
  }
  return E[full];
}

function fmtNum(n, unit) {
  if (!isFinite(n)) return '불가 (미해금 옵션 포함)';
  return Math.ceil(n).toLocaleString('ko-KR') + unit;
}

// "영혼결정 N개로 완성 확률" — 재분석 결과는 매번 랜덤이라 실제 소모량이 기대값 주변에 흩어진다.
// 그 분포를 몬테카를로 시뮬레이션(같은 조건으로 SIM_TRIALS번 처음부터 끝까지 가상 파밍)으로 근사해
// "예산 이내로 끝난 시행 비율"을 확률로 보여준다. 정확한 기대값(expectedToLockAll)과 달리 표본 기반 근사치.
const SIM_TRIALS = 5000;
const SIM_CAP_REROLLS = 25000; // 극단적으로 낮은 확률(미해금 근처) 대비 시행당 안전 상한
function simulateCosts(ps, costTable, preLocked) {
  const m = ps.length;
  if (m === 0) return new Float64Array(SIM_TRIALS); // 전부 0
  if (ps.some(p => !(p > 0))) return null; // 목표 중 하나라도 확률 0(미해금) -> 시뮬레이션 불가
  const full = (1 << m) - 1;
  const out = new Float64Array(SIM_TRIALS);
  for (let t = 0; t < SIM_TRIALS; t++) {
    let lockedMask = 0, lockedCount = preLocked, cost = 0, iters = 0;
    while (lockedMask !== full && iters < SIM_CAP_REROLLS) {
      iters++;
      cost += costTable[lockedCount];
      for (let i = 0; i < m; i++) {
        const bit = 1 << i;
        if (!(lockedMask & bit) && Math.random() < ps[i]) { lockedMask |= bit; lockedCount++; }
      }
    }
    out[t] = cost;
  }
  return out;
}

function addArrays(a, b) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
  return out;
}

function countLE(sortedArr, budget) {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; sortedArr[mid] <= budget ? lo = mid + 1 : hi = mid; }
  return lo;
}

let simSortedTotal = null, simSortedLeft = null;
const budgetEl = $('budget');

function updateBudgetProb() {
  const budget = Math.max(0, parseFloat(budgetEl.value) || 0);
  const fmtP = arr => arr === null ? '불가 (미해금)' : (countLE(arr, budget) / arr.length * 100).toFixed(1) + '%';
  $('pBudgetProbLeft').textContent = fmtP(simSortedLeft);
  $('pBudgetProbTotal').textContent = fmtP(simSortedTotal);
}

function calc() {
  const race = raceSel.value;
  const level = parseInt(levelSel.value, 10);
  const cost = readCostTable();

  const allP = {};
  SLOTS.forEach(s => {
    const p = slotProb(race, s, level);
    allP[s] = p;
    const cell = $('pRow' + s);
    if (cell) {
      cell.textContent = slotState[s].targets.length === 0 ? '0% (목표 없음)'
        : p > 0 ? (p * 100).toFixed(4) + '%' : '0% (미해금)';
    }
  });

  let crystalTotal = 0, rerollTotal = 0, crystalLeft = 0, rerollLeft = 0, lockedCountAll = 0;
  let cumPhaseSize = 0; // 이전 단계까지의 (체크 여부와 무관한) 전체 슬롯 수 — "총" 계산의 preLocked 기준
  const phaseRows = [];
  const simParts = { total: [], left: [] };

  // preLockedBase: 이전 단계는 전부(사이즈 그대로) 잠겼다고 가정한 시작 시점의 잠긴 슬롯 수 — "총"과
  // "잔여" 둘 다 이 기준을 쓰되, "잔여"는 여기에 이 단계 안에서 실제로 체크된 만큼만 더한다.
  // 그래야 하나도 안 잠긴 상태(0/9)에서 "총"과 "잔여"가 정확히 같아진다.
  [1, 2, 3].forEach(phase => {
    const slots = SLOTS.filter(s => slotState[s].phase === phase);
    const lockedSlots = slots.filter(s => slotState[s].locked);
    const unlockedSlots = slots.filter(s => !slotState[s].locked);

    const psAll = slots.map(s => allP[s]);
    const psLeft = unlockedSlots.map(s => allP[s]);

    const preLockedBase = cumPhaseSize;
    const preLockedLeft = preLockedBase + lockedSlots.length;

    const eCrystalTotal = expectedToLockAll(psAll, lc => cost[lc], preLockedBase);
    const eRerollTotal = expectedToLockAll(psAll, () => 1, preLockedBase);
    const eCrystalLeft = expectedToLockAll(psLeft, lc => cost[lc], preLockedLeft);
    const eRerollLeft = expectedToLockAll(psLeft, () => 1, preLockedLeft);

    crystalTotal += eCrystalTotal; rerollTotal += eRerollTotal;
    crystalLeft += eCrystalLeft; rerollLeft += eRerollLeft;
    lockedCountAll += lockedSlots.length;

    phaseRows.push({ phase, slots, lockedSlots, eCrystalLeft, eRerollLeft });

    simParts.total.push(simulateCosts(psAll, cost, preLockedBase));
    simParts.left.push(simulateCosts(psLeft, cost, preLockedLeft));

    cumPhaseSize += slots.length;
  });

  $('pProgress').textContent = `${lockedCountAll} / 9`;
  $('pRerollsTotal').textContent = fmtNum(rerollTotal, '회');
  $('pRerollsLeft').textContent = fmtNum(rerollLeft, '회');
  $('pCrystalTotal').textContent = fmtNum(crystalTotal, '개');
  $('pCrystalLeft').textContent = fmtNum(crystalLeft, '개');

  phaseTableEl.innerHTML = `
    <table class="odd-table">
      <thead><tr><th>단계</th><th>슬롯</th><th>진행</th><th>이 단계 잔여 재분석</th><th>이 단계 잔여 영혼결정</th></tr></thead>
      <tbody>${phaseRows.map(r => `
        <tr>
          <td>${PHASE_LABEL[r.phase]}</td>
          <td>${r.slots.length ? r.slots.join(', ') + '번' : '(없음)'}</td>
          <td>${r.lockedSlots.length} / ${r.slots.length}</td>
          <td>${fmtNum(r.eRerollLeft, '회')}</td>
          <td>${fmtNum(r.eCrystalLeft, '개')}</td>
        </tr>`).join('')}</tbody>
    </table>`;

  const combine = parts => parts.some(p => p === null) ? null : parts.reduce(addArrays).sort();
  simSortedTotal = combine(simParts.total);
  simSortedLeft = combine(simParts.left);
  updateBudgetProb();
}

raceSel.addEventListener('change', () => { rebuildSlotOptions(); calc(); });
levelSel.addEventListener('change', calc);
budgetEl.addEventListener('input', updateBudgetProb);

// 체크박스는 renderSlotTable/rebuildSlotOptions가 innerHTML을 통째로 새로 그려서
// 매번 다시 바인딩하지 않도록, 안 바뀌는 slotTableEl에 위임 이벤트로 한 번만 건다.
slotTableEl.addEventListener('change', e => {
  if (!e.target.classList.contains('targetChk')) return;
  const box = e.target.closest('.targetCheckList');
  const s = parseInt(box.dataset.slot, 10);
  const race = raceSel.value;
  const list = optionsForSlot(race, s);
  const prevByIdx = {};
  slotState[s].targets.forEach(t => { prevByIdx[t.idx] = t.minVal; });
  const selectedIdxs = Array.from(box.querySelectorAll('.targetChk:checked')).map(el => parseInt(el.value, 10));
  slotState[s].targets = selectedIdxs.map(idx => ({
    idx,
    minVal: prevByIdx[idx] != null ? prevByIdx[idx] : parseRange(list[idx].range).min,
  }));
  renderTargetDetail(s);
  calc();
});

renderCostTable();
costTableEl.addEventListener('input', calc);
renderSlotTable();
calc();
