# bso.name — 작업 지침

GitHub Pages 정적 사이트. `main` 에 병합되면 자동 배포된다.

현재 진행 중인 일은 **공조냉동기계기사 기출문제 해설 작성**이다. 아래는 그 작업의 규칙이다.

## 디렉터리

```
study/HVAC/
  engicert/            문제은행 (풀이 화면)
    questions.js       로더. 해설·안내문을 문제에 붙인다
    question-data/history/YYYYMMDD.js   기출 51회차, 5,060문항
    question-images/history/YYYYMMDD/   원본 스캔 이미지
    explanations/
      index.js         작성한 회차 파일 목록. 새 파일은 여기 등록
      source-notes.js  원문 자료가 유실된 문항 안내문
      source-incomplete.js  그 문항들의 해설 (회차 파일보다 먼저 로드)
      YYYYMMDD.js      회차별 해설
  theory/              이론 노트
    theory-data/0{1..4}-*.js   4과목 49챕터
```

## 문제 데이터 형식

`[id, subject, subjectLabel, question, choices[4], answerIndex, images[], choiceImages[4]?]`

`choiceImages` 는 **보기가 그림인 문항에만** 붙이는 선택 항목이다. 없으면 지금까지처럼 `choices` 문구를 렌더링하므로 기존 행은 그대로 둬도 된다. 붙일 때도 `choices` 에는 그림을 말로 옮긴 문구를 남긴다 — `img` 의 `alt` 와 정답 피드백·결과 리뷰에서 그 문구를 쓴다. 보기가 그림뿐인 문항이 아직 370건 남아 있다.

`answerIndex` 는 **0부터** 센다. `answer: 2` 는 ③이다. 이걸 "2번"으로 읽어 정답을 잘못 판단한 적이 있다.

## 해설 작성 규칙

- **200~300자.** 넘으면 개념은 이론으로 빼고 해설에서는 그 단원을 가리킨다.
- **보기 4개를 모두 짚는다.** 정답 근거 + 나머지 셋이 각각 왜 아닌지. 단, 오답이 그냥 다른 숫자인 계산·법령 문항은 예외.
- **계산 문항은 함정을 명시한다.** "√3을 빠뜨리면 659가 나와 ④에 걸린다" 식으로.
- **판별 기준을 앞세운다.** 네 개를 따로 외우게 하지 말고, 하나의 기준에서 갈리는 것으로 묶는다.
- 수식은 `$...$` 안에 LaTeX. engicert·theory 모두 KaTeX가 붙어 있어 문제·보기·해설 전부 렌더링된다.
- `\ohm` 은 KaTeX에 없다. `\Omega` 를 쓴다.
- `\,^\circ` 는 KaTeX 파싱 오류다(`\,` 에 위첨자가 붙는다). `\,{}^\circ\mathrm{C}` 로 쓴다.

## 문항 하나를 받으면

1. **관련 문항을 먼저 전수 검색한다.** 같은 내용이 여러 회차에 반복 출제된다(피드백 효과 13건, 속도제어 14건, 전구 직렬 4건). 찾아서 **한꺼번에** 작성한다. 함정이 회차마다 다르므로 복붙하지 말고 각 문항 표현에 맞춰 쓴다.
2. 그림 문항은 **반드시 원본 이미지를 읽는다.** `Read` 로 열린다. 추론하지 말 것.
3. 이론에 해당 내용이 있는지 확인하고, 없으면 **이론에 먼저 넣는다.**

## 데이터 결함 — 자주 나오는 네 가지

**정답 노출 이미지** — 보기와 정답(●)이 찍힌 이미지가 붙어 있다. `dwebp -crop x y w h` 로 잘라낸다. 회로도와 보기가 한 장에 있으면 지우지 말고 크롭.

**첨자 유실** — `저항 R 과 R 의 값? 1 5` 는 `R₁과 R₅`다. 흩어진 숫자를 순서대로 되붙인다. 문제 102건·보기 118건에 남아 있다. **일괄 정규식 금지** — 문장마다 판단이 필요하다.

**정답 오류** — `임의 정답 1번으로 설정하였습니다` 같은 주석이 붙은 문항이 있다. 다른 회차의 동일 문제를 찾으면 대개 해결된다.

**빈 이미지** — 25장 제거 완료. 추가 발견 시 `find ... -size -120c`.

## 데이터 편집 시 주의

문자열 치환으로 문제 데이터를 고칠 때 **배열 경계를 삼키기 쉽다.** `","` 로 split 했다가 보기 배열의 여는 `["20` 을 날린 적이 있다. 반드시 고유한 전체 문자열로 치환하고, 치환 후 구조를 검증한다.

## 검증 (커밋 전 필수)

브라우저는 `explanations/index.js` 를 **집요하게 캐시한다.** 화면 확인이 안 되면 Node로 로더를 시뮬레이션하는 쪽이 확실하다.

