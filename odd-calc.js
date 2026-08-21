const $ = id => document.getElementById(id);

// 출처: 아이온2 인벤 "초월,원정 입장조건, 키나 정리 (2026.7.1 기준)"
// https://www.inven.co.kr/board/aion2/6444/2064
// 콰이링 특급 멤버십(큐브 2배 개봉) 기준. 비공식 커뮤니티 자료, 공식 확정 수치 아님.
// 2026-08-12 패치 신규: 잠식된 데우스 연구기지(원정)=타락한 데바의 성, 노이란의 숨겨진 유산(초월)=심연의 뿔 암굴과
// 오드 소모량·키나 획득량이 동일하다는 사용자 확인(직접 플레이) 기반으로 각 난이도를 그대로 미러링.
const DUNGEONS = [
  { cat: '초월', tier: '4티어', diff: '4단', nick: '노이란 초월 (신규 8/12)', name: '노이란의 숨겨진 유산', lv: 50, itemLv: 4800, cp: 700, odd: 120, kinaNormal: 420, kinaEngrave: 0, kinaTotal: 420, per10: 35.0 },
  { cat: '초월', tier: '4티어', diff: '3단', nick: '노이란 초월 (신규 8/12)', name: '노이란의 숨겨진 유산', lv: 50, itemLv: 4500, cp: 600, odd: 80, kinaNormal: 240, kinaEngrave: 0, kinaTotal: 240, per10: 30.0 },
  { cat: '초월', tier: '4티어', diff: '2단', nick: '노이란 초월 (신규 8/12)', name: '노이란의 숨겨진 유산', lv: 50, itemLv: 4100, cp: 550, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '초월', tier: '4티어', diff: '1단', nick: '노이란 초월 (신규 8/12)', name: '노이란의 숨겨진 유산', lv: 50, itemLv: 3800, cp: 400, odd: 80, kinaNormal: 171, kinaEngrave: 0, kinaTotal: 171, per10: 21.4 },
  { cat: '원정(정복)', tier: '6티어', diff: '어려움', nick: '데우스 연구기지 (신규 8/12)', name: '잠식된 데우스 연구기지', lv: 50, itemLv: 4500, cp: 600, odd: 120, kinaNormal: 360, kinaEngrave: 0, kinaTotal: 360, per10: 30.0 },
  { cat: '원정(정복)', tier: '6티어', diff: '보통', nick: '데우스 연구기지 (신규 8/12)', name: '잠식된 데우스 연구기지', lv: 50, itemLv: 3800, cp: 450, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '원정(탐험)', tier: '-', diff: '-', nick: '데우스 연구기지 (신규 8/12)', name: '잠식된 데우스 연구기지', lv: 50, itemLv: 3800, cp: 400, odd: 80, kinaNormal: 0, kinaEngrave: 129, kinaTotal: 129, per10: 16.1 },
  { cat: '초월', tier: '4티어', diff: '4단', nick: '암굴 초월', name: '심연의 뿔 암굴', lv: 50, itemLv: 4800, cp: 700, odd: 120, kinaNormal: 420, kinaEngrave: 0, kinaTotal: 420, per10: 35.0 },
  { cat: '초월', tier: '4티어', diff: '3단', nick: '암굴 초월', name: '심연의 뿔 암굴', lv: 50, itemLv: 4500, cp: 600, odd: 80, kinaNormal: 240, kinaEngrave: 0, kinaTotal: 240, per10: 30.0 },
  { cat: '원정(정복)', tier: '6티어', diff: '어려움', nick: '타려움 / 데려움', name: '타락한 데바의 성', lv: 50, itemLv: 4500, cp: 600, odd: 120, kinaNormal: 360, kinaEngrave: 0, kinaTotal: 360, per10: 30.0 },
  { cat: '초월', tier: '3티어', diff: '4단', nick: '크로메데 초월', name: '붉은 연심의 거울', lv: 45, itemLv: 4000, cp: 500, odd: 80, kinaNormal: 240, kinaEngrave: 0, kinaTotal: 240, per10: 30.0 },
  { cat: '초월', tier: '4티어', diff: '2단', nick: '암굴 초월', name: '심연의 뿔 암굴', lv: 50, itemLv: 4100, cp: 550, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '초월', tier: '3티어', diff: '3단', nick: '크로메데 초월', name: '붉은 연심의 거울', lv: 45, itemLv: 3800, cp: 450, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '원정(정복)', tier: '6티어', diff: '보통', nick: '타락 / 데바', name: '타락한 데바의 성', lv: 50, itemLv: 3800, cp: 450, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '원정(정복)', tier: '5티어', diff: '어려움', nick: '푸려움', name: '푸른 숨의 섬', lv: 45, itemLv: 3500, cp: 450, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '원정(정복)', tier: '5티어', diff: '어려움', nick: '회려움', name: '환영의 회랑', lv: 45, itemLv: 3500, cp: 450, odd: 80, kinaNormal: 201, kinaEngrave: 0, kinaTotal: 201, per10: 25.1 },
  { cat: '초월', tier: '3티어', diff: '2단', nick: '크로메데 초월', name: '붉은 연심의 거울', lv: 45, itemLv: 3500, cp: 400, odd: 80, kinaNormal: 171, kinaEngrave: 0, kinaTotal: 171, per10: 21.4 },
  { cat: '초월', tier: '4티어', diff: '1단', nick: '암굴 초월', name: '심연의 뿔 암굴', lv: 50, itemLv: 3800, cp: 400, odd: 80, kinaNormal: 171, kinaEngrave: 0, kinaTotal: 171, per10: 21.4 },
  { cat: '원정(정복)', tier: '5티어', diff: '보통', nick: '푸숨', name: '푸른 숨의 섬', lv: 45, itemLv: 3000, cp: 300, odd: 80, kinaNormal: 162, kinaEngrave: 0, kinaTotal: 162, per10: 20.3 },
  { cat: '원정(정복)', tier: '5티어', diff: '보통', nick: '회랑', name: '환영의 회랑', lv: 45, itemLv: 3000, cp: 250, odd: 80, kinaNormal: 162, kinaEngrave: 0, kinaTotal: 162, per10: 20.3 },
  { cat: '원정(정복)', tier: '4티어', diff: '어려움', nick: '무요람', name: '무의 요람', lv: 45, itemLv: 3000, cp: 300, odd: 80, kinaNormal: 162, kinaEngrave: 0, kinaTotal: 162, per10: 20.3 },
  { cat: '원정(정복)', tier: '4티어', diff: '어려움', nick: '두쫀쿠', name: '드라마타', lv: 45, itemLv: 3000, cp: 300, odd: 80, kinaNormal: 162, kinaEngrave: 0, kinaTotal: 162, per10: 20.3 },
  { cat: '초월', tier: '3티어', diff: '1단', nick: '크로메데 초월', name: '붉은 연심의 거울', lv: 45, itemLv: 3200, cp: 300, odd: 80, kinaNormal: 150, kinaEngrave: 0, kinaTotal: 150, per10: 18.8 },
  { cat: '초월', tier: '2티어', diff: '4단', nick: '신전 초월', name: '가라앉은 생명의 신전', lv: 45, itemLv: 3200, cp: 400, odd: 80, kinaNormal: 75, kinaEngrave: 75, kinaTotal: 150, per10: 18.8 },
  { cat: '초월', tier: '2티어', diff: '3단', nick: '신전 초월', name: '가라앉은 생명의 신전', lv: 45, itemLv: 3200, cp: 300, odd: 80, kinaNormal: 72, kinaEngrave: 69, kinaTotal: 141, per10: 17.6 },
  { cat: '초월', tier: '2티어', diff: '2단', nick: '신전 초월', name: '가라앉은 생명의 신전', lv: 45, itemLv: 2800, cp: 200, odd: 80, kinaNormal: 66, kinaEngrave: 66, kinaTotal: 132, per10: 16.5 },
  { cat: '원정(탐험)', tier: '-', diff: '-', nick: '타락', name: '타락한 데바의 성', lv: 50, itemLv: 3800, cp: 400, odd: 80, kinaNormal: 0, kinaEngrave: 129, kinaTotal: 129, per10: 16.1 },
  { cat: '원정(정복)', tier: '4티어', diff: '보통', nick: '무요람', name: '무의 요람', lv: 45, itemLv: 2800, cp: 200, odd: 80, kinaNormal: 60, kinaEngrave: 60, kinaTotal: 120, per10: 15.0 },
  { cat: '원정(정복)', tier: '4티어', diff: '보통', nick: '두쫀쿠', name: '드라마타', lv: 45, itemLv: 2800, cp: 200, odd: 80, kinaNormal: 60, kinaEngrave: 60, kinaTotal: 120, per10: 15.0 },
  { cat: '초월', tier: '2티어', diff: '1단', nick: '신전 초월', name: '가라앉은 생명의 신전', lv: 45, itemLv: 2400, cp: 150, odd: 80, kinaNormal: 60, kinaEngrave: 60, kinaTotal: 120, per10: 15.0 },
  { cat: '원정(탐험)', tier: '-', diff: '-', nick: '푸숨', name: '푸른 숨의 섬', lv: 45, itemLv: 3000, cp: 300, odd: 80, kinaNormal: 0, kinaEngrave: 114, kinaTotal: 114, per10: 14.3 },
  { cat: '원정(탐험)', tier: '-', diff: '-', nick: '회랑', name: '환영의 회랑', lv: 45, itemLv: 3000, cp: 300, odd: 80, kinaNormal: 0, kinaEngrave: 114, kinaTotal: 114, per10: 14.3 },
  { cat: '원정(정복)', tier: '3티어', diff: '보통', nick: '누아쿰', name: '사나운 뿔 암굴', lv: 45, itemLv: 2200, cp: 150, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '3티어', diff: '어려움', nick: '누아쿰', name: '사나운 뿔 암굴', lv: 45, itemLv: 2600, cp: 200, odd: 80, kinaNormal: 51, kinaEngrave: 51, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '3티어', diff: '보통', nick: '불신', name: '불의 신전', lv: 45, itemLv: 2200, cp: 150, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '3티어', diff: '어려움', nick: '불신', name: '불의 신전', lv: 45, itemLv: 2600, cp: 200, odd: 80, kinaNormal: 51, kinaEngrave: 51, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '2티어', diff: '어려움', nick: '우루구구', name: '우루구구', lv: 45, itemLv: 2500, cp: 200, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '2티어', diff: '어려움', nick: '바크론', name: '바크론', lv: 45, itemLv: 2500, cp: 200, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '1티어', diff: '어려움', nick: '드라웁', name: '드라웁니르', lv: 45, itemLv: 2400, cp: 170, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '1티어', diff: '어려움', nick: '크라오', name: '크라오', lv: 45, itemLv: 2400, cp: 170, odd: 80, kinaNormal: 0, kinaEngrave: 102, kinaTotal: 102, per10: 12.8 },
  { cat: '원정(정복)', tier: '2티어', diff: '보통', nick: '바크론', name: '바크론', lv: 45, itemLv: 1600, cp: 150, odd: 80, kinaNormal: 0, kinaEngrave: 81, kinaTotal: 81, per10: 10.1 },
  { cat: '원정(정복)', tier: '2티어', diff: '보통', nick: '우루구구', name: '우루구구', lv: 45, itemLv: 1600, cp: 150, odd: 80, kinaNormal: 0, kinaEngrave: 81, kinaTotal: 81, per10: 10.1 },
  { cat: '원정(정복)', tier: '1티어', diff: '보통', nick: '드라웁', name: '드라웁니르', lv: 45, itemLv: 1000, cp: 120, odd: 80, kinaNormal: 0, kinaEngrave: 60, kinaTotal: 60, per10: 7.5 },
  { cat: '원정(정복)', tier: '1티어', diff: '보통', nick: '크라오', name: '크라오', lv: 45, itemLv: 1000, cp: 120, odd: 80, kinaNormal: 0, kinaEngrave: 60, kinaTotal: 60, per10: 7.5 },
];

