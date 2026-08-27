const $ = id => document.getElementById(id);

const STAGE_ORDER = ['기본', '상급', '최상급'];

const itemSel = $('itemName'), countSel = $('targetCount');
const slotTableEl = $('slotTable'), budgetEl = $('budget');

// 슬롯별 상태: 목표 옵션 index(flattenOptions 기준), 완료 체크 여부(게임 내 기능 아님, 계산용 표시). 등급 바뀔 때 크기 조정.
let slotState = [];

function flattenOptions(itemName) {
  const list = [];
  STAGE_ORDER.forEach(stage => {
    const st = MANASTONE_DATA[itemName][stage];
    if (!st) return;
    st.opts.forEach(([stat, val, optPct]) => {
      list.push({ stage, stat, val, p: (st.pct / 100) * (optPct / 100) });
    });
  });
  return list;
}

function slotCount() { return parseInt(countSel.value, 10); }

function ensureSlotStateSize() {
  const n = slotCount();
  // 기본값을 전부 idx:0(첫 옵션)으로 두면 목표를 여러 개 걸어도 전부 같은 스탯을 노리는
  // 꼴이 돼서(예: 2개 목표 = 같은 스탯 2개 필요, 기대 개수가 비정상적으로 커 보임) 헷갈리므로
  // 슬롯마다 서로 다른 옵션이 기본으로 잡히도록 idx를 슬롯 순번으로 벌려준다.
  while (slotState.length < n) slotState.push({ idx: slotState.length, locked: false });
  slotState.length = n;
}