```bash
# 로더 재현 + 해설 적용 수 + 정답 번호 불일치
cd study/HVAC/engicert && node -e "
const fs=require('fs');
global.window={HVAC_QUESTION_BANK:[],HVAC_EXPLANATIONS:{},HVAC_SOURCE_NOTES:{}};
window.addHVACExplanations=(r)=>Object.assign(window.HVAC_EXPLANATIONS,r);
window.addHVACSourceNotes=(r)=>Object.assign(window.HVAC_SOURCE_NOTES,r);
const idx=fs.readFileSync('explanations/index.js','utf8');
[...idx.matchAll(/\"([0-9a-z-]+\.js)\"/g)].map(m=>m[1]).forEach(f=>eval(fs.readFileSync('explanations/'+f,'utf8')));
const exp=window.HVAC_EXPLANATIONS, marks=['①','②','③','④']; let bad=[];
window.addHVACExamQuestions=(e,rows)=>rows.forEach(r=>{
  const x=exp[r[0]]; if(!x) return;
  const m=[...x.matchAll(/([①②③④])\s*(?:이|가)?\s*(?:정답|옳)|정답은?\s*([①②③④])/g)];
  const c=new Set(); m.forEach(g=>{const v=g[1]||g[2]; if(v) c.add(marks.indexOf(v));});
  if(c.size && !c.has(r[5])) bad.push(r[0]);
});
const p='question-data/history/';
fs.readdirSync(p).filter(f=>f.endsWith('.js')&&f!=='index.js').forEach(f=>eval(fs.readFileSync(p+f,'utf8')));
console.log('해설:', Object.keys(exp).length, '| 정답 불일치:', bad);
"
```

`틀린 것은?` 유형에서 "①은 옳다"를 정규식이 오탐한다. 알려진 오탐 3건: `HVAC-20120826-070`, `HVAC-20220424-013`, `HVAC-20090726-079`(해설 본문의 "기존 임의 정답 ①" 이라는 표현에 걸린다).

수식 전수 컴파일 때도 오탐이 하나 있다. `\begin{cases}` 안의 `\\` 는 행 구분자라 정상이므로, 이스케이프 오류를 찾는 검사에서 `\begin{` 이 있는 식은 건너뛴다.

이 밖에:
- 계산 문항은 **Node로 독립 검산**해 기록된 정답과 대조
- 수식은 브라우저에서 `katex.renderToString(expr, {throwOnError:true})` 전수 컴파일
- 문제 데이터를 건드렸으면 5,060행 구조 검증(보기 4개·정답 인덱스·이미지 배열)과 깨진 이미지 참조 0건 확인

## 커밋

브랜치 `agent/<주제>` → 검증 → PR → 병합. `git add` 는 **디렉터리째 담지 말고** 건드린 파일만. 사용자의 미커밋 작업이 섞여 들어간 적이 있다.

## 과목 매핑 (2025년 출제기준)

시험이 5과목에서 4과목으로 바뀌었다. 옛 회차의 `subjectLabel` 은
그대로 두고 `subject` 코드만 새 과목에 맞춘다.

| 코드 | 새 과목 | 옛 과목 |
|---|---|---|
| `energy` | 1과목 에너지관리 | 3과목 공기조화 (+ TAB) |
| `design` | 2과목 공조냉동설계 | 1과목 기계열역학 + 2과목 냉동공학 |
| `safety` | 3과목 시운전 및 안전관리 | 4과목 전기제어공학 (+ 관련법규·안전관리) |
| `maintenance` | 4과목 유지보수 공사관리 | 5과목 배관일반 (+ 오버홀·수질관리·덕트·도면) |

문항별로 엄밀히 나누지 않고 옛 과목 단위로 크게 잡는다. 현재
design 2000 / 나머지 각 1020 문항이다. 심화 문제의 `ncs` 는
그대로 두되, 모의고사는 `EXAM_SUBJECT_KEYS` 가 네 과목만 쓰므로
자동으로 제외된다.

## 진행 상황 (2026-08-09)

- 이론 49챕터 — 4과목 전부 작성 완료
- 해설 **560 / 5,060**
- 회차 완료: 2022-04-24, 2022-03-05, 2021-08-14 (각 80·80·100문항)
- 나머지는 사용자가 보내는 문항 + 관련 문항 단위로 진행 중
- 회차 전체를 채울 때의 우선순위는 **최신순**

남아 있는 데이터 결함 두 가지:

- **`임의 정답` 주석 70건.** 다른 회차의 쌍둥이 문항과 대조하면
  가려낼 수 있다. 지금까지 4건을 처리했는데 기록된 인덱스가
  이미 맞았던 경우(20090726-076)와 실제로 틀렸던 경우
  (20090726-060, 20090726-052)가 반반이었다. 계산으로 검산이
  되는 문항이면 그쪽이 더 확실하다.
- **보기가 이미지뿐인 문항 358건.** `choiceImages` 로 처리한다.

## 여러 세션이 동시에 작업할 때

같은 회차 파일에 두 세션이 각각 해설을 추가하면 `git add <파일>` 이
상대의 미커밋 작업까지 통째로 삼킨다. 이 환경에서는 `git add -p` 를
쓸 수 없으므로, 커밋 전에 파일이 섞였는지부터 확인한다.

```bash
# 해설 파일: 이번에 추가된 ID 중 HEAD 에 없는 것 = 다른 세션의 작업
git diff explanations/YYYYMMDD.js | grep '^+  "HVAC' | grep -o 'HVAC-[0-9-]*'

# 문제 데이터(한 줄 파일): 어느 문항의 행이 바뀌었는지 행 단위로 대조
git show HEAD:<경로> > /tmp/head.js
node -e "…두 파일을 eval 해 행별 JSON 비교…"
```

섞였으면 그 파일은 두고 순수한 파일만 커밋한다. 단, **이미지 삭제와
그 참조를 지우는 데이터 수정은 반드시 함께 커밋한다.** 한쪽만 올리면
깨진 이미지 참조가 배포된다. 데이터를 못 담는 상황이면 이미지 삭제도
되돌려 짝을 맞춰 둔다.

작업을 시작하기 전에 대상 문항의 해설·이미지가 이미 처리되었는지
확인한다. 다른 세션이 먼저 끝내 둔 것을 다시 작업한 적이 있다.
