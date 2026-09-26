const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

const url = process.env.FLOPPY_URL || 'http://127.0.0.1:8767/index.html';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  try {
    await page.goto(url);
    await page.locator('#carousel').focus();
    const before = await page.locator('.disk-card.selected').getAttribute('data-id');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(id => document.querySelector('.disk-card.selected')?.dataset.id !== id, before);
    const selected = await page.locator('.disk-card.selected .disk-select').getAttribute('aria-pressed');
    assert.equal(selected, 'true', 'keyboard carousel selection should update pressed state');

    await page.locator('#continueProject').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'projectTitle', 'entering a project should move focus to its title');
    const railButton = page.locator('#chapters button').first();
    await railButton.focus();
    assert.equal(await railButton.evaluate(el => document.activeElement === el), true, 'chapter rail controls should accept keyboard focus');
    await page.keyboard.press('Enter');

    await page.locator('#settingsButton').click();
    assert.equal(await page.locator('#settingsKey').getAttribute('type'), 'password', 'Gemini key entry remains masked');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#settingsDialog').open);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settingsButton', 'closing Settings should restore focus to its opener');

    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="add-note"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'contextText', 'context dialog should focus its first field');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#contextDialog').open);
    await page.locator('#actionPanel .plus-menu summary').click();
    await page.locator('#actionPanel [data-context-action="add-note"]').click();
    await page.locator('#contextText').fill('Keyboard removal test');
    await page.locator('#contextForm button[type=submit]').focus();
    await page.keyboard.press('Enter');
    await page.locator('#ideaContextDisclosure summary').click();
    const remove = page.locator('[data-remove-context]').first();
    await remove.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.id==='floppy').contexts.some(c=>c.text==='Keyboard removal test')), false, 'attachment removal should work with keyboard activation');

    await page.locator('#newProject').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'newContext', 'new idea dialog should focus its first field');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#newDialog').open);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'newProject', 'closing new idea should restore focus to its opener');

    await page.locator('#back').click();
    const edit = page.locator('[data-art-id="floppy"]');
    await page.locator('[data-id="floppy"] .disk-select').focus();
    await page.keyboard.press('Tab');
    assert.equal(await edit.evaluate(el => document.activeElement===el), true, 'tabbing from a disk should reveal and focus its art action');
    await page.keyboard.press('Enter');
    await page.locator('#artDialog[open]').waitFor();
    const upload = { name: 'keyboard-crop.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', 'base64') };
    await page.locator('#artUpload').setInputFiles(upload);
    await page.locator('#saveProjectArt:not([disabled])').waitFor();
    await page.locator('#artCropFrame').focus();
    const cropBefore = await page.locator('#artPreview').getAttribute('data-crop-y');
    await page.keyboard.press('ArrowDown');
    assert.notEqual(await page.locator('#artPreview').getAttribute('data-crop-y'), cropBefore, 'crop preview should be keyboard-adjustable');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#artDialog').open);
    assert.equal(await page.evaluate(() => document.activeElement.closest('[data-art-id]')?.dataset.artId), 'floppy', 'closing art editor should restore focus to its opener');

    const audit = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('input:not([type="hidden"]):not([hidden]), textarea:not([hidden]), select:not([hidden])')];
      const unlabeled = controls.filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.id || el.outerHTML.slice(0,100));
      const iconButtons = [...document.querySelectorAll('button')].filter(el => !el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title')).map(el => el.outerHTML.slice(0,120));
      return { viewport: { width: innerWidth, height: innerHeight }, page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, y: scrollY }, unlabeled, iconButtons };
    });
    assert.deepEqual(audit.unlabeled, [], `form controls require labels: ${JSON.stringify(audit.unlabeled)}`);
    assert.deepEqual(audit.iconButtons, [], `icon-only buttons require accessible names: ${JSON.stringify(audit.iconButtons)}`);
    assert.deepEqual(errors, [], `fresh browser console/page errors: ${JSON.stringify(errors)}`);
    console.log(JSON.stringify({ keyboardCarousel: true, projectFocus: true, railFocus: true, settingsEscapeFocusRestore: true, contextEscape: true, keyboardCrop: true, artEscapeFocusRestore: true, labelsAndNames: true, consoleErrors: errors, audit }));
  } finally { await browser.close(); }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
