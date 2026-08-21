const $ = id => document.getElementById(id);
const ids = [
  'atk', 'atkNaked', 'destr', 'power', 'brk',
  'weaponMinAttack', 'weaponMaxAttack', 'maximumAttack',
  'penetration', 'targetDefense', 'targetWeaponRes', 'targetCritDmgRes', 'targetDirectionalRes', 'targetPerfectRes',
  'amp', 'pve', 'boss', 'race', 'pvpAmp', 'targetResist',
  'wdmg', 'rear', 'back', 'frontAmp', 'frontRate', 'cdmg', 'crate', 'smite', 'sbuff', 'smiteResist',
  'perfect', 'multiHit',
];
ids.forEach(id => $(id).addEventListener('input', calc));

const combatType = $('combatType');
const skillTypeEl = $('skillType');
const multiHitModeEl = $('multiHitMode');
const attackDirectionEl = $('attackDirection');
[combatType, skillTypeEl, multiHitModeEl, attackDirectionEl].forEach(el => el.addEventListener('change', () => {
  syncCombatLabels();
  calc();
}));

// 입력값 자동 저장 — 새로고침·재방문해도 마지막 입력이 그대로 남아있도록.
const STORAGE_KEY = 'aion2-stat-calc-v1';
const ALL_FIELD_IDS = ids.concat(['combatType', 'skillType', 'multiHitMode', 'attackDirection']);
function saveInputs() {
  const data = {};
  ALL_FIELD_IDS.forEach(id => { data[id] = $(id).value; });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* 저장 실패 시 무시 */ }
}
function restoreInputs() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* 프라이빗 모드 등 */ }
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    ALL_FIELD_IDS.forEach(id => { if (data[id] !== undefined) $(id).value = data[id]; });
  } catch { /* 손상된 데이터면 기본값 유지 */ }
}

function syncCombatLabels() {
  const isPve = combatType.value === 'pve';
  $('pveFields').style.display = isPve ? '' : 'none';
  $('pvpFields').style.display = isPve ? 'none' : '';
  const who = isPve ? '보스' : '상대';
  $('targetDefenseLabel').textContent = who + ' 방어력';
  $('targetResistLabel').textContent = who + ' 피해 내성 % (합연산 그룹에서 차감)';
  $('smiteResistLabel').textContent = who + ' 강타 저항 %';
  $('targetWeaponResLabel').textContent = who + ' 무기 피해 내성 %';
  $('targetCritDmgResLabel').textContent = who + ' 치명타 피해 내성 %';
  $('targetDirResLabel').textContent = who + ' 방향 피해 내성 %';
  $('targetPerfectResLabel').textContent = who + ' 완벽 저항 %';
}

const fmt = n => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// 부위별 실측 상위 채용 옵션 (cielui.com 공개 API, 부위별 표본 1만+ 캐릭터, 2026-08-21 스냅샷)
// 채용률 %가 아니라 "이 부위엔 이걸 올려라"는 결론만 남긴 목록.
// 각인은 부위별로 실제 다르지만(실측), 마석은 부위 상관없이 옵션 풀이 동일해서(실측 확인)
// 전 부위 공통으로 아래 manaOptions 계산 결과를 그대로 재사용한다.
// 마석 원시 표기값 100 ≈ 실제 스탯 +1.2%p (사용자 제공 실측치, 최상급/노란색 등급 기준).
const SLOT_RECOMMEND = [
  { group: '무기 · 보조무기', engrave: ['무기 피해 증폭', '위력', '피증'] },
  { group: '상의', engrave: ['피증'] },
  { group: '견갑', engrave: ['치명타 피해 증폭'] },
  { group: '투구 · 망토', engrave: ['강타'] },
  { group: '장갑 · 신발 · 하의', engrave: ['완벽'] },
  { group: '반지 · 목걸이 · 귀걸이', engrave: ['공격력', '치명타'] },
  { group: '브로치', engrave: ['위력', '치명타'] },
];

