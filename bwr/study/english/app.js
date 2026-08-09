const words = [
  {id:"apple",word:"apple",ko:"사과",emoji:"🍎"},{id:"book",word:"book",ko:"책",emoji:"📘"},{id:"cat",word:"cat",ko:"고양이",emoji:"🐱"},{id:"dog",word:"dog",ko:"강아지",emoji:"🐶"},
  {id:"sun",word:"sun",ko:"해",emoji:"☀️"},{id:"moon",word:"moon",ko:"달",emoji:"🌙"},{id:"school",word:"school",ko:"학교",emoji:"🏫"},{id:"friend",word:"friend",ko:"친구",emoji:"🧑‍🤝‍🧑"},
  {id:"water",word:"water",ko:"물",emoji:"💧"},{id:"family",word:"family",ko:"가족",emoji:"👨‍👩‍👧"},{id:"happy",word:"happy",ko:"행복한",emoji:"😊"},{id:"play",word:"play",ko:"놀다",emoji:"⚽"}
];
const sentences = [
  ["I have a book.","나는 책을 가지고 있어요."],["This is my friend.","이 사람은 내 친구예요."],["The sun is yellow.","해는 노란색이에요."],["I am happy.","나는 행복해요."]
];
const knownKey="bwr-english-known-v1";
let known=new Set(JSON.parse(localStorage.getItem(knownKey)||"[]"));
const grid=document.getElementById("wordGrid");

function renderWords(){ grid.replaceChildren(); words.forEach((item,index)=>{ const button=document.createElement("button"); button.className="word-card"; button.type="button"; button.setAttribute("aria-pressed",String(known.has(item.id))); if(known.has(item.id)) button.classList.add("learned"); button.innerHTML=`<span class="word-index">${String(index+1).padStart(2,"0")}</span><strong>${item.word}</strong><span>${item.ko}${known.has(item.id)?" · 학습 완료":""}</span>`; button.addEventListener("click",()=>{known.has(item.id)?known.delete(item.id):known.add(item.id); localStorage.setItem(knownKey,JSON.stringify([...known])); renderWords();}); grid.append(button); }); }

sentences.forEach(([en,ko])=>{const button=document.createElement("button"); button.type="button"; button.textContent=en; button.addEventListener("click",()=>{button.classList.toggle("revealed"); button.textContent=button.classList.contains("revealed")?`${en} — ${ko}`:en;}); document.getElementById("sentenceList").append(button);});

let quizIndex=0;
function renderQuiz(){const answer=words[quizIndex%words.length]; document.getElementById("englishQuestion").textContent=`‘${answer.ko}’를 영어로 고르세요.`; const choices=[answer,...words.filter(x=>x.id!==answer.id).sort(()=>Math.random()-.5).slice(0,2)].sort(()=>Math.random()-.5); const options=document.getElementById("englishOptions"); options.replaceChildren(); document.getElementById("englishFeedback").textContent=""; choices.forEach((item)=>{const button=document.createElement("button"); button.type="button"; button.textContent=item.word; button.addEventListener("click",()=>{if(item.id===answer.id){document.getElementById("englishFeedback").textContent=`정답입니다. ${answer.word} = ${answer.ko}`; quizIndex+=1; setTimeout(renderQuiz,900);}else{document.getElementById("englishFeedback").textContent="다시 생각해 보세요.";}}); options.append(button);});}
renderWords(); renderQuiz();
