// ---------- 스탯 카탈로그 (gear-budget.html · goal-calc.html 공용) ----------
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
// 종족 이해도는 "데리고 다니는 펫"이 아니라 종족별로 따로 쌓이는 적용 수치라 5개 종족이 전부 동시에 적용된다.
const PET_RACES = ['지성', '야성', '자연', '변형', '특수'];
// 펫 이해도 9슬롯은 3개씩 방어(1·4·7)/공격(2·5·8)/증폭·내성(3·6·9) 전용으로 나뉜다.
// 3·6·9엔 막기·치명타처럼 다른 슬롯에도 공통으로 뜨는 옵션이 데이터상 같이 섞여 있지만,
// 실제로는 증폭·내성류를 챙기는 슬롯이라 증폭·내성이 아닌 스탯을 계산할 땐 제외해야 한다.
const PET_AMPRES_SLOTS = new Set([3, 6, 9]);

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