DUNGEONS.sort((a, b) => b.per10 - a.per10);

// 원정(정복)/원정(탐험)/초월을 구분해서 각자 표로 보여준다 (성역은 오드 기반이 아니라 별도 카드로 안내).
const CATEGORIES = ['원정(정복)', '원정(탐험)', '초월'];

function renderTable(mult, budget) {
  $('oddTables').innerHTML = CATEGORIES.map(cat => {
    const group = DUNGEONS.filter(d => d.cat === cat);
    const rows = group.map(d => {
      const runs = Math.floor(budget / d.odd);
      const totalKina = Math.round(runs * d.kinaTotal * mult);
      return `
      <tr>
        <td>${d.tier} ${d.diff}</td>
        <td>${d.name}${d.nick ? ` <span class="odd-nick">(${d.nick})</span>` : ''}</td>
        <td>Lv${d.lv} / 템렙${d.itemLv.toLocaleString()} / 남툴${d.cp}k</td>
        <td>${d.odd}</td>
        <td class="odd-eff">${runs}회</td>
        <td class="odd-eff">${totalKina.toLocaleString()}만</td>
        <td>적용 ${d.kinaTotal.toLocaleString()}만 / 미적용 ${Math.round(d.kinaTotal * 0.5).toLocaleString()}만</td>
      </tr>`;
    }).join('');
    return `
      <div class="card" style="margin-top:16px">
        <h2>${cat} <span style="color:var(--muted);font-weight:400;font-size:12px">— 10오드당 획득 키나 기준 내림차순 · ${group.length}개</span></h2>
        <div style="overflow-x:auto">
          <table class="odd-table">
            <thead><tr>
              <th>티어/난이도</th><th>던전</th><th>입장조건</th><th>소모오드</th><th>보유 오드로 총 클리어</th><th>총 획득 키나</th><th>던전 1회당 (멤버십 적용/미적용)</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

function calc() {
  const mult = parseFloat($('membership').value) || 1;
  const budget = Math.max(0, parseFloat($('oddBudget').value) || 0);
  renderTable(mult, budget);
}

$('oddBudget').addEventListener('input', calc);
$('membership').addEventListener('change', calc);

calc();
