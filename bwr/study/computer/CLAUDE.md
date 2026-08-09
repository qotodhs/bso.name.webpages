# BWR 컴퓨터활용능력 2급 학습 데이터 작업 규칙

`bso.name/bwr/study/computer`의 개념카드·예상문제·기출문제·오답 해설을 확장할 때 적용한다. HVAC의 해설 작성 원칙을 컴퓨터활용능력 2급 데이터 구조에 맞게 옮긴 규칙이다.

## 목표

학습 자료를 다음 흐름으로 연결한다.

1. **기출문제**에서 반복되는 판단 기준을 찾는다.
2. 그 기준을 **개념카드**의 지식·판별 기준·자주 틀리는 이유로 정리한다.
3. 문항별 **상세 오답 해설**을 작성할 때 `conceptId`로 개념카드에 연결한다.
4. 등록한 상세 해설은 한 문제씩 풀이, 오답노트, 개념카드에서 함께 사용한다.

개념카드는 단순 용어 암기장이 아니다. 실제 기출에서 반복된 표현과 함정을 일반화한 작은 이론 노트여야 한다.

## 디렉터리

```text
study/computer/
  past-questions.js              실제 기출 1,808문항
  predicted-questions.js         예상문제 24문항
  concepts/
    concept-data.js              개념 지식·기출 매칭 규칙
    app.js                       기출·상세 해설을 개념카드에 합치는 화면
  explanations/
    index.js                     상세 해설 파일 목록과 로더
    YYYYMMDD.js                  회차별 상세 오답 해설(추가 예정)
  flashcards/                    한 문제씩 풀이
  exams/                         모의고사
  wrongnote/                     오답과 개인 메모
```

## 정답 인덱스

문제의 `a`는 **0부터 센다**.

- `a: 0` = ①
- `a: 1` = ②
- `a: 2` = ③
- `a: 3` = ④

해설에서 “정답 2번”이라고 썼다면 데이터는 `a: 1`이어야 한다. 작성 후 반드시 대조한다.

## 개념카드 데이터 형식

`concepts/concept-data.js`에 아래 구조로 추가한다.

```js
{
  id: "ipv6",
  subject: "computer", // computer | spreadsheet
  term: "IPv6",
  definition: "핵심 지식 설명",
  criterion: "보기를 가르는 하나의 판별 기준",
  mistake: "응시자가 자주 틀리는 이유와 교정 방법",
  match: {
    any: ["IPv6"],       // 하나 이상 포함
    all: ["128비트"],    // 모두 포함(선택)
    exclude: ["제외어"]  // 제외(선택)
  }
}
```

### 개념카드 작성 원칙

- `definition`은 무엇인지 설명한다. 용어를 같은 말로 되풀이하지 않는다.
- `criterion`은 네 보기를 하나씩 외우게 하지 말고 **하나의 기준에서 갈리는 구조**로 쓴다.
- `mistake`는 틀린 선택을 비난하지 말고, 어떤 단서 때문에 잘못 판단하는지와 다음에 볼 기준을 적는다.
- 기출에 없는 지식만으로 카드를 만들지 않는다. 먼저 실제 기출 전체에서 관련 문항을 검색한다.
- 같은 기준으로 풀리는 문항은 하나의 카드에 묶고, 기준이 다르면 용어가 비슷해도 카드를 나눈다.
- `match`는 문제·보기·기본 해설 전체에 적용된다. 너무 넓은 단어는 `all`이나 `exclude`를 함께 사용해 오탐을 줄인다.
- 새 카드의 `id`는 영문 소문자와 하이픈으로 만들고 한 번 정하면 바꾸지 않는다. 상세 해설이 이 값을 참조한다.

## 상세 오답 해설 데이터 형식

상세 해설은 `explanations/YYYYMMDD.js`에 회차별로 작성한다.

```js
window.addBWRExplanations({
  "past-20200704-03": {
    conceptId: "ransomware",
    explanation: "200~300자의 상세 해설. 정답 근거와 각 오답이 아닌 이유를 설명한다.",
    criterion: "이 문항에서 가장 먼저 확인할 판별 기준",
    trap: "실제로 오답을 고르게 만드는 표현이나 착각",
    reviewedAt: "2026-08-09"
  }
});
```

파일을 만든 뒤 `explanations/index.js`의 `BWR_EXPLANATION_FILES`에 파일명을 등록한다.

```js
window.BWR_EXPLANATION_FILES = [
  "20200704.js",
  "20190302.js"
];
```

등록된 해설은 자동으로 다음 위치에 연결된다.

- 한 문제씩 풀이: 기본 정답 문구 대신 상세 해설 표시
- 오답노트: 상세 해설과 개인 메모를 함께 표시
- 개념카드: 같은 `conceptId`의 해설 수와 반복 함정 표시

## 해설 작성 규칙

