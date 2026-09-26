// Run with PLAYWRIGHT_MODULE pointing at an installed Playwright package.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.FLOPPY_URL || 'http://127.0.0.1:8767/index.html';
const key = 'milestone_2_mock_key_123456';

async function pixelCrop(page, imageSelector, frameSelector) {
  return page.evaluate(({ imageSelector, frameSelector }) => {
    const img = document.querySelector(imageSelector);
    const frame = document.querySelector(frameSelector);
    const image = img.getBoundingClientRect(), mask = frame.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,
      (image.left - mask.left) / mask.width * canvas.width,
      (image.top - mask.top) / mask.height * canvas.height,
      image.width / mask.width * canvas.width,
      image.height / mask.height * canvas.height);
    return { pixels: Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data), ratio: mask.width / mask.height, source: img.src, geometry: { frame: [mask.width, mask.height], image: [image.width, image.height, image.left - mask.left, image.top - mask.top], style: [img.style.width, img.style.height, img.style.left, img.style.top] } };
  }, { imageSelector, frameSelector });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  let generatedImage = '';
  let failGeneration = false;
  let delayGeneration = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'mock' }] }) });
    const body = route.request().postDataJSON();
    requests.push({ url: route.request().url(), body });
    if (delayGeneration) await new Promise(resolve => setTimeout(resolve, 700));
    if (failGeneration) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/png', data: generatedImage } }] } }] }) });
  });
  try {
    await page.goto(base);
    const imageData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#e24646'; ctx.fillRect(0, 0, 200, 180);
      ctx.fillStyle = '#49a856'; ctx.fillRect(200, 0, 200, 180);
      ctx.fillStyle = '#376ada'; ctx.fillRect(400, 0, 200, 180);
      ctx.fillStyle = '#ffd75d'; ctx.beginPath(); ctx.arc(300, 90, 52, 0, 2 * Math.PI); ctx.fill();
      return canvas.toDataURL('image/png').split(',')[1];
    });
    generatedImage = imageData;
    await page.evaluate(image => {
      const key = 'floppy-projects-v3';
      const store = JSON.parse(localStorage.getItem(key));
      const project = store.projects.find(item => item.id === 'floppy');
      project.contexts = [...(project.contexts || []), { id: 'project-art-reference', title: 'Saved mood board', kind: 'IMAGE', image: `data:image/png;base64,${image}` }];
      localStorage.setItem(key, JSON.stringify(store));
    }, imageData);
    await page.reload();
    const upload = { name: 'my-wide-image.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') };
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(project => project.id === 'floppy').projectArt);
    const open = async () => { await page.locator('[data-id="floppy"].disk-card').hover(); await page.locator('[data-art-id="floppy"]').click(); await page.locator('#artDialog').waitFor({ state: 'visible' }); };
    const original = await saved();

    await open();
    await page.locator('#artUpload').setInputFiles(upload);
    await page.locator('#saveProjectArt:not([disabled])').waitFor();
    assert.deepEqual(await saved(), original, 'upload must remain a candidate');
    await page.locator('#artCropZoom').fill('1.5');
    await page.locator('#cancelArtEdit').click();
    assert.deepEqual(await saved(), original, 'Cancel must preserve saved art');

    await open();
    await page.locator('#artPrompt').fill('A single secure vault, calm dark background, amber light.');
    await page.locator('#addCurrentArtReference').click();
    await page.locator('#artReferenceCount').getByText('1 reference').waitFor();
    await page.locator('#artReferenceUpload').setInputFiles(upload);
    await page.locator('#artReferenceCount').getByText('2 references').waitFor();
    await page.locator('[data-project-image-reference="project-art-reference"]').click();
    await page.locator('#artReferenceCount').getByText('3 references').waitFor();
    await page.locator('#generateProjectArt').click();
    assert.match(await page.locator('#artStatus').textContent(), /Connect Gemini/);
    await page.locator('#connectArtGemini').click();
    await page.locator('#settingsKey').fill(key);
    await page.locator('#saveSettings').click();
    await page.locator('#artDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#artPrompt').inputValue(), 'A single secure vault, calm dark background, amber light.');
    delayGeneration = true;
    await page.locator('#generateProjectArt').click();
    await page.locator('#artLoadingOverlay:not([hidden])').waitFor();
    await page.locator('#cancelArtEdit').click();
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.deepEqual(await saved(), original, 'a cancelled, late generation must not replace saved art');
    await open();
    assert.equal(await page.locator('#artPreviewHeading').innerText(), 'Current image', 'a stale candidate must not appear after reopening');
    await page.locator('#cancelArtEdit').click();
    delayGeneration = false;
    await open();
    await page.locator('#artPrompt').fill('A single secure vault, calm dark background, amber light.');
    await page.locator('#addCurrentArtReference').click();
    await page.locator('#artReferenceUpload').setInputFiles(upload);
    await page.locator('[data-project-image-reference="project-art-reference"]').click();
    await page.locator('#generateProjectArt').click();
    await page.locator('#artPreviewHeading').getByText('Generated image').waitFor();
    assert.deepEqual(await saved(), original, 'generation must not overwrite saved art');
    assert.equal(requests[0].body.generationConfig.responseFormat.image.aspectRatio, '16:9');
    assert.match(requests[0].body.contents[0].parts[0].text, /single secure vault/);
    assert.match(requests[0].body.contents[0].parts[0].text, /Project: Floppy/);
    assert.equal(requests[0].body.contents[0].parts.length, 4, 'current, uploaded, and project references accompany prompt');

    failGeneration = true;
    await page.locator('#artPrompt').fill('A different warm vault with no text.');
    await page.locator('#generateProjectArt').click();
    await page.locator('#artStatus').getByText(/temporarily unavailable/i).waitFor();
    assert.deepEqual(await saved(), original, 'failed regeneration must preserve saved art');
    failGeneration = false;
    await page.locator('#artUseProjectContext').uncheck();
    await page.locator('#generateProjectArt').click();
    // The previous candidate has the same heading. Wait for the new request to finish.
    await page.locator('#artDialog[data-state="candidate-ready"]').waitFor();
    await page.locator('#artPreviewHeading').getByText('Generated image').waitFor();
    assert.match(requests.at(-1).body.contents[0].parts[0].text, /different warm vault/);
    assert.doesNotMatch(requests.at(-1).body.contents[0].parts[0].text, /Project: Floppy/);
    await page.locator('#artCropZoom').fill('1.7');
    const frame = await page.locator('#artCropFrame').boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width / 2 + 38, frame.y + frame.height / 2, { steps: 4 });
    await page.mouse.up();
    const preview = await pixelCrop(page, '#artPreview', '#artCropFrame');
    assert.ok(Math.abs(preview.ratio - 2) < 0.02);
    await page.locator('#saveProjectArt').click();
    const committed = await saved();
    assert.equal(committed.sourceType, 'generated');
    assert.equal(committed.prompt, 'A different warm vault with no text.');
    assert.equal(committed.references.length, 3);
    assert.equal(committed.useProjectContext, false);
    assert.equal(committed.crop.zoom, 1.7);
    assert.notEqual(committed.crop.x, 0.5, 'drag should change crop');
    await page.locator('[data-id="floppy"] [data-floppy-art-image]').evaluate(img => img.decode());
    const carousel = await pixelCrop(page, '[data-id="floppy"] [data-floppy-art-image]', '[data-id="floppy"] [data-floppy-art-frame]');
    const pixelDelta = (a, b) => a.pixels.reduce((sum, value, index) => sum + Math.abs(value - b.pixels[index]), 0) / a.pixels.length;
    assert.deepEqual(carousel.geometry.style, preview.geometry.style);
    assert.ok(pixelDelta(carousel, preview) < 1, `carousel crop differs by ${pixelDelta(carousel, preview)}: ${JSON.stringify({ preview: preview.geometry, carousel: carousel.geometry, sameSource: preview.source === carousel.source })}`);
    await page.reload();
    const restored = await saved();
    assert.deepEqual(restored, committed);
    await page.locator('[data-id="floppy"] [data-floppy-art-image]').evaluate(img => img.decode());
    const carouselAfterReload = await pixelCrop(page, '[data-id="floppy"] [data-floppy-art-image]', '[data-id="floppy"] [data-floppy-art-frame]');
    assert.deepEqual(carouselAfterReload.geometry.style, preview.geometry.style);
    assert.ok(pixelDelta(carouselAfterReload, preview) < 1, `reload crop differs by ${pixelDelta(carouselAfterReload, preview)}`);
    await open();
    assert.equal(await page.locator('#artPrompt').inputValue(), committed.prompt);
    assert.equal(await page.locator('#artCropZoom').inputValue(), '1.7');
    await page.locator('#resetArtCrop').click();
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'floppy-projects-v3') throw new DOMException('Quota reached', 'QuotaExceededError');
        return originalSetItem.call(this, key, value);
      };
      window.restoreArtStorage = () => { Storage.prototype.setItem = originalSetItem; };
    });
    await page.locator('#saveProjectArt').click();
    await page.locator('#artStatus').getByText(/original title and artwork are still safe/i).waitFor();
    assert.deepEqual(await saved(), committed, 'failed storage must preserve the original image');
    await page.evaluate(() => window.restoreArtStorage());
    await page.locator('#cancelArtEdit').click();
    assert.deepEqual(await saved(), committed, 'cancel must discard a crop reset');
    assert.deepEqual(errors.filter(error => !error.includes('503 (Service Unavailable)')), []);
    console.log('Milestone 2 art journey passed');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
