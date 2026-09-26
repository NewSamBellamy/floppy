const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const url = process.env.FLOPPY_URL || 'http://127.0.0.1:8767/index.html';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const newContext = async () => browser.newContext();
  try {
    const context = await newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on('pageerror', e => failures.push(e.message));
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#continueProject').click();
    const rawIdea = page.locator('#rawIdea');
    const unique = `autosave reliability ${Date.now()}`;
    await rawIdea.fill(unique);
    await wait(800);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.id === 'floppy').idea.rawIdea), unique);
    await page.reload();
    await page.locator('#continueProject').click();
    assert.equal(await page.locator('#rawIdea').inputValue(), unique);

    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="add-note"]').click();
    await page.locator('#contextText').fill('failure-boundary context sample');
    await page.evaluate(() => { Storage.prototype.__auditOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k==='floppy-projects-v3') throw new DOMException('quota','QuotaExceededError'); return Storage.prototype.__auditOriginalSetItem.call(this,k,v); }; });
    await page.locator('#contextForm button[type=submit]').click();
    const contextFailureStayedOpen = await page.locator('#contextDialog').evaluate(d => d.open);
    const falseSuccess = await page.locator('#toast').innerText().catch(()=>'');
    const contextStatus = await page.locator('#contextStatus').innerText();
    const quotaContextPersisted = await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.id === 'floppy').contexts.some(c => c.text === 'failure-boundary context sample'));
    await page.evaluate(() => { Storage.prototype.setItem = Storage.prototype.__auditOriginalSetItem; delete Storage.prototype.__auditOriginalSetItem; });
    console.log(JSON.stringify({ autosaveReload: true, contextFailureStayedOpen, contextStatus, quotaContextPersisted, failureToast: falseSuccess }));
    assert.equal(contextFailureStayedOpen, true, 'context dialog must remain open when storage fails');
    assert.equal(quotaContextPersisted, false, 'failed context write must not be shown as persisted');
    await page.locator('#contextForm button[type=submit]').click();
    await page.locator('#contextDialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.id === 'floppy').contexts.some(c => c.text === 'failure-boundary context sample')), true, 'retry should save the previously unsaved note');
    await page.reload(); await page.locator('#continueProject').click();
    await page.locator('#ideaContextDisclosure summary').click();
    await page.locator('[data-remove-context]').first().click();
    await wait(100);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p => p.id === 'floppy').contexts.some(c => c.text === 'failure-boundary context sample')), false, 'removing a source should persist');

    await page.locator('#back').click();
    await page.locator('#newProject').click();
    await page.locator('#newContext').fill('precreation context survives project creation');
    await page.locator('#newForm button[type=submit]').click();
    await page.locator('#project:not([hidden])').waitFor();
    const created = await page.evaluate(() => { const s=JSON.parse(localStorage.getItem('floppy-projects-v3')); return s.projects.find(p=>p.name==='Untitled idea'); });
    assert.match(created.context, /precreation context survives project creation/);
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.some(p=>p.name==='Untitled idea')), true, 'created project must survive reload');
    await page.locator('#continueProject').click();
    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="upload-file"]').click();
    await page.locator('#composerFile').setInputFiles({ name: 'reliability-sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% isolated attachment') });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.some(p=>p.name==='Untitled idea'&&p.contexts.some(c=>c.fileName==='reliability-sample.pdf'&&c.fileData?.startsWith('data:application/pdf'))));
    await page.reload(); await page.locator('#continueProject').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Untitled idea').contexts.some(c=>c.fileName==='reliability-sample.pdf'&&c.fileData?.startsWith('data:application/pdf'))), true, 'PDF attachment must survive project reload');
    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="upload-image"]').click();
    await page.locator('#composerImage').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', 'base64') });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.some(p=>p.name==='Untitled idea'&&p.contexts.some(c=>c.fileName==='reference.png'&&c.image?.startsWith('data:image/'))));
    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="add-link"]').click();
    await page.locator('#contextUrl').fill('https://example.test/research');
    await page.locator('#contextForm button[type=submit]').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.name==='Untitled idea').contexts.some(c=>c.url==='https://example.test/research')), true, 'links must be retained as source context');

    const creationContext = await newContext();
    const creationPage = await creationContext.newPage();
    await creationPage.goto(url);
    const originalProjectCount = await creationPage.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.length);
    await creationPage.evaluate(() => { Storage.prototype.__auditOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k==='floppy-projects-v3') throw new DOMException('quota','QuotaExceededError'); return Storage.prototype.__auditOriginalSetItem.call(this,k,v); }; });
    await creationPage.locator('#newProject').click();
    await creationPage.locator('#newContext').fill('creation quota boundary');
    await creationPage.locator('#newForm button[type=submit]').click();
    assert.equal(await creationPage.locator('#newDialog').evaluate(d=>d.open), true, 'creation form must remain open when saving fails');
    assert.equal(await creationPage.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.length), originalProjectCount, 'failed project creation must roll back the unsaved project');
    await creationPage.evaluate(() => { Storage.prototype.setItem = Storage.prototype.__auditOriginalSetItem; delete Storage.prototype.__auditOriginalSetItem; });
    await creationPage.locator('#newForm button[type=submit]').click();
    await creationPage.locator('#project:not([hidden])').waitFor();
    assert.equal(await creationPage.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.length), originalProjectCount + 1, 'creation retry must persist exactly once');
    await creationContext.close();

    const conflictContext = await newContext();
    const p1 = await conflictContext.newPage();
    const p2 = await conflictContext.newPage();
    await p1.goto(url); await p2.goto(url);
    await p1.waitForTimeout(200); await p2.waitForTimeout(200);
    await p1.evaluate(() => { const s=JSON.parse(localStorage.getItem('floppy-projects-v3')); s.active='orbit'; localStorage.setItem('floppy-projects-v3',JSON.stringify(s)); });
    await p2.waitForFunction(() => document.querySelector('#saveWarning')?.textContent.includes('Another tab changed'));
    await p2.locator('#continueProject').click();
    await p2.locator('#rawIdea').fill('tab two attempted overwrite'); await wait(700);
    const conflictWarning = await p2.locator('#saveWarning').innerText();
    const conflictedStore = await p2.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')));
    assert.equal(conflictedStore.active, 'orbit', `a stale tab must not overwrite newer storage; warning was ${conflictWarning}`);
    assert.notEqual(conflictedStore.projects.find(p => p.id === 'floppy').idea.rawIdea, 'tab two attempted overwrite');
    await conflictContext.close();

    const malformedContext = await newContext();
    const malformed = await malformedContext.newPage();
    await malformed.goto(url); await malformed.evaluate(() => localStorage.setItem('floppy-projects-v3','{bad json'));
    await malformed.reload();
    assert.match(await malformed.locator('#saveWarning').innerText(), /could not be loaded/i);
    assert.equal(await malformed.evaluate(() => localStorage.getItem('floppy-projects-v3')), '{bad json');
    await malformedContext.close();
    await context.close();
    if (failures.length) throw new Error(`page errors: ${failures.join('; ')}`);
    console.log('Milestone 4 reliability journey passed.');
  } finally { await browser.close(); }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
