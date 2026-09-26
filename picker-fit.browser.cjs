const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:904,height:558}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.FLOPPY_URL||'http://127.0.0.1:8766/index.html');
  await page.locator('.disk-card.selected .disk').waitFor();
  await page.locator('#editProjectInfo').click();
  await page.locator('#projectDescriptionInput').fill('Help small teams return to an idea and know exactly what to work on next. Founders and small teams building across tools and conversations.');
  await page.locator('#saveProjectInfo').click();
  for(const [width,height] of [[904,558],[1366,768],[390,844]]){
   await page.setViewportSize({width,height});
   const bounds=await page.evaluate(()=>{const disk=document.querySelector('.disk-card.selected .disk').getBoundingClientRect(),shelf=document.querySelector('.shelf').getBoundingClientRect();return {top:disk.top,bottom:disk.bottom,shelfTop:shelf.top,shelfBottom:shelf.bottom};});
   assert.ok(bounds.top>=bounds.shelfTop+8&&bounds.bottom<=bounds.shelfBottom-8,`Entire disk and shadow must fit at ${width}x${height}: ${JSON.stringify(bounds)}`);
   await page.screenshot({path:path.join(os.tmpdir(),`floppy-picker-fit-${width}x${height}.png`)});
  }
  assert.ok(['none','""'].includes(await page.locator('.shutter').first().evaluate(el=>getComputedStyle(el,'::after').content)),'No repeated name on shutter');
  // Reproduce legacy records lacking a color without touching real browser data.
  await page.locator('#next').click();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('floppy-projects-v3'));s.projects.forEach(p=>delete p.color);localStorage.setItem('floppy-projects-v3',JSON.stringify(s));});
  await page.reload();
  const colors=await page.locator('.disk-card .disk').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
  assert.equal(new Set(colors).size,colors.length,'Legacy projects have distinct defaults');
  await page.locator('#editProjectInfo').click();
  await page.locator('#projectColorInput').fill('#e65977');await page.locator('#saveProjectInfo').click();
  await page.reload();await page.locator('#editProjectInfo').click();assert.equal(await page.locator('#projectColorInput').inputValue(),'#e65977');await page.locator('#projectInfoDialog .dialog-top button').click();
  for(const name of ['One','Two']){await page.locator('#newProject').click();await page.locator('#newContext').fill(`Build a useful project named ${name}`);await page.locator('#createIdea').click();await page.locator('#back').click();}
  const createdColors=await page.locator('.disk-card .disk').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
  assert.equal(new Set(createdColors).size,createdColors.length,'New projects choose unused colors');
  await page.setViewportSize({width:904,height:558});
  await page.locator('#settingsButton').click();
  await page.screenshot({path:path.join(os.tmpdir(),'floppy-picker-appearance.png')});
  await page.locator('#desktopColor').fill('#adc6a2');await page.locator('#desktopColor').dispatchEvent('change');
  await page.reload();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(173, 198, 162)');
  await page.locator('#settingsButton').click();await page.locator('#resetDesktopColor').click();
  await page.reload();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(198, 217, 215)');
  assert.deepEqual(errors,[]);console.log('Picker fit, legacy colors, custom disk color, background save/reset/reload passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
