// Run with Node.js and the playwright package installed (Chrome required).
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const output=fs.mkdtempSync(path.join(require('os').tmpdir(),'computer-mock-review-')); 
const bank={};vm.runInNewContext(fs.readFileSync(path.join(root,'bwr/study/computer/past-questions.js'),'utf8'),{window:bank});
const fixtureIds=['past-20200704-02','past-20200704-04','past-20200704-22','past-20200704-24'];
const fixture=fixtureIds.map(id=>bank.BWR_PAST_QUESTIONS.find(q=>q.id===id));
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.route('**/past-questions.js',r=>r.fulfill({contentType:'application/javascript',body:'window.BWR_PAST_QUESTIONS='+JSON.stringify(fixture)}));
    await page.route('**/predicted-questions.js',r=>r.fulfill({contentType:'application/javascript',body:'window.BWR_PREDICTED_QUESTIONS=[]'}));
    const url=`http://127.0.0.1:${server.address().port}/bwr/study/computer/exams/`;
    await page.goto(url);await page.evaluate(()=>window.BWR_EXPLANATION_READY);
    await page.evaluate(()=>localStorage.setItem('bwr-computer-wrong-v1',JSON.stringify(['past-20010318-06'])));
    await page.locator('#startMock').click();
    // Correct, wrong and unanswered outcomes, independent of shuffled order.
    for(let i=0;i<4;i++){
      const title=await page.locator('#questionTitle').textContent();const q=fixture.find(q=>q.q===title);
      if(i!==2)await page.locator('#answers button').nth(i===1?(q.a+1)%4:q.a).click();
      await page.locator('#nextQuestion').click();
    }
    assert.equal(await page.locator('#resultScore').textContent(),'2 / 4');
    assert.equal(await page.locator('#reviewList details').count(),2);
    assert((await page.locator('#reviewSummary').textContent()).includes('미응답 1'));
    assert.equal(await page.locator('#reviewList .review-chosen').count(),1);
    assert.equal(await page.locator('#reviewList .review-correct').count(),2);
    assert((await page.locator('#reviewList').textContent()).includes('상세 해설'));
    await page.locator('#reviewFilter').selectOption('unanswered');assert.equal(await page.locator('#reviewList details').count(),1);
    await page.locator('#reviewFilter').selectOption('all');assert.equal(await page.locator('#reviewList details').count(),4);
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
    await page.reload();await page.locator('#restoreMock').click();
    assert.equal(await page.locator('#resultScore').textContent(),'2 / 4');
    assert.equal(await page.locator('#reviewList details').count(),2);
    await page.locator('#retryWrong').click();
    for(let i=0;i<2;i++){
      const title=await page.locator('#questionTitle').textContent();
      await page.locator('#answers button').nth(fixture.find(q=>q.q===title).a).click();
      await page.locator('#nextQuestion').click();
    }
    assert.equal(await page.locator('#resultScore').textContent(),'2 / 2');
    assert(await page.locator('#retryWrong').isDisabled());
    assert.equal(await page.locator('#reviewFilter').inputValue(),'all');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bwr-computer-wrong-v1'))),['past-20010318-06']);
    await page.locator('#changeMock').click();await page.locator('#startMock').click();await page.locator('#finishMock').click();
    assert.equal(await page.locator('#resultScore').textContent(),'0 / 4');assert.equal(await page.locator('#reviewList details').count(),4);
    // Storage failure cannot prevent grading or inspection.
    await page.locator('#changeMock').click();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};});
    await page.locator('#startMock').click();await page.locator('#finishMock').click();
    assert((await page.locator('#resultStorageStatus').textContent()).includes('저장이 제한'));
    assert.equal(await page.locator('#reviewList details').count(),4);
    await page.reload();await page.evaluate(()=>localStorage.setItem('bwr-computer-last-mock-v1','{bad json'));await page.reload();
    assert(await page.locator('#restoreMock').isHidden());
    await page.clock.install();await page.locator('#startMock').click();await page.clock.runFor(241000);
    assert(await page.locator('#resultPanel').isVisible());assert.equal(await page.locator('#reviewList details').count(),4);
    assert.deepEqual(errors,[]);
    console.log('PASS: mixed answers, filters, detailed explanations, refresh restore, wrong-only retry, all correct, all unanswered, storage failure, corrupt storage, timer expiry, mobile overflow.');
    console.log('Screenshots:',output);
    await context.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
