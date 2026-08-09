const cards = [
  {id:"grid",subject:"computer",term:"그리드 컴퓨팅",definition:"지리적으로 떨어진 여러 컴퓨터의 자원을 연결해 하나의 고성능 컴퓨터처럼 활용하는 방식입니다.",point:"클라우드는 필요한 만큼 빌려 쓰는 서비스, 그리드는 분산 자원을 묶는 계산 방식으로 구분합니다."},
  {id:"cmos",subject:"computer",term:"CMOS",definition:"시스템 날짜와 시간, 부팅 순서, 전원 관리, PnP 설정 같은 하드웨어 환경 값을 보관합니다.",point:"BIOS·POST·RAID와 역할을 섞지 않도록 주의하세요."},
  {id:"ipv6",subject:"computer",term:"IPv6",definition:"128비트 주소를 16진수와 콜론(:)으로 표현하는 차세대 인터넷 주소 체계입니다.",point:"연속된 0은 한 번만 ‘::’로 줄일 수 있습니다."},
  {id:"bridge",subject:"computer",term:"브리지",definition:"같은 프로토콜을 사용하는 두 LAN을 연결하고 프레임을 전달하는 네트워크 장비입니다.",point:"인증·암호화·방화벽은 보안 기술이지만 브리지는 연결 장비입니다."},
  {id:"morphing",subject:"computer",term:"모핑",definition:"두 이미지나 3차원 모델 사이를 부드럽게 변형해 중간 변화 과정을 보여 주는 애니메이션 기법입니다.",point:"셀 애니메이션·키 프레임·클레이메이션과 구분합니다."},
  {id:"shareware",subject:"computer",term:"셰어웨어",definition:"기능이나 사용 기간을 제한해 먼저 공개한 뒤 구매를 유도하는 소프트웨어입니다.",point:"프리웨어는 무료 사용·배포, 패치는 오류 수정용 일부 파일입니다."},
  {id:"restore",subject:"computer",term:"시스템 복원",definition:"복원 지점을 사용해 시스템 설정을 이전 상태로 되돌리는 Windows 기능입니다.",point:"개인 문서를 백업하거나 삭제된 개인 파일을 복구하는 기능은 아닙니다."},
  {id:"ransomware",subject:"computer",term:"랜섬웨어",definition:"개인 파일을 암호화하거나 사용을 막고 복구 대가로 금전을 요구하는 악성 프로그램입니다.",point:"확장자 변경과 금전 요구가 대표 징후입니다."},
  {id:"pop3",subject:"computer",term:"POP3",definition:"원격 메일 서버에 접속해 받은 메일을 사용자 컴퓨터로 가져오는 프로토콜입니다.",point:"SMTP는 메일 전송, MIME은 멀티미디어 메일 형식 확장과 관련됩니다."},
  {id:"repeater",subject:"computer",term:"리피터",definition:"통신 선로에서 약해진 디지털 신호를 증폭·재생해 다시 전달하는 장비입니다.",point:"게이트웨이는 다른 네트워크의 출입구, 라우터는 최적 경로 선택 역할입니다."},
  {id:"ascii",subject:"computer",term:"ASCII",definition:"표준 ASCII는 7비트로 영문 대소문자, 숫자, 문장 부호와 제어 문자를 표현합니다.",point:"패리티 비트는 오류 검출용이며 표준 ASCII 자체는 7비트입니다."},
  {id:"vector",subject:"computer",term:"벡터 그래픽",definition:"점, 선, 곡선의 수학적 정보로 이미지를 표현하는 방식입니다.",point:"확대해도 계단 현상이 적고 파일 크기가 비교적 작습니다."},
  {id:"alt-enter",subject:"spreadsheet",term:"Alt + Enter",definition:"Excel 셀에 데이터를 입력하는 중 같은 셀 안에서 줄을 바꿉니다.",point:"Enter는 입력 완료, Alt+Enter는 셀 내부 줄 바꿈입니다."},
  {id:"vlookup",subject:"spreadsheet",term:"VLOOKUP",definition:"범위의 첫 열에서 값을 찾아 지정한 열의 같은 행 값을 반환합니다.",point:"정확히 일치하려면 네 번째 인수에 FALSE 또는 0을 사용합니다."},
  {id:"consolidate",subject:"spreadsheet",term:"데이터 통합",definition:"여러 범위의 데이터를 위치 또는 항목 이름 기준으로 모아 요약합니다.",point:"함수는 합계·개수·평균·최대·최소 등을 선택할 수 있습니다."},
  {id:"sheet-protection",subject:"spreadsheet",term:"시트 보호와 잠금",definition:"셀의 ‘잠금’ 속성은 시트를 보호했을 때 실제 편집 제한으로 작동합니다.",point:"특정 셀만 입력 가능하게 하려면 먼저 그 셀의 잠금을 해제한 뒤 시트를 보호합니다."},
  {id:"format-placeholders",subject:"spreadsheet",term:"표시 형식 0 · # · ?",definition:"0은 자릿수를 강제로 표시하고, #은 유효한 숫자만, ?는 자릿수 공간을 맞춰 표시합니다.",point:"분수의 분모·분자 위치를 맞출 때 ?가 자주 쓰입니다."},
  {id:"wildcards",subject:"spreadsheet",term:"와일드카드 * · ?",definition:"*는 길이에 관계없는 여러 문자, ?는 임의의 한 문자를 대신합니다.",point:"‘삼?주식회사’는 가운데 한 글자가 있는 문자열을 찾습니다."},
  {id:"date-serial",subject:"spreadsheet",term:"날짜·시간 일련번호",definition:"Excel은 날짜와 시간을 숫자 일련번호로 저장하며 기본적으로 오른쪽 정렬합니다.",point:"날짜를 입력한 뒤 표시 형식만 바꿔도 내부 값은 숫자로 유지됩니다."},
  {id:"goal-seek",subject:"spreadsheet",term:"목표값 찾기",definition:"수식 결과가 원하는 값이 되도록 하나의 입력 셀 값을 역으로 계산합니다.",point:"여러 경우를 비교하는 시나리오 관리자와 구분하세요."},
  {id:"advanced-filter",subject:"spreadsheet",term:"고급 필터 조건",definition:"같은 행에 적은 조건은 AND, 서로 다른 행에 적은 조건은 OR로 적용됩니다.",point:"조건 범위의 필드명은 원본 데이터의 필드명과 정확히 맞춰야 합니다."},
  {id:"rank-eq",subject:"spreadsheet",term:"RANK.EQ",definition:"목록에서 값의 순위를 구하며 세 번째 인수가 0이면 내림차순, 1이면 오름차순입니다.",point:"범위는 복사해도 바뀌지 않게 절대 참조로 지정하는 경우가 많습니다."},
  {id:"pivot",subject:"spreadsheet",term:"피벗 테이블",definition:"많은 데이터를 행·열·값 필드로 재배치해 요약하고 분석하는 도구입니다.",point:"원본 값이 바뀌면 새로 고침으로 반영하며 피벗 삭제가 원본을 삭제하지는 않습니다."},
  {id:"countif-average",subject:"spreadsheet",term:"COUNTIF + AVERAGE",definition:"평균 이상인 값의 개수는 COUNTIF의 조건 문자열과 AVERAGE 결과를 &로 연결해 구합니다.",point:"예: =COUNTIF(C2:C8,\">=\"&AVERAGE(C2:C8))"}
];