- 본문은 **200~300자**를 기본으로 한다. 길어지는 이론은 개념카드로 일반화하고 해설은 해당 판별 기준에 집중한다.
- **보기 4개를 모두 판단한다.** 정답 근거뿐 아니라 나머지 보기가 어느 개념에 해당하는지 또는 왜 조건에 맞지 않는지 설명한다.
- 단순 숫자 차이처럼 같은 계산을 반복하는 보기는 묶어서 설명할 수 있다.
- 첫 문장에 판별 기준을 둔다. “이 문제는 무엇과 무엇을 구분하는가”가 먼저 보여야 한다.
- `trap`에는 오답 번호만 쓰지 말고 오답을 선택하게 만드는 생각의 경로를 적는다.
- 오래된 Windows·Excel 문항은 출제 당시 기준과 현재 환경을 구분한다. 정답을 임의로 현대 기준으로 바꾸지 않는다.
- 계산·함수 문항은 인수 순서, 절대 참조, 문자열 결합처럼 실제로 틀리는 지점을 명시한다.
- 문제 원문에 그림이 필요한데 이미지가 없는 문항은 추론해 해설하지 않는다. 현재 문제은행에서 제외된 이미지 의존 문항과 섞지 않는다.
- 외부 자료를 사용하면 공식 문서나 시험 공식 안내를 우선하고, 해설 문장에는 출처의 문장을 그대로 길게 복사하지 않는다.

## 문항 하나의 해설을 만들 때

1. `past-questions.js`에서 같은 용어와 같은 판별 기준의 문항을 전수 검색한다.
2. 같은 주제가 여러 회차에 나오면 관련 문항을 함께 검토한다.
3. 정답 인덱스와 네 보기를 원문과 대조한다.
4. 대응하는 `conceptId`가 있는지 확인한다.
5. 개념이 없으면 상세 해설보다 `concept-data.js`의 새 개념카드를 먼저 만든다.
6. 각 문항 표현에 맞춰 해설을 작성한다. 관련 문항끼리도 해설을 그대로 복사하지 않는다.
7. 회차 파일을 `explanations/index.js`에 등록한다.
8. 아래 검증을 실행한 뒤 커밋한다.

## 사용자 개인 메모와 작성된 해설의 구분

- `explanations/`의 상세 해설은 사이트에 배포되는 공용 학습 자료다.
- 사용자가 화면에서 입력하는 “내 해설·오답 원인”은 브라우저 `localStorage`에만 저장된다.
- 개인 메모를 자동으로 공용 상세 해설에 합치지 않는다.
- 개인 메모에서 반복되는 오답 원인을 공용 자료로 반영할 때는 사실 검토 후 `trap` 또는 개념카드의 `mistake`로 다시 작성한다.

## 검증

커밋 전 다음을 확인한다.

- 개념 `id` 중복 0건
- 문제 `id` 중복 0건
- 모든 상세 해설의 `questionId`가 실제 문제은행에 존재
- 모든 상세 해설의 `conceptId`가 개념카드에 존재
- 정답 인덱스가 0~3이고 보기 개수가 4개
- 해설 속 정답 번호와 문제 데이터의 정답 인덱스 일치
- 개념 매칭 결과가 0문항이거나 지나치게 넓지 않은지 검토
- 새 상세 해설이 개념카드·한 문제씩 풀이·오답노트에 모두 연결되는지 확인

간단한 로더 검증 예시:

```bash
node -e "
const fs=require('fs'),vm=require('vm');
const w={}; const c={window:w,document:{currentScript:{src:'https://example.test/explanations/index.js'},head:{append(){}}},URL,Promise,console};
vm.runInNewContext(fs.readFileSync('past-questions.js','utf8'),c);
vm.runInNewContext(fs.readFileSync('predicted-questions.js','utf8'),c);
vm.runInNewContext(fs.readFileSync('concepts/concept-data.js','utf8'),c);
const questions=[...w.BWR_PREDICTED_QUESTIONS,...w.BWR_PAST_QUESTIONS];
const ids=new Set(questions.map(q=>q.id)), concepts=new Set(w.BWR_CONCEPTS.map(x=>x.id));
if(ids.size!==questions.length) throw Error('문제 ID 중복');
if(concepts.size!==w.BWR_CONCEPTS.length) throw Error('개념 ID 중복');
for(const q of questions) if(q.c.length!==4||q.a<0||q.a>3) throw Error(q.id);
console.log({questions:questions.length,concepts:concepts.size});
"
```

## 커밋 원칙

- 작업한 파일만 경로를 지정해 스테이징한다.
- 문제 데이터 수정과 그 해설은 가능하면 같은 커밋에 넣는다.
- 다른 작업자의 미커밋 변경이 섞였는지 먼저 확인한다.
- 개념 매칭 규칙을 바꿨다면 기존 24개 카드의 연결 문항 수도 함께 검증한다.
