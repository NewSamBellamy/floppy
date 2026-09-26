const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const {choices,fillProductChoices}=require('./product-journey-helpers.cjs');
const original='An offline PDF reader for researchers, with handwritten margin annotations that remain attached to the page. No chatbot, no cloud account. The first version must preserve handwriting after closing and reopening a paper.';
async function main(){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.setDefaultTimeout(5000);
 const errors=[],requests=[],reports=[];let release=null,gate=null,failDirections=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Margin'));
 await page.route('https://generativelanguage.googleapis.com/**',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{models:[{name:'mock'}]}});
  const body=route.request().postDataJSON(),prompt=body.contents[0].parts[0].text;requests.push(prompt);
  let result;
  if(prompt.includes('RAW IDEA:'))result={workingIdea:'Margin keeps a researcher’s handwritten thoughts beside the PDF, entirely offline.',needsClarification:false,followUp:''};
  else if(prompt.startsWith('Suggest product directions')){
   assert.ok(prompt.includes(original));
   if(gate)await gate;
   if(failDirections)return route.fulfill({status:503,json:{error:{message:'temporary'}}});
   const fields=body.generationConfig.responseSchema.properties.directions.items.properties.fields.properties;
   const index='outcome'in fields?6:'actor'in fields?7:'core'in fields?8:'name'in fields?9:10;
   result={directions:[{label:'A restrained first direction',fields:{...choices.Margin[index]},openQuestions:['Will this preserve the way researchers think by hand?'],sourceIds:[]}]};
  }else if(prompt.startsWith('Create a rigorous')){
   assert.match(prompt,/Do not presuppose/);
   result={objective:'Test whether handwritten annotations help a researcher resume a thought.',investigationQuestions:['What do researchers write today?','When do they lose a thought?','Do typed notes work as well?','When is offline access important?','What would make them prefer paper?'],evidenceToSeek:['Observed reading sessions'],deliverables:['Supported findings and counterexamples'],falsificationQuestions:['When are handwritten notes unnecessary?']};
  }else if(prompt.startsWith('Synthesize only')){
   result={proposedValue:'The returned reading session supports keeping handwritten notes next to their page, but not a cloud account.',strongestEvidence:['A researcher resumed a thought from a margin note.'],contradictions:[],affectedPeople:['Researchers'],alternatives:['Paper'],unresolvedQuestions:['Will notes remain legible over time?'],sourceIds:[]};
  }else{
   const chapter=JSON.parse(prompt.split('\n').find(line=>line.startsWith('CHAPTER: ')).slice(9)).name;
   const candidates={Problem:'Researchers lose the context of their thoughts when notes are separated from the paper.',Audience:'Researchers reading long papers offline and thinking through handwritten annotations.',Alternatives:'Paper printouts and separate notebooks preserve handwriting, but can separate notes from the source.',Evidence:'One reading session suggests margin notes help recover a thought. Wider demand is not established.',Assumptions:'Researchers must be able to find and understand handwriting after reopening a paper.'};
   result={candidate:candidates[chapter],openQuestions:['How often does this interrupt reading?'],sourceIds:[]};
  }
  return route.fulfill({json:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]}});
 });
 async function capture(name){
  for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>document.querySelector('.workspace-main').scrollTo(0,0));
   const metrics=await page.evaluate(()=>{const main=document.querySelector('.workspace-main'),button=document.querySelector('#actionPanel .chapter-actions .primary'),r=button?.getBoundingClientRect();return{width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,workspaceScroll:main.scrollHeight-main.clientHeight,action:r?{top:r.top,bottom:r.bottom}:null};});
   await page.screenshot({path:path.join(os.tmpdir(),`floppy-founder-${name}-${width}x${height}.png`)});
   assert.equal(metrics.pageWidth,width);assert.equal(metrics.pageHeight,height);
   if(width>=1280){assert.ok(metrics.workspaceScroll<=1,`${name} ${width}: workspace overflow ${metrics.workspaceScroll}`);assert.ok(!metrics.action||metrics.action.bottom<=height,`${name}: action clipped`);}
   reports.push({name,...metrics});
  }
  await page.setViewportSize({width:1366,height:768});
 }
 try{
  await page.goto(process.env.FLOPPY_URL||'http://127.0.0.1:8766/index.html');
  await page.locator('#newProject').click();await page.locator('#newContext').fill(original);
  await page.locator('.optional-title summary').click();await page.locator('#newName').fill('Margin');await page.locator('#createIdea').click();
  await page.locator('#settingsButton').click();await page.locator('#settingsKey').fill('founder_mock_key_123456');await page.locator('#saveSettings').click();await page.locator('#geminiConnected').waitFor({state:'visible'});await page.locator('#settingsDialog .dialog-top button').click();
  await page.locator('#continueIdea').click();await page.locator('#confirmWorkingIdea').click();
  assert.equal((await saved()).chapterIntelligence[0].confirmation?.origin,'human-confirmed');
  for(let i=1;i<=5;i++){await page.waitForFunction(index=>document.body.dataset.activeChapter===String(index)&&document.querySelector('#chapterAnswer')?.value.length>12,i);await page.locator('#resolveChapter').click();}
  await page.locator('[data-shape-field="outcome"]').waitFor();
  assert.equal(requests.filter(prompt=>prompt.startsWith('Suggest product directions')).length,0,'Entering product chapters must not auto-decide the product');
  const before=await saved();
  await page.locator('#resolveChapter').click();assert.match(await page.locator('#shapeStatus').textContent(),/Complete/);
  gate=new Promise(resolve=>release=resolve);await page.locator('#suggestDirections').click();await page.locator('#cancelDirections').waitFor();
  assert.match(await page.locator('.brief-loading').textContent(),/Exploring possibilities/);
  release();gate=null;await page.locator('.direction-options').waitFor();
  assert.equal((await saved()).chapterIntelligence[6].productDraft.fields.essential,'');
  await page.locator('.direction-options summary').click();await page.locator('[data-direction="0"]').click();
  await page.locator('.product-detail-dialog .dialog-top button').click();
  assert.equal((await saved()).resolved[6],undefined);
  await page.locator('[data-direction="0"]').click();await page.locator('#applyProductDirection').click();
  await page.locator('[data-shape-field="essential"]').click();
  const edited='Open local PDFs and preserve handwritten margin notes on their page after reopening. No cloud dependency.';
  await page.locator('#shapeFieldInput').fill(edited);
  await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='floppy-projects-v3')throw new DOMException('Quota','QuotaExceededError');return window.savedSetItem.call(this,k,v);};});
  await page.locator('#saveShapeField').click();assert.match(await page.locator('#shapeFieldStatus').textContent(),/Not saved/);assert.equal(await page.locator('#shapeFieldInput').inputValue(),edited);
  await page.evaluate(()=>{Storage.prototype.setItem=window.savedSetItem;});await page.locator('#saveShapeField').click();
  assert.equal((await saved()).idea.rawIdea,before.idea.rawIdea);
  await capture('first-product-draft');await page.locator('#resolveChapter').click();
  assert.match((await saved()).chapterIntelligence[6].confirmation.shape.fields.essential,/No cloud dependency/);
  for(let i=7;i<=10;i++){
   await page.locator('#resolveChapter').waitFor();
   await fillProductChoices(page,i,'Margin');await capture(`chapter-${i}`);
   if(i===9){
    assert.equal((await saved()).name,'Margin');await page.locator('#suggestDirections').click();await page.locator('.direction-options').waitFor();assert.equal((await saved()).resolved[9],undefined);
    const unchanged=JSON.stringify((await saved()).chapterIntelligence[9].productDraft);
    gate=new Promise(resolve=>release=resolve);
    const pendingResponse=page.waitForResponse(response=>response.request().postData()?.includes('Suggest product directions'));
    await page.locator('#suggestDirections').click();await page.locator('#cancelDirections').click();release();gate=null;
    await (await pendingResponse).finished();
    assert.equal(JSON.stringify((await saved()).chapterIntelligence[9].productDraft),unchanged,'Canceled late response must not alter the founder draft');
    failDirections=true;await page.locator('#suggestDirections').click();
    await page.getByRole('alert').filter({hasText:'temporarily unavailable'}).waitFor();
    assert.equal(JSON.stringify((await saved()).chapterIntelligence[9].productDraft),unchanged,'Failed suggestions must not alter the founder draft');
    failDirections=false;
   }
   if(i===10){
    await page.locator('#investigateChapter').click();await page.locator('#copyWorkBrief').waitFor();
    await page.locator('#addResearch').click();await page.locator('#contextText').fill('Observed reading session: one researcher recovered a thought using a margin note.');await page.locator('#contextForm button[type=submit]').click();
    await page.locator('#analyzeReturnedWork').click();await page.locator('#shapeResearch').waitFor();
    await page.locator('#shapeResearch').click();assert.match(await page.locator('.product-detail-dialog').textContent(),/not a cloud account/);await page.locator('.product-detail-dialog .dialog-top button').click();
    assert.equal((await saved()).chapterIntelligence[10].productDraft.fields.feeling,choices.Margin[10].feeling,'Research must not overwrite founder choices');
   }
   await page.locator('#resolveChapter').click();
  }
  assert.equal(await page.locator('#suggestDirections').count(),0,'Brief is derived, not generated');
  for(let tab=0;tab<4;tab++){await page.locator(`[data-brief-tab="${tab}"]`).click();await capture(`brief-${tab}`);}
  await page.locator('#copyIdeaBrief').click();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/handwritten margin notes/);assert.match(copied,/No cloud dependency/);assert.match(copied,/Original founder notes/);
  await page.locator('#resolveChapter').click();await fillProductChoices(page,12,'Margin');await capture('readiness');
  assert.match(await page.locator('.readiness-overview').textContent(),/Known.*Uncertain.*Risky.*Deferred/s);
  assert.equal((await saved()).stage,0);await page.locator('#resolveChapter').click();await capture('readiness-confirmed');
  await page.locator('#beginPrototype').click();assert.equal((await saved()).stage,1);
  await page.reload();await page.locator('#continueProject').click();await page.locator('#returnIdea').click();
  for(let i=6;i<=12;i++){await page.locator(`[data-chapter="${i}"]`).click();assert.equal(await page.locator('#chapterAnswer').count(),0);await capture(`confirmed-${i}`);}
  await page.locator('[data-chapter="7"]').click();await page.locator('#reopenChapter').click();
  await page.locator('[data-shape-field="system"]').click();assert.equal(await page.locator('#shapeFieldInput').inputValue(),choices.Margin[7].system);await page.locator('#cancelShapeField').click();
  assert.ok((await saved()).answers[10].text,'Later decisions must remain saved when reopened');
  assert.equal((await saved()).resolved[10],undefined);
  assert.deepEqual(errors.filter(error=>!error.includes('503 (Service Unavailable)')),[]);
  fs.writeFileSync(path.join(os.tmpdir(),'floppy-founder-journey.json'),JSON.stringify({reports,requests:requests.length,errors},null,2));
  console.log(JSON.stringify({states:reports.length,requests:requests.length,errors,result:'Founder-led journey passed'}));
 }finally{release?.();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