function renderSlotRecommend(bestKey, manaOptions) {
  const chip = o => {
    const isBest = bestKey && o === bestKey;
    return `<span class="slot-opt${isBest ? ' best' : ''}">${isBest ? '⭐ ' : ''}${o}</span>`;
  };
  const manaChips = manaOptions.map((m, i) =>
    `<span class="slot-opt${i === 0 ? ' best' : ''}" title="마석 원시값 100(최상급) 기준 계산 결과, raw 100≈1.2%p 추정치 포함">${i === 0 ? '⭐ ' : ''}${m.name} (${pct(m.val)})</span>`
  ).join('');
  $('slotRecommend').innerHTML = SLOT_RECOMMEND.map(s => `
    <div class="slot-card">
      <div class="sn">${s.group}</div>
      <div class="slot-row"><span class="slot-label">각인</span>${s.engrave.map(chip).join('')}</div>
      <div class="slot-row"><span class="slot-label">마석</span>${manaChips}</div>
    </div>`).join('');
}

// 공격력 증가율 + 장비공/기본공 역산 (파괴 1당 0.2%, 위력 1당 0.1%, 장비 돌파 부위당 5%는 착용시에만)
function computePools(v) {
  const incOff = v.destr * 0.2 + v.power * 0.1;
  const incOn = incOff + v.brk * 5;
  const onM = 1 + incOn / 100;
  const offM = 1 + incOff / 100;
  const gear = (v.atk - v.atkNaked * onM / offM) / onM;
  const base = v.atkNaked / offM;
  return { incOff, incOn, onM, offM, gear, base };
}

// 다단 히트: 발동 방식별 기대 추가타수 → 기대 데미지 보정 (레퍼런스 계산 엔진 교차검증)
function multiHitCalc(pctVal, mode) {
  const i = mode === 'guaranteed' ? 1 : clamp(pctVal + 19 + (mode === 'plus50' ? 50 : 0), 0, 100) / 100;
  const n = mode === 'guaranteed' ? 4 : Math.min(4, 2.72 + 2.26 * i);
  const r = i * n;
  const bonus = 0.05 * r;
  return { i, n, r, bonus, multiplier: 1 + bonus };
}

// 핵심 데미지 계산. gearDelta/baseDelta는 "플랫 공격력 옵션 +N" 시뮬레이션용 오버라이드.
function computeDamage(v, pools, isPve, skillType, multiHitMode, attackDirection, gearDelta = 0, baseDelta = 0) {
  const { onM, gear: gear0, base: base0 } = pools;
  const gear = gear0 + gearDelta;
  const base = base0 + baseDelta;

  const wM = 1 + Math.max(v.wdmg - v.targetWeaponRes, 0) / 100;
  const effAtk = (gear * wM + base) * onM;

  const weaponRange = Math.max(v.weaponMaxAttack - v.weaponMinAttack, 0);
  const rawRange = Math.max(2 * weaponRange + v.maximumAttack, 0);
  const range = rawRange * onM * wM;

  // 관통·방어력: 방어력이 관통보다 클 때만 그 차이의 1/10을 고정 감소. 초과 관통은 보너스 없음.
  const mitigate = 0.1 * Math.max(v.targetDefense - v.penetration, 0);
  const h = Math.max(effAtk - mitigate, 1);
  const xMax = Math.max(effAtk + range / 2 - mitigate, 1);

  const ampSum = v.amp + (isPve ? v.pve + v.boss + v.race : v.pvpAmp);
  const mAmp = Math.max(0.1, 1 + (ampSum - v.targetResist) / 100);

  const critCap = skillType === 'guaranteed' ? 100 : 80;
  const c = skillType === 'guaranteed' ? 1 : clamp(v.crate, 0, critCap) / 100;
  const mCrit = 1 + c * (0.5 + (v.cdmg - v.targetCritDmgRes) / 100);

  const smiteProc = clamp(v.smite + v.sbuff - v.smiteResist, 0, 100);
  const w = smiteProc / 100;
  const z = h * (1 + w);

  // 후방·전방은 서로 배타적 — 한 번의 타격은 둘 중 한 방향에만 해당하므로 attackDirection으로 고른 쪽 배율만 최종 데미지에 곱한다.
  const b = clamp(v.back, 0, 100) / 100;
  const mRear = 1 + b * Math.max(v.rear - v.targetDirectionalRes, 0) / 100;
  const f = clamp(v.frontRate, 0, 100) / 100;
  const mFront = 1 + f * Math.max(v.frontAmp - v.targetDirectionalRes, 0) / 100;
  const mDirection = attackDirection === 'front' ? mFront : attackDirection === 'back' ? mRear : 1;

  const mh = multiHitCalc(v.multiHit, multiHitMode);

  const perfectProc = clamp(v.perfect - v.targetPerfectRes, 0, 100);
  const dPerfect = perfectProc / 100;
  const O = xMax + 0.32 * range;
  const P = z * (1 - dPerfect) + O * (1 + w) * dPerfect;

  const damage = Math.max(0, P * mAmp * mCrit * mDirection * mh.multiplier);

  return {
    gear, base, effAtk, mitigate, h, xMax, range,
    mAmp, mCrit, smiteProc, w, z, mRear, mFront, mDirection, mh, perfectProc, P, damage,
  };
}

