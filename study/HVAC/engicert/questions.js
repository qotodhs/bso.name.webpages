window.HVAC_QUESTION_BANK = [
  {
    id: "E01",
    subject: "energy",
    topic: "열역학 제1법칙",
    question: "밀폐계에서 계가 외부에 한 일을 양(+)으로 정의할 때 내부에너지 변화식으로 옳은 것은?",
    choices: ["ΔU = Q − W", "ΔU = Q + W", "ΔU = W − Q", "ΔU = Q × W"],
    answer: 0,
    explanation: "밀폐계의 에너지수지는 유입열에서 계가 외부에 한 일을 뺀 값이 내부에너지 변화가 됩니다.",
    theory: "../theory/#energy-first-law"
  },
  {
    id: "E02",
    subject: "energy",
    topic: "냉동기의 성적계수",
    question: "냉동기의 성적계수 COP를 올바르게 나타낸 것은?",
    choices: ["압축일 ÷ 냉동효과", "냉동효과 ÷ 압축일", "응축열량 ÷ 냉동효과", "압축일 ÷ 응축열량"],
    answer: 1,
    explanation: "냉동기의 COP는 얻고자 하는 냉동효과를 투입한 압축일로 나눈 값입니다.",
    theory: "../theory/#refrigeration-cop"
  },
  {
    id: "E03",
    subject: "energy",
    topic: "카르노 냉동사이클",
    question: "저온부 절대온도 TL, 고온부 절대온도 TH인 카르노 냉동기의 COP는?",
    choices: ["TH ÷ (TH − TL)", "TL ÷ (TH − TL)", "(TH − TL) ÷ TL", "TL ÷ TH"],
    answer: 1,
    explanation: "카르노 냉동기의 COP는 저온부 절대온도를 두 열원 간 절대온도 차로 나눈 값입니다.",
    theory: "../theory/#carnot-refrigerator"
  },
  {
    id: "E04",
    subject: "energy",
    topic: "현열 계산",
    question: "질량유량 m, 비열 cp, 입출구 온도차 ΔT를 이용한 현열량 계산식은?",
    choices: ["Q = mcpΔT", "Q = mΔT ÷ cp", "Q = cp ÷ mΔT", "Q = mcp ÷ ΔT"],
    answer: 0,
    explanation: "상변화가 없는 유체의 현열량은 질량유량·비열·온도차의 곱으로 계산합니다.",
    theory: "../theory/#sensible-heat"
  },
  {
    id: "E05",
    subject: "energy",
    topic: "열전도",
    question: "평판을 통한 정상 열전도량을 증가시키는 방법으로 옳지 않은 것은?",
    choices: ["열전도율을 높인다", "전열면적을 넓힌다", "온도차를 크게 한다", "벽 두께를 두껍게 한다"],
    answer: 3,
    explanation: "평판 열전도량은 두께에 반비례하므로 벽이 두꺼워지면 열전달량이 감소합니다.",
    theory: "../theory/#fourier-conduction"
  },
  {
    id: "E06",
    subject: "energy",
    topic: "대수평균온도차",
    question: "열교환기의 두 끝 온도차가 각각 ΔT1, ΔT2일 때 대수평균온도차를 사용하는 주된 이유는?",
    choices: ["유량이 항상 같기 때문에", "열교환기 길이에 따라 온도차가 변하기 때문에", "압력이 일정하기 때문에", "비열을 무시하기 위해"],
    answer: 1,
    explanation: "열교환기 내부에서는 위치에 따라 두 유체의 온도차가 달라지므로 대수평균온도차를 사용합니다.",
    theory: "../theory/#lmtd"
  },
  {
    id: "E07",
    subject: "energy",
    topic: "상대습도",
    question: "상대습도를 올바르게 설명한 것은?",
    choices: ["건공기 질량에 대한 수증기 질량의 비", "현재 수증기분압과 같은 온도의 포화수증기압의 비", "건구온도와 습구온도의 차", "공기 중 수증기의 체적만을 나타낸 값"],
    answer: 1,
    explanation: "상대습도는 현재 수증기분압을 같은 온도의 포화수증기압으로 나눈 비율입니다.",
    theory: "../theory/#relative-humidity"
  },
  {
    id: "E08",
    subject: "energy",
    topic: "습구온도",
    question: "포화되지 않은 공기에서 일반적으로 성립하는 관계는?",
    choices: ["습구온도 > 건구온도", "습구온도 = 건구온도보다 항상 10℃ 낮음", "습구온도 < 건구온도", "노점온도 > 건구온도"],
    answer: 2,
    explanation: "불포화 공기에서는 물의 증발냉각 때문에 습구온도가 건구온도보다 낮습니다.",
    theory: "../theory/#dry-wet-bulb"
  },
  {
    id: "E09",
    subject: "energy",
    topic: "압력의 기준",
    question: "절대압력과 게이지압력의 관계로 옳은 것은?",
    choices: ["절대압력 = 게이지압력 − 대기압", "절대압력 = 게이지압력 + 대기압", "게이지압력 = 절대압력 + 대기압", "절대압력과 게이지압력은 항상 같다"],
    answer: 1,
    explanation: "절대압력은 완전진공을 기준으로 하므로 게이지압력에 대기압을 더한 값입니다.",
    theory: "../theory/#absolute-gauge-pressure"
  },

  {
    id: "D01",
    subject: "design",
    topic: "압축기의 역할",
    question: "증기압축 냉동사이클에서 압축기의 주된 역할은?",
    choices: ["냉매액을 감압한다", "저압 냉매증기를 고압으로 압축한다", "냉매의 응축열을 외부로 방출한다", "냉매액을 저장한다"],
    answer: 1,
    explanation: "압축기는 증발기에서 나온 저압 냉매증기의 압력과 온도를 높여 응축기로 보냅니다.",
    theory: "../theory/#compressor-role"
  },
  {
    id: "D02",
    subject: "design",
    topic: "과냉각",
    question: "응축기 출구 냉매액의 과냉각을 확보했을 때 기대되는 효과는?",
    choices: ["액관의 플래시가스 발생 감소", "압축기 토출온도 무조건 상승", "증발압력 무조건 감소", "냉매유량이 항상 0이 됨"],
    answer: 0,
    explanation: "과냉각은 팽창밸브 전단까지 냉매를 액상으로 유지하여 액관의 플래시가스를 줄입니다.",
    theory: "../theory/#subcooling"
  },
  {
    id: "D03",
    subject: "design",
    topic: "과열도",
    question: "증발기 출구에서 적절한 과열도를 확보하는 가장 직접적인 목적은?",
    choices: ["액냉매의 압축기 유입 방지", "응축압력 상승", "액관의 직경 증가", "냉각탑 수온 상승"],
    answer: 0,
    explanation: "적절한 과열도는 증발기 출구 냉매를 증기 상태로 만들어 압축기의 액압축을 방지합니다.",
    theory: "../theory/#superheat"
  },
  {
    id: "D04",
    subject: "design",
    topic: "팽창장치",
    question: "팽창밸브에서 일어나는 과정에 가장 가까운 것은?",
    choices: ["등엔트로피 압축", "등엔탈피 교축", "등압 가열", "등온 압축"],
    answer: 1,
    explanation: "팽창밸브는 외부일 없이 냉매를 교축하므로 이상적으로 엔탈피가 일정한 과정으로 봅니다.",
    theory: "../theory/#throttling-valve"
  },
  {
    id: "D05",
    subject: "design",
    topic: "응축기 열량",
    question: "정상상태 냉동사이클에서 응축기 방열량의 관계로 옳은 것은?",
    choices: ["응축기 방열량 = 증발기 냉동효과 + 압축기 일", "응축기 방열량 = 증발기 냉동효과 − 압축기 일", "응축기 방열량 = 압축기 일만", "응축기 방열량 = 0"],
    answer: 0,
    explanation: "응축기는 증발기에서 흡수한 열과 압축기가 가한 일을 합한 열량을 외부로 방출합니다.",
    theory: "../theory/#condenser-heat-rejection"
  },
  {
    id: "D06",
    subject: "design",
    topic: "냉방부하",
    question: "실내 냉방부하 중 잠열부하에 해당하는 것은?",
    choices: ["벽체를 통한 전도열", "조명에서 발생한 열", "외기가 가져오는 수분 제거 부하", "일사에 의한 창의 온도 상승"],
    answer: 2,
    explanation: "공기 중 수분을 응축해 제거하는 데 필요한 열량은 잠열부하에 해당합니다.",
    theory: "../theory/#latent-cooling-load"
  },
  {
    id: "D07",
    subject: "design",
    topic: "덕트 동압",
    question: "공기 밀도가 일정할 때 덕트 내 동압은 풍속과 어떤 관계인가?",
    choices: ["풍속에 반비례", "풍속의 제곱에 비례", "풍속의 세제곱에 비례", "풍속과 무관"],
    answer: 1,
    explanation: "동압은 ρv²/2로 표현되므로 공기 밀도가 일정하면 풍속의 제곱에 비례합니다.",
    theory: "../theory/#duct-velocity-pressure"
  },
  {
    id: "D08",
    subject: "design",
    topic: "송풍기 상사법칙",
    question: "같은 송풍기에서 회전수를 2배로 했을 때 이론상 축동력은 몇 배가 되는가?",
    choices: ["2배", "4배", "6배", "8배"],
    answer: 3,
    explanation: "송풍기 상사법칙에서 축동력은 회전수의 세제곱에 비례하므로 2배 회전수에서는 8배가 됩니다.",
    theory: "../theory/#fan-laws"
  },
  {
    id: "D09",
    subject: "design",
    topic: "역환수 배관",
    question: "온수 또는 냉수 배관에서 역환수방식을 사용하는 주된 이유는?",
    choices: ["각 말단의 공급·환수 총배관 길이를 비슷하게 하기 위해", "환수관을 없애기 위해", "펌프를 사용하지 않기 위해", "배관 내 공기를 일부러 가두기 위해"],
    answer: 0,
    explanation: "역환수방식은 각 계통의 총배관 저항을 비슷하게 만들어 유량 균형을 잡기 쉽게 합니다.",
    theory: "../theory/#reverse-return-piping"
  },

  {
    id: "S01",
    subject: "safety",
    topic: "기밀시험",
    question: "냉동설비 배관의 기밀시험용 가스로 가장 적절한 것은?",
    choices: ["산소", "건조 질소", "아세틸렌", "수소"],
    answer: 1,
    explanation: "건조 질소는 비가연성이며 수분 유입을 억제할 수 있어 냉매배관 기밀시험에 사용됩니다.",
    theory: "../theory/#nitrogen-pressure-test"
  },
  {
    id: "S02",
    subject: "safety",
    topic: "진공건조",
    question: "냉매를 충전하기 전 진공작업의 주된 목적은?",
    choices: ["배관 내부의 수분과 비응축가스 제거", "배관 내부의 냉동유 완전 제거", "응축압력 상승", "냉매를 액화"],
    answer: 0,
    explanation: "진공작업은 시스템 내부의 공기와 수분을 제거하여 부식·결빙·성능저하를 예방합니다.",
    theory: "../theory/#evacuation-dehydration"
  },
  {
    id: "S03",
    subject: "safety",
    topic: "누설 점검",
    question: "냉매배관을 질소로 가압한 뒤 가장 먼저 확인해야 할 사항은?",
    choices: ["압력 유지 여부와 접합부 누설", "냉각탑 팬 회전방향", "실내 조명 밝기", "보온재 색상"],
    answer: 0,
    explanation: "가압 후 압력 저하와 접합부 누설 여부를 확인해야 배관의 기밀성을 판단할 수 있습니다.",
    theory: "../theory/#refrigerant-leak-test"
  },
  {
    id: "S04",
    subject: "safety",
    topic: "액압축",
    question: "압축기로 액냉매가 다량 유입될 때 발생할 가능성이 가장 큰 현상은?",
    choices: ["액압축과 밸브 손상", "응축기 전열면적 증가", "배관 저항 완전 제거", "냉각탑 수질 개선"],
    answer: 0,
    explanation: "액체는 거의 압축되지 않으므로 액냉매 유입은 충격과 밸브·커넥팅로드 손상을 일으킬 수 있습니다.",
    theory: "../theory/#liquid-slugging"
  },
  {
    id: "S05",
    subject: "safety",
    topic: "고압보호장치",
    question: "응축압력이 비정상적으로 상승했을 때 압축기를 정지시키는 장치는?",
    choices: ["저압스위치", "고압스위치", "사이트글라스", "액분리기"],
    answer: 1,
    explanation: "고압스위치는 토출측 압력이 설정값을 넘으면 압축기를 정지시켜 설비를 보호합니다.",
    theory: "../theory/#high-pressure-switch"
  },
  {
    id: "S06",
    subject: "safety",
    topic: "봉입액의 열팽창",
    question: "두 차단밸브 사이 액관에 냉매액이 갇힐 수 있는 경우 필요한 보호조치는?",
    choices: ["릴리프 장치 설치", "배관 완전 용접 후 방치", "보온재 제거", "액관 직경 축소"],
    answer: 0,
    explanation: "갇힌 액체가 가열되면 매우 큰 압력이 발생할 수 있으므로 압력 해소용 릴리프 장치가 필요합니다.",
    theory: "../theory/#trapped-liquid-relief"
  },
  {
    id: "S07",
    subject: "safety",
    topic: "냉매용기 취급",
    question: "냉매용기의 안전한 보관방법으로 가장 적절한 것은?",
    choices: ["직사광선과 열원 가까이에 눕혀 보관", "통풍되는 곳에서 전도되지 않게 세워 보관", "밸브 보호캡을 제거한 채 보관", "밀폐된 고온 차량 안에 보관"],
    answer: 1,
    explanation: "냉매용기는 열원과 직사광선을 피하고 통풍되는 장소에서 넘어지지 않도록 세워 보관합니다.",
    theory: "../theory/#refrigerant-cylinder-safety"
  },
  {
    id: "S08",
    subject: "safety",
    topic: "암모니아 누설",
    question: "암모니아 냉동설비에서 누설이 의심될 때 가장 우선해야 할 조치는?",
    choices: ["보호구 없이 냄새가 강한 곳으로 접근", "인원을 대피시키고 환기·차단 절차를 시행", "불꽃으로 누설 위치 확인", "물을 뿌리며 압축기를 계속 운전"],
    answer: 1,
    explanation: "암모니아는 독성과 자극성이 있으므로 접근을 제한하고 적절한 보호구·환기·차단 절차를 따라야 합니다.",
    theory: "../theory/#ammonia-leak-response"
  },
  {
    id: "S09",
    subject: "safety",
    topic: "정비 안전",
    question: "회전기계 정비 전에 실시해야 할 조치로 가장 적절한 것은?",
    choices: ["운전 중 커버를 제거한다", "전원을 차단하고 잠금·표지 절차를 적용한다", "보호장치를 임시로 해제한다", "다른 작업자에게 알리지 않는다"],
    answer: 1,
    explanation: "정비 전에는 에너지원 차단 상태를 유지하도록 잠금·표지 절차를 적용해야 우발 기동을 막을 수 있습니다.",
    theory: "../theory/#lockout-tagout"
  },

  {
    id: "M01",
    subject: "maintenance",
    topic: "배관재료",
    question: "일반적인 저압의 물·증기·공기·가스 배관에 널리 사용되는 관은?",
    choices: ["배관용 탄소강관", "연관", "유리관", "목관"],
    answer: 0,
    explanation: "배관용 탄소강관은 강도와 시공성이 좋아 일반 설비배관에 폭넓게 사용됩니다.",
    theory: "../theory/#carbon-steel-pipe"
  },
  {
    id: "M02",
    subject: "maintenance",
    topic: "관이음",
    question: "관을 회전시키지 않고 배관 일부를 분리할 수 있게 하는 이음쇠는?",
    choices: ["소켓", "유니언", "부싱", "캡"],
    answer: 1,
    explanation: "유니언은 양쪽 관을 돌리지 않고 중앙 너트를 풀어 배관을 분리할 수 있습니다.",
    theory: "../theory/#union-fitting"
  },
  {
    id: "M03",
    subject: "maintenance",
    topic: "펌프 흡입배관",
    question: "수평 펌프 흡입관의 편심 레듀서는 일반적으로 어떻게 설치하는가?",
    choices: ["평평한 면을 위로", "평평한 면을 아래로", "반드시 수직으로", "방향과 무관하게"],
    answer: 0,
    explanation: "편심 레듀서의 평평한 면을 위로 두면 흡입관 상부에 공기주머니가 생기는 것을 줄일 수 있습니다.",
    theory: "../theory/#eccentric-reducer"
  },
  {
    id: "M04",
    subject: "maintenance",
    topic: "배관 지지장치",
    question: "배관의 축 방향과 횡 방향 이동을 모두 구속하는 지지장치는?",
    choices: ["가이드", "앵커", "롤러", "행거"],
    answer: 1,
    explanation: "앵커는 배관을 기준점에 고정하여 열팽창에 따른 이동 방향과 구간을 제어합니다.",
    theory: "../theory/#pipe-anchor"
  },
  {
    id: "M05",
    subject: "maintenance",
    topic: "배관 가이드",
    question: "축 방향 이동은 허용하면서 횡 방향 이동을 제한하는 장치는?",
    choices: ["가이드", "앵커", "체크밸브", "스트레이너"],
    answer: 0,
    explanation: "가이드는 배관이 열팽창 방향으로 움직이도록 유도하면서 측면 이탈을 억제합니다.",
    theory: "../theory/#pipe-guide"
  },
  {
    id: "M06",
    subject: "maintenance",
    topic: "밸브",
    question: "배관 내 유체의 역류를 방지하는 밸브는?",
    choices: ["게이트밸브", "글로브밸브", "체크밸브", "감압밸브"],
    answer: 2,
    explanation: "체크밸브는 정상 흐름은 허용하고 반대 방향 흐름은 자동으로 차단합니다.",
    theory: "../theory/#check-valve"
  },
  {
    id: "M07",
    subject: "maintenance",
    topic: "공기빼기",
    question: "밀폐식 냉·온수 배관의 자동 공기빼기밸브는 일반적으로 어디에 설치하는가?",
    choices: ["배관 최고점", "배관 최저점", "배수트랩 내부", "펌프 기초 아래"],
    answer: 0,
    explanation: "공기는 물보다 가벼워 배관의 높은 곳에 모이므로 공기빼기밸브를 최고점에 설치합니다.",
    theory: "../theory/#automatic-air-vent"
  },
  {
    id: "M08",
    subject: "maintenance",
    topic: "배수 트랩",
    question: "위생설비 배수관에 트랩을 설치하는 주된 목적은?",
    choices: ["급수압력을 높이기 위해", "봉수로 하수 가스와 악취 유입을 막기 위해", "배수관을 가열하기 위해", "배수량을 측정하기 위해"],
    answer: 1,
    explanation: "트랩에 유지되는 봉수는 하수관의 악취와 유해가스가 실내로 역류하는 것을 막습니다.",
    theory: "../theory/#drain-trap-seal"
  },
  {
    id: "M09",
    subject: "maintenance",
    topic: "열팽창 계산",
    question: "길이 30 m인 강관의 온도가 50℃ 상승하고 선팽창계수가 12×10⁻⁶/℃일 때 신장량은?",
    choices: ["1.8 mm", "6 mm", "18 mm", "180 mm"],
    answer: 2,
    explanation: "ΔL=αLΔT를 적용하면 12×10⁻⁶×30×50=0.018 m이므로 신장량은 18 mm입니다.",
    theory: "../theory/#pipe-thermal-expansion"
  }
];

window.HVAC_SUBJECTS = {
  all: { label: "전체 과목", short: "전체" },
  energy: { label: "1과목 에너지관리", short: "에너지관리" },
  design: { label: "2과목 공조냉동설계", short: "공조냉동설계" },
  safety: { label: "3과목 시운전 및 안전관리", short: "시운전·안전" },
  maintenance: { label: "4과목 유지보수 공사관리", short: "유지보수·공사" }
};
