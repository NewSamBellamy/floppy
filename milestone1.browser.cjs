// Run with PLAYWRIGHT_MODULE pointing at an installed Playwright package.
const assert = require('node:assert/strict');
const {fillProductChoices}=require('./product-journey-helpers.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.FLOPPY_URL || 'http://127.0.0.1:8767/index.html';
const key = 'milestone_1_mock_key_123456';
const chapterNames = ['Idea', 'Problem', 'Audience', 'Alternatives', 'Evidence', 'Assumptions', 'First Product', 'Product', 'Features', 'Identity', 'Design', 'Idea Brief', 'Readiness'];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  const mockArt = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=';
  let briefFailure = false;
  let briefDelay = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'mock' }] }) });
    const request = route.request().postDataJSON();
    if (request.generationConfig?.responseModalities?.includes('IMAGE')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/png', data: mockArt } }] } }] }) });
    const prompt = request.contents?.[0]?.parts?.[0]?.text || '';
    if (/Draft a concise, useful proposal|Create a rigorous, concise|Synthesize only the research returned/.test(prompt)) {
      const projectLine=prompt.split('\n').find(line=>line.startsWith('PROJECT: '));
      const projectData=JSON.parse(projectLine.slice(9));
      assert.match(projectData.founderIntent.originalIdea,/API keys, passwords, and virtual cards/,'Every proposal, brief, and synthesis must receive intact founder intent');
    }
    if (prompt.includes('Create a rigorous, concise') && briefFailure) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    if (prompt.includes('Create a rigorous, concise') && briefDelay) await new Promise(resolve => setTimeout(resolve, 1500));
    let response;
    if (prompt.includes('RAW IDEA:')) response = { workingIdea: 'Clydeo gives founders and agents one secure place to manage credentials and virtual cards.', needsClarification: false, followUp: '' };
    else if (prompt.includes('Create a rigorous, concise')) response = { objective: 'Learn what users do today and what would change their minds.', investigationQuestions: ['Who encounters this?', 'How often?', 'What do they use?', 'What fails?', 'What contradicts it?'], evidenceToSeek: ['Interviews'], deliverables: ['Evidence summary'], falsificationQuestions: ['What would disprove it?'] };
    else if (prompt.includes('Synthesize only the research returned')) response = { proposedValue: 'Founders need safer shared credential workflows, according to the returned notes.', strongestEvidence: ['The returned interview note'], contradictions: [], affectedPeople: ['Small teams'], alternatives: [], unresolvedQuestions: ['How frequent is the need?'], sourceIds: [] };
    else response = { candidate: 'A focused understanding grounded in the confirmed project context and the current chapter.', openQuestions: ['What evidence would change this view?'], sourceIds: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(response) }] } }] }) });
  });
  try {
    await page.goto(base);
    await page.locator('#settingsButton').click();
    await page.locator('#settingsKey').fill(key);
    await page.locator('#saveSettings').click();
    await page.locator('#geminiConnected').waitFor({ state: 'visible' });
    await page.locator('#settingsDialog .dialog-top button').click();

    await page.locator('#newProject').click();
    await page.locator('#newContext').fill('I want Clydeo to give users and AI agents a secure place for API keys, passwords, and virtual cards.');
    await page.locator('#newIdeaComposer .plus-menu summary').click();
    await page.locator('[data-new-context-action="add-note"]').click();
    await page.locator('#contextText').fill('A founder described copying secrets between chat and code tools.');
    await page.locator('#contextForm button[type="submit"]').click();
    await page.locator('#newIdeaContextCount').getByText('Attached context · 1').waitFor();
    await page.locator('.optional-title summary').click();
    await page.locator('#newName').fill('Clydeo');
    await page.locator('#createIdea').click();
    assert.equal(await page.locator('#projectTitle').textContent(), 'Clydeo');
    await page.locator('#back').click();
    await page.waitForFunction(() => document.querySelector('.disk-card.selected .disk-select')?.getAttribute('aria-label') === 'Choose Clydeo');
    await page.waitForTimeout(600);
    for (const [control, name] of [['#previous','Handoff'],['#previous','Orbit'],['#next','Handoff'],['#next','Clydeo']]) {
      await page.locator(control).click();
      await page.waitForFunction(expected => document.querySelector('.disk-card.selected .disk-select')?.getAttribute('aria-label') === `Choose ${expected}`, name);
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.disk-card.selected .disk-select').getAttribute('aria-label'), `Choose ${name}`);
    }
    await page.locator('#continueProject').click();
    assert.match(await page.locator('#actionPanel').textContent(), /What are you thinking/);
    await page.locator('#investigateIdea').click();
    await page.locator('#copyWorkBrief').waitFor();
    await page.locator('#returnUnderstanding').click();
    assert.match(await page.locator('#rawIdea').inputValue(), /Clydeo/);
    await page.locator('#continueIdea').click();
    await page.locator('#confirmWorkingIdea').waitFor();
    assert.match(await page.locator('.working-idea').textContent(), /Clydeo/);
    await page.locator('#confirmWorkingIdea').click();

    for (let index = 1; index < chapterNames.length; index += 1) {
      const name = chapterNames[index];
      await page.locator(`#chapters [data-chapter="${index}"]`).waitFor();
      await page.waitForFunction(i => Number(document.body.dataset.activeChapter) === i, index);
      await page.locator('#resolveChapter').waitFor({ timeout: 5000 }).catch(async error => { console.error('Chapter debug', name, await page.locator('#actionPanel').textContent(), errors); throw error; });
      if(index<6){await page.waitForFunction(i => {
        const p = JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(item => item.name === 'Clydeo');
        return p.chapterIntelligence?.[i]?.proposalStatus === 'ready' && document.querySelector('#chapterAnswer')?.value.length >= 12;
      }, index, { timeout: 5000 });
      const text = await page.locator('#chapterAnswer').inputValue();
      assert.ok(text.length >= 12, `${name} should start with a proposal`);}
      await page.locator('#investigateChapter').click();
      await page.locator('#copyWorkBrief').waitFor();
      assert.match(await page.locator('.work-brief').textContent(), /Questions to investigate/);
      if (index === 1) {
        await page.locator('#addResearch').click();
        await page.locator('#contextText').fill('Interview with founder: credentials are copied manually between tools.');
        await page.locator('#contextForm button[type="submit"]').click();
        await page.locator('#analyzeReturnedWork').click();
        await page.locator('#resolveChapter').waitFor({ timeout: 5000 }).catch(async error => { console.error('Synthesis debug', await page.locator('#actionPanel').textContent(), errors); throw error; });
        assert.match(await page.locator('#chapterAnswer').inputValue(), /returned notes/);
        const storage = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')));
        const project = storage.projects.find(item => item.name === 'Clydeo');
        assert.ok(project.contexts.some(item => item.text.includes('Interview with founder')));
        assert.ok(project.chapterIntelligence[1].researchProposal);
        assert.equal(project.resolved[1], undefined);
      } else {
        await page.locator('#returnUnderstanding').click();
        await page.locator('#resolveChapter').waitFor();
      }
      if(index>=6)await fillProductChoices(page,index,'Clydeo');
      await page.locator('#resolveChapter').click();
      await page.waitForFunction(i => Boolean(JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo')?.resolved?.[i]), index);
      process.stdout.write(`${name}: confirmed\n`);
    }
    await page.locator('#beginPrototype').waitFor();
    await page.locator('#beginPrototype').click();
    assert.match(await page.locator('#projectStage').textContent(), /PROTOTYPE/);
    await page.locator('#phases [data-phase="0"]').click();
    await page.locator('#phases [data-phase="1"]').click();
    assert.match(await page.locator('#projectStage').textContent(), /PROTOTYPE/);
    await page.locator('#phases [data-phase="0"]').click();
    await page.locator('#chapters [data-chapter="1"]').click();
    assert.match(await page.locator('.decision-artifact').textContent(), /returned notes/);
    assert.equal(await page.locator('#chapterAnswer').count(), 0);
    const confirmed = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo'));
    assert.equal(confirmed.chapterIntelligence[1].proposal.text.includes('focused understanding'), true);
    assert.match(confirmed.chapterIntelligence[1].researchProposal.proposedValue, /returned notes/);
    assert.match(confirmed.answers[1].text, /returned notes/);
    assert.ok(confirmed.chapterIntelligence[1].investigation.brief);
    await page.locator('#investigateChapter').click();
    await page.locator('#copyWorkBrief').waitFor();
    briefFailure = true;
    await page.locator('#refreshWorkBrief').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo').chapterIntelligence[1].briefStatus === 'failed');
    assert.match(await page.locator('.work-brief').textContent(), /Questions to investigate/);
    briefFailure = false;
    briefDelay = true;
    await page.locator('#refreshWorkBrief').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo').chapterIntelligence[1].briefStatus === 'generating');
    await page.reload();
    await page.locator('#continueProject').click();
    const interrupted = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo'));
    assert.equal(interrupted.chapterIntelligence[1].briefStatus, 'failed');
    assert.ok(interrupted.chapterIntelligence[1].workBrief);
    await page.locator('#returnUnderstanding').click();
    assert.match(await page.locator('.decision-artifact').textContent(), /returned notes/);
    await page.locator('#back').click();
    assert.equal(await page.locator('#resumeTitle').textContent(), 'Clydeo');
    await page.locator('#continueProject').click();
    await page.locator('#chapters [data-chapter="0"]').click();
    await page.locator('#editIdea').click();
    await page.locator('#confirmIdeaEdit').click();
    const revised = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo'));
    assert.equal(revised.resolved[1], undefined);
    assert.match(revised.answers[1].text, /returned notes/);
    assert.match(revised.idea.rawIdea, /Clydeo/);

    await page.locator('#back').click();
    await page.waitForFunction(() => document.querySelector('.disk-card.selected .disk-select')?.getAttribute('aria-label') === 'Choose Clydeo');
    await page.waitForTimeout(600);
    await page.locator('#settingsButton').click();
    await page.locator('#settingsKey').fill(key);
    await page.locator('#saveSettings').click();
    await page.locator('#geminiConnected').waitFor({ state: 'visible' });
    await page.locator('#settingsDialog .dialog-top button').click();
    const clydeoDisk = page.locator('.disk-card').filter({ has: page.getByRole('button', { name: 'Choose Clydeo' }) });
    await page.waitForFunction(() => document.querySelector('.disk-card.selected .disk-select')?.getAttribute('aria-label') === 'Choose Clydeo');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.disk-card.selected .disk-select').getAttribute('aria-label'), 'Choose Clydeo');
    await clydeoDisk.hover();
    await clydeoDisk.locator('.art-edit').click();
    const savedArtBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo').projectArt);
    await page.locator('#artPrompt').fill('A tiny warm amber constellation on midnight blue.');
    await page.locator('#generateProjectArt').click();
    await page.locator('#artPreviewHeading').getByText('Generated image').waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo').projectArt), savedArtBefore, 'generated art must remain only a candidate before approval');
    await page.locator('#saveProjectArt').click();
    const savedArt = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo').projectArt);
    assert.equal(savedArt.sourceType, 'generated');
    assert.match(savedArt.prompt, /amber constellation/);
    await page.reload();
    const reopened = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.name === 'Clydeo'));
    assert.deepEqual(reopened.projectArt, savedArt, 'approved art and all project decisions must survive reload');
    assert.match(reopened.idea.rawIdea, /Clydeo/);
    assert.match(reopened.chapterIntelligence[1].researchProposal.proposedValue, /returned notes/);
    await page.locator('#continueProject').click();
    assert.equal((await page.locator('#projectTitle').textContent()).trim(), 'Clydeo');
    assert.ok(errors.some(error => error.includes('503 (Service Unavailable)')), 'mock failure should have been exercised');
    assert.deepEqual(errors.filter(error => !error.includes('503 (Service Unavailable)')), []);
    console.log('Milestone 1 browser journey passed');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