function calc() {
  saveInputs();
  const v = {};
  ids.forEach(id => v[id] = parseFloat($(id).value) || 0);
  const warn = $('warn');
  warn.style.display = 'none';

  const isPve = combatType.value === 'pve';
  const skillType = skillTypeEl.value;
  const multiHitMode = multiHitModeEl.value;
  const attackDirection = attackDirectionEl.value;

  const pools = computePools(v);
  $('incView').textContent = `공격력 증가율: 착용 ${pools.incOn.toFixed(1)}% · 해제 ${pools.incOff.toFixed(1)}%`;
  if (pools.gear <= 0 || pools.base < 0) {
    warn.textContent = '⚠ 공격력/증가율 입력값을 확인해주세요 (장비공이 0 이하로 계산됨)';
    warn.style.display = 'block';
  }

  const res = computeDamage(v, pools, isPve, skillType, multiHitMode, attackDirection);
  const D0 = res.damage;

  $('pBase').textContent = fmt(res.base);
  $('pGear').textContent = fmt(res.gear);
  $('pEff').textContent = fmt(res.effAtk);
  $('pFinal').textContent = fmt(D0);

  $('mults').innerHTML =
    `<span class="mtag">관통·방어 보정 <b>-${fmt(res.mitigate)}</b></span>
     <span class="mtag">증폭군 <b>× ${res.mAmp.toFixed(3)}</b></span>
     <span class="mtag">치명 기대 <b>× ${res.mCrit.toFixed(3)}</b></span>
     <span class="mtag">강타·완벽 기대 <b>× ${(res.P / res.h).toFixed(3)}</b> (강타 ${res.smiteProc.toFixed(1)}% · 완벽 ${res.perfectProc.toFixed(1)}%)</span>
     <span class="mtag">방향 기대 <b>× ${res.mDirection.toFixed(3)}</b> (${attackDirection === 'front' ? '전방 선택' : attackDirection === 'back' ? '후방 선택' : '해당없음'} · 후방${res.mRear.toFixed(3)} / 전방${res.mFront.toFixed(3)} 중 적용)</span>
     <span class="mtag">다단히트 기대 <b>× ${res.mh.multiplier.toFixed(3)}</b></span>`;

  // 한 스탯만 살짝 올렸을 때 최종 데미지가 몇 % 오르는지 실측(재계산) 방식으로 산출.
  const marginal = overrides => {
    const v2 = Object.assign({}, v, overrides);
    const D1 = computeDamage(v2, pools, isPve, skillType, multiHitMode, attackDirection).damage;
    return D0 > 0 ? (D1 / D0 - 1) * 100 : 0;
  };
  // 파괴/위력처럼 증가율(onM/offM)에 영향을 주는 스탯은 gear/base 풀은 그대로 두고
  // 배율만 다시 계산해야 한다 — atk/atkNaked까지 같이 역산하면 서로 상쇄돼 효율이 0에 가깝게 나오는 버그가 생김.
  const marginalRate = overrides => {
    const v2 = Object.assign({}, v, overrides);
    const incOff2 = v2.destr * 0.2 + v2.power * 0.1;
    const incOn2 = incOff2 + v2.brk * 5;
    const pools2 = Object.assign({}, pools, { onM: 1 + incOn2 / 100, offM: 1 + incOff2 / 100 });
    const D1 = computeDamage(v2, pools2, isPve, skillType, multiHitMode, attackDirection).damage;
    return D0 > 0 ? (D1 / D0 - 1) * 100 : 0;
  };
  const marginalPockets = (gearDelta, baseDelta) => {
    const D1 = computeDamage(v, pools, isPve, skillType, multiHitMode, attackDirection, gearDelta, baseDelta).damage;
    return D0 > 0 ? (D1 / D0 - 1) * 100 : 0;
  };

  const smiteCapped = (v.smite + v.sbuff - v.smiteResist) >= 100;
  const list = [
    { name: '후방 피해 증폭 +1%p', key: '후방 피해 증폭', val: marginal({ rear: v.rear + 1 }), tag: attackDirection !== 'back' ? '(공격 방향이 후방 아님 → 무효과)' : '' },
    { name: '전방 피해 증폭 +1%p (헤드어택)', key: '전방 피해 증폭', val: marginal({ frontAmp: v.frontAmp + 1 }), tag: attackDirection !== 'front' ? '(공격 방향이 전방 아님 → 무효과)' : '' },
    { name: '강타 +1%p', key: '강타', val: smiteCapped ? 0 : marginal({ smite: v.smite + 1 }), tag: smiteCapped ? '(발동 100% 도달)' : '' },
    { name: '무기 피해 증폭 +1%p', key: '무기 피해 증폭', val: marginal({ wdmg: v.wdmg + 1 }) },
    { name: '치명타 피해 증폭 +1%p', key: '치명타 피해 증폭', val: marginal({ cdmg: v.cdmg + 1 }) },
    { name: '피증(합연산군) +1%p', key: '피증', val: marginal({ amp: v.amp + 1 }) },
    { name: '완벽 +1%p', key: '완벽', val: marginal({ perfect: v.perfect + 1 }) },
    { name: '다단 히트 적중 +1%p', key: '다단 히트', val: marginal({ multiHit: v.multiHit + 1 }) },
    { name: '파괴 +1', key: '파괴', val: marginalRate({ destr: v.destr + 1 }) },
    { name: '위력 +1', key: '위력', val: marginalRate({ power: v.power + 1 }) },
    { name: '관통 +10', key: '관통', val: marginal({ penetration: v.penetration + 10 }) },
    { name: '공격력 +10 (마석·장비)', key: '공격력', val: marginalPockets(10, 0) },
    { name: '추가공격력 +10 (펫 등, 증가율만 적용)', key: '추가공격력', val: marginalPockets(0, 10) },
  ].sort((a, x) => x.val - a.val);

  const max = Math.max(...list.map(x => x.val), 0.0001);
  $('bars').innerHTML = list.map(x => {
    const w = Math.max(x.val / max * 100, 2);
    const inside = w > 35;
    return `<div class="bar-row"><div class="bar-name">${x.name}${x.tag ? '<br><span style="font-size:10px;color:var(--muted)">' + x.tag + '</span>' : ''}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:var(--gold)">${inside ? pct(x.val) : ''}</div>
      ${inside ? '' : `<span class="bar-val" style="left:${w}%">${pct(x.val)}</span>`}</div></div>`;
  }).join('');

  // 마석 옵션 5종 실시간 비교 (raw 100 ≈ +1.2%p, 사용자 실측 제보 기준)
  const RAW = 1.2;
  const manaOptions = [
    { name: '공격력 +10', val: marginalPockets(10, 0) },
    { name: '피증 +1.2%p', val: marginal({ amp: v.amp + RAW }) },
    { name: '무기피증 +1.2%p', val: marginal({ wdmg: v.wdmg + RAW }) },
    { name: '치명피증 +1.2%p', val: marginal({ cdmg: v.cdmg + RAW }) },
    { name: '후방피증 +1.2%p', val: marginal({ rear: v.rear + RAW }) },
    { name: '전방피증 +1.2%p', val: marginal({ frontAmp: v.frontAmp + RAW }) },
  ].sort((a, x) => x.val - a.val);

  renderSlotRecommend(list[0] && list[0].val > 0 ? list[0].key : null, manaOptions);
}

restoreInputs();
syncCombatLabels();
calc();
