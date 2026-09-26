// Isolated visual journey. All Gemini traffic is intercepted; no live key is used.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {fillProductChoices}=require('./product-journey-helpers.cjs');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const tag = process.env.FLOPPY_AUDIT_TAG || 'polish-after';
const url = process.env.FLOPPY_URL || 'http://127.0.0.1:8766/index.html';
const sizes = [[1366,768],[1440,900],[1920,1080],[1280,720],[390,844]];
const reports = [];
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width:1366,height:768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(m.text()); });
  let fail = false, releaseResponse = null, responseGate = null;
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: {models:[{name:'mock'}]} });
    const prompt = route.request().postDataJSON().contents?.[0]?.parts?.[0]?.text || '';
    if (responseGate) await responseGate;
    // Delay allows inspection of the actual loading state.
    await new Promise(resolve => setTimeout(resolve, 350));
    if (fail) return route.fulfill({ status:503, json:{error:{message:'Service unavailable. Try again.'}} });
    let result;
    if (prompt.includes('RAW IDEA:')) result = {workingIdea:'Fieldnotes helps independent designers turn scattered client feedback into a clear next decision.',needsClarification:false,followUp:''};
    else if (prompt.includes('Create a rigorous, concise')) result = {objective:'Understand where client feedback becomes difficult to act on.',investigationQuestions:['How is feedback captured today?','Which decisions are delayed?','What happens when feedback conflicts?','Who resolves the disagreement?','How often does this happen?'],evidenceToSeek:['Recent feedback threads and interviews'],deliverables:['An evidence summary'],falsificationQuestions:['When does the existing approach work well?']};
    else if (prompt.includes('Synthesize only the research returned')) result = {proposedValue:'Designers lose time reconciling contradictory feedback across channels, according to the returned interview notes.',strongestEvidence:['One designer reported repeated clarification rounds.'],contradictions:[],affectedPeople:['Independent designers'],alternatives:['Email and shared documents'],unresolvedQuestions:['How often does this delay delivery?'],sourceIds:[]};
    else result = {candidate:'Independent designers need a clear way to reconcile client feedback and identify the next decision, while keeping the original context available.',openQuestions:['How often does this block delivery?'],sourceIds:[]};
    return route.fulfill({json:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]}});
  });
  async function capture(name, allSizes=true) {
    for (const [width,height] of allSizes ? sizes : [[1366,768]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => { document.querySelector('.workspace-main')?.scrollTo(0,0); });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(os.tmpdir(),`floppy-${tag}-${width}x${height}-${name}.png`)});
      const metrics = await page.evaluate(() => {
        const visible = el => !!el?.getClientRects().length;
        const rect = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}; };
        const primary = [...document.querySelectorAll('dialog[open] .primary, #project:not([hidden]) #actionPanel .primary, #continueIdea, #library:not([hidden]) #continueProject')].filter(visible);
        const dialog=document.querySelector('dialog[open]');
        const actions=primary.filter(el=>!dialog||dialog.contains(el)).map(el=>({id:el.id,...rect(el)}));
        const workspace=document.querySelector('.workspace-main');
        const current=document.querySelector('.chapter.current'), rail=document.querySelector('.chapter-rail');
        const currentBox=visible(current)?rect(current):null, railBox=visible(rail)?rect(rail):null;
        return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,scrollY,actions,workspaceScroll:workspace.scrollHeight-workspace.clientHeight,dialog:dialog?rect(dialog):null,currentBox,railBox};
      });
      assert.equal(metrics.documentWidth,width,`${name}: horizontal page overflow`);
      assert.equal(metrics.documentHeight,height,`${name}: vertical page overflow`);
      assert.equal(metrics.scrollY,0);
      if (name.startsWith('confirmed-') && width>=1280) assert.ok(metrics.workspaceScroll<=1,`${name} ${width}: confirmed decision requires unnecessary workspace scrolling`);
      if (!tag.includes('before')) {
        for (const action of metrics.actions) assert.ok(action.y>=0&&action.bottom<=height&&action.x>=0&&action.right<=width,`${name} ${width}: clipped ${action.id}`);
        if (width<760 && metrics.currentBox && !metrics.dialog) assert.ok(metrics.currentBox.x>=metrics.railBox.x-1&&metrics.currentBox.right<=metrics.railBox.right+1,`${name}: active chapter offscreen`);
      }
      reports.push({name,...metrics});
    }
    await page.setViewportSize({width:1366,height:768});
  }
  try {
    await page.goto(url);
    await page.locator('#newProject').click(); await capture('new-empty');
    await page.locator('#newContext').fill('Help independent designers turn scattered client feedback into a clear next decision.');
    await page.locator('#newIdeaComposer .plus-menu summary').click(); await capture('new-menu');
    await page.locator('[data-new-context-action="add-note"]').click(); await capture('new-context');
    await page.locator('#contextText').fill('A designer described three rounds of conflicting feedback.');
    await page.locator('#contextForm button[type=submit]').click();
    await page.locator('.optional-title summary').click(); await page.locator('#newName').fill('Fieldnotes');
    await page.locator('#createIdea').click(); await capture('idea-with-context');
    await page.locator('#continueIdea').click(); await capture('disconnected');
    await page.locator('#connectGoogle').click();
    await page.locator('#saveSettings').click(); await capture('settings-empty-error');
    await page.locator('#settingsKey').fill('disposable_mock_key_for_visual_audit');
    await page.locator('#saveSettings').click(); await page.locator('#geminiConnected').waitFor({state:'visible'});
    await capture('settings-connected'); await page.locator('#settingsDialog .dialog-top button').click();
    fail=true;
    responseGate=new Promise(resolve=>{releaseResponse=resolve;});
    await page.locator('#continueIdea').click();
    await page.locator('#cancelIdeaGeneration').waitFor(); await capture('idea-loading');
    releaseResponse(); responseGate=null;
    await page.locator('#ideaNotice').waitFor(); await capture('idea-error');
    fail=false;
    await page.locator('#continueIdea').click();
    await page.locator('#confirmWorkingIdea').waitFor(); await capture('idea-review');
    await page.locator('#editWorkingIdea').click(); await capture('idea-edit');
    await page.locator('#saveWorkingIdea').click(); await page.locator('#confirmWorkingIdea').click();
    for(let i=1;i<13;i++) {
      await page.waitForFunction(index=>document.body.dataset.activeChapter===String(index)&&(index>=6?!!document.querySelector('#resolveChapter'):!!document.querySelector('#chapterAnswer')?.value),i);
      if(i>=6)await fillProductChoices(page,i,'Fieldnotes');
      await capture(`chapter-${i}`, [1,6,9,11,12].includes(i));
      if(i===1) {
        await page.locator('#investigateChapter').click(); await page.locator('#copyWorkBrief').waitFor(); await capture('investigation');
        await page.locator('#addResearch').click(); await capture('research-capture');
        await page.locator('#contextText').fill('Interview: a designer needs to reconcile contradictory feedback before each delivery.');
        await page.locator('#contextForm button[type=submit]').click();
        await page.locator('#analyzeReturnedWork').click(); await page.locator('#resolveChapter').waitFor(); await capture('research-review');
        await page.locator('.evidence-disclosure > summary').click(); await capture('research-evidence');
        await page.locator('.evidence-disclosure > summary').click();
      }
      await page.locator('#resolveChapter').click();
    }
    await page.locator('#beginPrototype').waitFor(); await capture('readiness-confirmed');
    for (let i=1;i<13;i++) {
      await page.locator(`[data-chapter="${i}"]`).click();
      assert.equal(await page.locator('#chapterAnswer').count(),0,'Confirmed decisions must not be form fields');
      if(i<6)assert.ok((await page.locator('.decision-artifact').textContent()).trim());
      else assert.ok((await page.locator('#actionPanel').textContent()).trim());
      await capture(`confirmed-${i}`,i<=5||i===12);
      if(i<6){
        const decisions=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Fieldnotes').answers));
        await page.locator('#continueConfirmedChapter').click();
        assert.equal(await page.locator('body').getAttribute('data-active-chapter'),String(i+1));
        assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Fieldnotes').answers)),decisions,'Continue navigates without changing confirmed decisions');
      }
    }
    await page.locator('#beginPrototype').click(); await capture('prototype');
    await page.locator('#returnIdea').click(); await page.locator('[data-chapter="0"]').click(); await capture('idea-confirmed');
    await page.locator('#back').click(); await capture('fresh-project-home');
    if (tag.includes('before')) await page.locator('.resume-copy').hover();
    await page.locator('#editProjectInfo').click(); await capture('project-details');
    await page.keyboard.press('Escape');
    await page.reload(); await page.locator('#continueProject').click();
    assert.equal(await page.locator('#projectTitle').textContent(),'Fieldnotes');
    assert.match(await page.locator('.decision-artifact').textContent(),/Fieldnotes/);
    await page.locator('[data-chapter="1"]').click();
    const originalDecision=await page.locator('.decision-lead').textContent();
    await page.locator('#reopenChapter').click();
    assert.equal(await page.locator('#chapterAnswer').inputValue(),originalDecision);
    assert.equal(await page.locator('#chapterAnswer').getAttribute('readonly'),null);
    const longDecision='Client feedback should remain connected to its original context. '.repeat(65);
    await page.locator('#chapterAnswer').fill(longDecision);
    await page.waitForFunction(value=>JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Fieldnotes').chapterIntelligence[1].draftText===value,longDecision);
    await page.reload(); await page.locator('#continueProject').click();
    assert.equal(await page.locator('#chapterAnswer').inputValue(),longDecision);
    await page.locator('#resolveChapter').click();
    await page.locator('[data-chapter="1"]').click();
    await capture('confirmed-long');
    await page.locator('.decision-full summary').click();
    assert.equal(await page.locator('.decision-full-text').textContent(),longDecision.trim());
    const savedDecision=await page.evaluate(()=>JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Fieldnotes').chapterIntelligence[1].confirmation);
    assert.equal(savedDecision.value,longDecision.trim());
    assert.equal(savedDecision.origin,'human-confirmed');
    assert.deepEqual(errors.filter(e=>!e.includes('503 (Service Unavailable)')),[]);
    fs.writeFileSync(path.join(os.tmpdir(),`floppy-${tag}-journey.json`),JSON.stringify({reports,errors},null,2));
    console.log(JSON.stringify({states:reports.length,errors,report:path.join(os.tmpdir(),`floppy-${tag}-journey.json`)}));
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