const knownKey = "bwr-computer-known-v1";
let known = new Set(JSON.parse(localStorage.getItem(knownKey) || "[]"));
let subject = "all";
let view = "all";
let position = 0;
let flipped = false;

const el = (id) => document.getElementById(id);
const filtered = () => cards.filter((card) => (subject === "all" || card.subject === subject) && (view === "all" || !known.has(card.id)));

function render() {
  const list = filtered();
  if (!list.length) { view = "all"; position = 0; return render(); }
  position = (position + list.length) % list.length;
  const card = list[position];
  el("cardSubject").textContent = card.subject === "computer" ? "1과목 컴퓨터 일반" : "2과목 스프레드시트 일반";
  el("cardPosition").textContent = `${position + 1} / ${list.length}`;
  el("cardTerm").textContent = card.term;
  el("cardDefinition").textContent = card.definition;
  el("cardPoint").textContent = `시험 포인트 · ${card.point}`;
  el("cardHint").hidden = flipped;
  el("cardDefinition").hidden = !flipped;
  el("cardPoint").hidden = !flipped;
  el("knownCard").textContent = known.has(card.id) ? "알고 있어요 ✓" : "알아요 ✓";
  el("knownStat").textContent = `${known.size} / ${cards.length} 알아요`;
}

function flip() { flipped = !flipped; render(); }
function move(delta) { position += delta; flipped = false; render(); }
function currentCard() { return filtered()[position]; }

el("flashcard").addEventListener("click", flip);
el("flashcard").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); } });
el("prevCard").addEventListener("click", () => move(-1));
el("nextCard").addEventListener("click", () => move(1));
el("againCard").addEventListener("click", () => { known.delete(currentCard().id); localStorage.setItem(knownKey, JSON.stringify([...known])); move(1); });
el("knownCard").addEventListener("click", () => { known.add(currentCard().id); localStorage.setItem(knownKey, JSON.stringify([...known])); move(1); });
el("subjectFilter").addEventListener("change", (event) => { subject = event.target.value; position = 0; flipped = false; render(); });
document.querySelectorAll(".view-filter").forEach((button) => button.addEventListener("click", () => { view = button.dataset.view; position = 0; flipped = false; document.querySelectorAll(".view-filter").forEach((item) => item.classList.toggle("active", item === button)); render(); }));
render();
