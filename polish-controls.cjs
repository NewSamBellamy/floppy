const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const url = process.env.FLOPPY_URL || 'http://127.0.0.1:8766/index.html';
const sizes = [[1366,768],[1440,900],[1920,1080],[1280,720],[390,844]];
async function main() {
  const browser = await chromium.launch({ headless:true });
  const results = [];
  try {
    for (const [width,height] of sizes) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage();
      page.setDefaultTimeout(5000);
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text());});
      await page.route('https://generativelanguage.googleapis.com/**',route=>route.abort());
      async function inView(selector,region='body') {
        const result=await page.locator(selector).evaluate((el,container)=>{
          const r=el.getBoundingClientRect(),box=document.querySelector(container).getBoundingClientRect();
          return {inside:r.top>=Math.max(0,box.top)-1&&r.bottom<=Math.min(innerHeight,box.bottom)+1&&r.left>=Math.max(0,box.left)-1&&r.right<=Math.min(innerWidth,box.right)+1,rect:{x:r.x,y:r.y,bottom:r.bottom,right:r.right}};
        },region);
        assert.ok(result.inside,`${width} ${selector}: ${JSON.stringify(result)}`);
      }
      async function shot(name) { await page.screenshot({path:path.join(os.tmpdir(),`floppy-polish-controls-${width}x${height}-${name}.png`)}); }
      await page.goto(url);
      await page.locator('#editProjectInfo').focus();
      await page.keyboard.press('Enter');
      await page.locator('#projectInfoDialog[open]').waitFor();
      await page.locator('#projectNameInput').fill('A deliberately long project name that should wrap without displacing the Continue action');
      await page.locator('#projectDescriptionInput').fill('A detailed project description. '.repeat(35));
      await page.locator('#saveProjectInfo').click();
      await inView('#continueProject'); await shot('long-project');
      await page.locator('.disk-card.selected .disk-select').focus(); await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.locator('#artDialog[open]').waitFor();
      const chooser=page.waitForEvent('filechooser');
      await page.locator('label[for="artUpload"]').focus(); await page.keyboard.press('Enter');
      await (await chooser).setFiles({name:'crop.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=','base64')});
      await page.locator('#saveProjectArt:not([disabled])').waitFor();
      await inView('#saveProjectArt');
      const referenceChooser=page.waitForEvent('filechooser');
      await page.locator('label[for="artReferenceUpload"]').focus(); await page.keyboard.press('Space');
      await (await referenceChooser).setFiles([]);
      await shot('art-candidate');
      await page.locator('#artPrompt').fill('A calm paper collage of client notes.');
      await page.locator('#generateProjectArt').click();
      await page.locator('#connectArtGemini').waitFor(); await shot('art-disconnected');
      await page.locator('#cancelArtEdit').click();
      await page.locator('#continueProject').click();
      const text='The exact long idea must survive refresh. '+('A thought with context and uncertainty. '.repeat(100));
      await page.locator('#rawIdea').fill(text);
      await page.waitForFunction(()=>document.querySelector('#ideaSaveIndicator')?.textContent==='Saved');
      await page.reload(); await page.locator('#continueProject').click();
      assert.equal(await page.locator('#rawIdea').inputValue(),text);
      await inView('#continueIdea'); await shot('long-idea');
      await page.locator('#actionPanel .plus-menu summary').click();
      await page.waitForFunction(()=>document.querySelector('#actionPanel .plus-options')?.style.maxHeight);
      await inView('#actionPanel .plus-options','.workspace-main'); await shot('idea-menu');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#actionPanel .plus-menu').evaluate(el=>el.open),false);
      assert.equal(await page.evaluate(()=>document.activeElement.matches('.plus-menu > summary')),true);
      await page.locator('#newProject').click();
      await page.locator('#newIdeaComposer .plus-menu summary').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#newDialog').evaluate(el=>el.open),true,'first Escape closes only the menu');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#newDialog').evaluate(el=>el.open),false);
      await page.locator('#settingsButton').click();
      await page.locator('#saveSettings').click();
      await inView('#settingsStatus'); await inView('#saveSettings'); await shot('settings-validation');
      const named=await page.locator('#settingsDialog').evaluate(el=>!!document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
      assert.ok(named);
      const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,y:scrollY}));
      assert.deepEqual(metrics,{width,height,documentWidth:width,documentHeight:height,y:0});
      assert.deepEqual(errors,[]);
      results.push({width,height,longTextReload:true,keyboardUploads:true,menuBoundsAndEscape:true,dialogValidation:true,errors});
      await context.close();
    }
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
