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

`[id, subject, subjectLabel, question, choices[4], answerIndex, images[]]`

`answerIndex` 는 **0부터** 센다. `answer: 2` 는 ③이다. 이걸 "2번"으로 읽어 정답을 잘못 판단한 적이 있다.

## 해설 작성 규칙

- **200~300자.** 넘으면 개념은 이론으로 빼고 해설에서는 그 단원을 가리킨다.
- **보기 4개를 모두 짚는다.** 정답 근거 + 나머지 셋이 각각 왜 아닌지. 단, 오답이 그냥 다른 숫자인 계산·법령 문항은 예외.
- **계산 문항은 함정을 명시한다.** "√3을 빠뜨리면 659가 나와 ④에 걸린다" 식으로.
- **판별 기준을 앞세운다.** 네 개를 따로 외우게 하지 말고, 하나의 기준에서 갈리는 것으로 묶는다.
- 수식은 `$...$` 안에 LaTeX. engicert·theory 모두 KaTeX가 붙어 있어 문제·보기·해설 전부 렌더링된다.
- `\ohm` 은 KaTeX에 없다. `\Omega` 를 쓴다.

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

`틀린 것은?` 유형에서 "①은 옳다"를 정규식이 오탐한다. 알려진 오탐 2건: `HVAC-20120826-070`, `HVAC-20220424-013`.

이 밖에:
- 계산 문항은 **Node로 독립 검산**해 기록된 정답과 대조
- 수식은 브라우저에서 `katex.renderToString(expr, {throwOnError:true})` 전수 컴파일
- 문제 데이터를 건드렸으면 5,060행 구조 검증(보기 4개·정답 인덱스·이미지 배열)과 깨진 이미지 참조 0건 확인

## 커밋

브랜치 `agent/<주제>` → 검증 → PR → 병합. `git add` 는 **디렉터리째 담지 말고** 건드린 파일만. 사용자의 미커밋 작업이 섞여 들어간 적이 있다.

## 진행 상황 (2026-08-06)

- 이론 49챕터 / 161섹션 — 4과목 전부 작성 완료
- 해설 **329 / 5,060**
- 회차 완료: 2022-04-24, 2022-03-05, 2021-08-14 (각 80·80·100문항)
- 나머지는 사용자가 보내는 문항 + 관련 문항 단위로 진행 중
- 회차 전체를 채울 때의 우선순위는 **최신순**