function renderSlotTable() {
  ensureSlotStateSize();
  const n = slotCount();
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(`
        <tr class="${slotState[i].locked ? 'target-row' : ''}">
          <td>목표 ${i + 1}</td>
          <td><select class="targetSel" data-i="${i}"></select></td>
          <td class="odd-eff" id="pRow${i}">—</td>
          <td style="text-align:center"><input type="checkbox" class="lockChk" data-i="${i}" ${slotState[i].locked ? 'checked' : ''}></td>
        </tr>`);
  }
  slotTableEl.innerHTML = `
    <table class="odd-table">
      <thead><tr>
        <th>목표</th><th>목표 스탯</th><th>1회 적중 확률</th><th>완료</th>
      </tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
  rebuildTargetSelects();
  slotTableEl.querySelectorAll('.targetSel').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.i, 10);
      slotState[i].idx = parseInt(sel.value, 10) || 0;
      calc();
    });
  });
  slotTableEl.querySelectorAll('.lockChk').forEach(chk => {
    chk.addEventListener('change', () => {
      const i = parseInt(chk.dataset.i, 10);
      slotState[i].locked = chk.checked;
      chk.closest('tr').className = slotState[i].locked ? 'target-row' : '';
      calc();
    });
  });
}

function rebuildTargetSelects() {
  const list = flattenOptions(itemSel.value);
  const groups = {};
  list.forEach((e, i) => { e.idx = i; (groups[e.stage] = groups[e.stage] || []).push(e); });
  slotTableEl.querySelectorAll('.targetSel').forEach(sel => {
    const i = parseInt(sel.dataset.i, 10);
    sel.innerHTML = STAGE_ORDER.filter(s => groups[s] && groups[s].length).map(s =>
      `<optgroup label="${s}">${groups[s].map(e => `<option value="${e.idx}">${e.stat} (${e.val})</option>`).join('')}</optgroup>`
    ).join('');
    const wanted = slotState[i] ? slotState[i].idx : 0;
    sel.value = wanted < list.length ? String(wanted) : '0';
    if (slotState[i]) slotState[i].idx = parseInt(sel.value, 10) || 0;
  });
}

// 슬롯들이 가리키는 목표를 "고유 목표 -> 필요 개수"로 묶는다.
// 두 슬롯이 같은 목표를 걸어두면 그 목표는 needed:2로 묶여서, 하나 나왔을 때 둘 중 하나만 채워진다는 게 반영된다.
function aggregateTargets(list, indices) {
  const list_ = flattenOptions(itemSel.value);
  const byIdx = {};
  indices.forEach(i => {
    const optIdx = slotState[i].idx;
    byIdx[optIdx] = (byIdx[optIdx] || 0) + 1;
  });
  return Object.keys(byIdx).map(k => ({ prob: list_[k].p, needed: byIdx[k] }));
}

// 여러 목표를 동시에 채울 때까지의 기대 시도 횟수. 상태 = 목표별 남은 필요 개수 벡터.
// E(state) = (1 + Σ q_k·E(state - 1_k)) / Σ q_k  (전부 0이면 0, 남은 목표 확률 합이 0이면 불가)
function expectedCrafts(uniqueTargets) {
  if (uniqueTargets.length === 0) return 0;
  const memo = new Map();
  function E(state) {
    if (state.every(v => v === 0)) return 0;
    const key = state.join(',');
    if (memo.has(key)) return memo.get(key);
    let qSum = 0, acc = 0, impossible = false;
    for (let k = 0; k < state.length; k++) {
      if (state[k] > 0) {
        const q = uniqueTargets[k].prob;
        if (!(q > 0)) { impossible = true; continue; }
        qSum += q;
        const s2 = state.slice(); s2[k]--;
        acc += q * E(s2);
      }
    }
    const val = (impossible || qSum <= 0) ? Infinity : (1 + acc) / qSum;
    memo.set(key, val);
    return val;
  }
  return E(uniqueTargets.map(t => t.needed));
}

// "보유 개수로 완성 확률" — 같은 조건으로 5,000번 가상으로 만들어보고, 예산 이내로 끝난 비율을 확률로 근사.
const SIM_TRIALS = 5000, SIM_CAP = 20000;
function simulateCrafts(uniqueTargets) {
  if (uniqueTargets.length === 0) return new Float64Array([0]);
  if (uniqueTargets.some(t => !(t.prob > 0))) return null;
  const K = uniqueTargets.length;
  const out = new Float64Array(SIM_TRIALS);
  for (let t = 0; t < SIM_TRIALS; t++) {
    const remaining = uniqueTargets.map(x => x.needed);
    let totalNeeded = remaining.reduce((a, b) => a + b, 0);
    let crafts = 0;
    while (totalNeeded > 0 && crafts < SIM_CAP) {
      crafts++;
      const r = Math.random();
      let acc = 0;
      for (let k = 0; k < K; k++) {
        acc += uniqueTargets[k].prob;
        if (r < acc) { if (remaining[k] > 0) { remaining[k]--; totalNeeded--; } break; }
      }
    }
    out[t] = crafts;
  }
  out.sort();
  return out;
}

function countLE(sortedArr, v) {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; sortedArr[mid] <= v ? lo = mid + 1 : hi = mid; }
  return lo;
}

function fmtNum(n, unit) {
  if (!isFinite(n)) return '불가';
  return Math.ceil(n).toLocaleString('ko-KR') + unit;
}

let simTotal = null, simLeft = null;

function updateBudgetProb() {
  const budget = Math.max(0, parseFloat(budgetEl.value) || 0);
  const fmtP = arr => arr === null ? '불가' : (countLE(arr, budget) / arr.length * 100).toFixed(1) + '%';
  $('pBudgetLeft').textContent = fmtP(simLeft);
  $('pBudgetTotal').textContent = fmtP(simTotal);
}

function calc() {
  const list = flattenOptions(itemSel.value);
  const n = slotCount();
  ensureSlotStateSize();

  const allIdx = Array.from({ length: n }, (_, i) => i);
  const lockedIdx = allIdx.filter(i => slotState[i].locked);
  const unlockedIdx = allIdx.filter(i => !slotState[i].locked);

  allIdx.forEach(i => {
    const entry = list[slotState[i].idx];
    const cell = $('pRow' + i);
    if (cell && entry) cell.textContent = entry.p > 0 ? (entry.p * 100).toFixed(4) + '%' : '0%';
  });

  const targetsTotal = aggregateTargets(list, allIdx);
  const targetsLeft = aggregateTargets(list, unlockedIdx);

  const total = expectedCrafts(targetsTotal);
  const left = expectedCrafts(targetsLeft);

  $('pProgress').textContent = `${lockedIdx.length} / ${n}`;
  $('pTotal').textContent = fmtNum(total, '개');
  $('pLeft').textContent = fmtNum(left, '개');
  $('pLeftBig').textContent = fmtNum(left, '개');

  simTotal = simulateCrafts(targetsTotal);
  simLeft = lockedIdx.length === 0 ? simTotal : simulateCrafts(targetsLeft);
  updateBudgetProb();
}

itemSel.addEventListener('change', () => { rebuildTargetSelects(); calc(); });
countSel.addEventListener('change', () => { renderSlotTable(); calc(); });
budgetEl.addEventListener('input', updateBudgetProb);

renderSlotTable();
calc();
