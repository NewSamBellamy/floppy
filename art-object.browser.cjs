const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.setDefaultTimeout(5000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://generativelanguage.googleapis.com/**',route=>route.abort());
  await page.goto(process.env.FLOPPY_URL||'http://127.0.0.1:8766/index.html');
  async function open(){await page.locator('.disk-card.selected').hover();await page.locator('.disk-card.selected .art-edit').click();}
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floppy-projects-v3')).projects.find(p=>p.id==='floppy'));
  await open();
  assert.equal(await page.locator('#artDiskPreview .shutter').count(),1);
  assert.equal(await page.locator('#artDiskPreview .disk-label #artCropFrame').count(),1);
  assert.equal(await page.locator('#artProjectTitle').inputValue(),'Floppy');
  await page.locator('#artProjectTitle').fill('Unsaved title');
  await page.locator('#cancelArtEdit').click();
  await open();
  assert.equal(await page.locator('#artProjectTitle').inputValue(),'Floppy');
  await page.locator('#artProjectTitle').fill('Founder’s field notes');
  await page.locator('#artCropZoom').fill('1.6');
  await page.locator('#artCropFrame').focus();await page.keyboard.press('ArrowRight');
  const before=await saved();
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='floppy-projects-v3')throw new DOMException('Quota','QuotaExceededError');return window.originalSetItem.call(this,k,v);};});
  await page.locator('#saveProjectArt').click();
  await page.locator('#artDialog[open]').waitFor();
  assert.deepEqual(await saved(),before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await page.locator('#saveProjectArt').click();
  await page.reload();
  assert.equal(await page.locator('.disk-card.selected .label-copy strong').textContent(),'Founder’s field notes');
  assert.equal((await saved()).projectArt.crop.zoom,1.6);
  await open();
  for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[1280,720],[390,844]]){
   await page.setViewportSize({width,height});
   await page.screenshot({path:path.join(os.tmpdir(),`floppy-art-object-${width}x${height}.png`)});
   const metrics=await page.evaluate(()=>{
    const dialog=document.querySelector('#artDialog'),layout=dialog.querySelector('.project-art-layout'),controls=dialog.querySelector('.project-art-controls'),frame=document.querySelector('#artCropFrame').getBoundingClientRect(),button=document.querySelector('#saveProjectArt').getBoundingClientRect();
    return{width:innerWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight,layoutScroll:layout.scrollHeight-layout.clientHeight,controlsScroll:controls.scrollHeight-controls.clientHeight,ratio:frame.width/frame.height,buttonBottom:button.bottom};
   });
   assert.equal(metrics.pageHeight,height);
   assert.ok(Math.abs(metrics.ratio-2)<.01);
   assert.ok(metrics.buttonBottom<=height);
   if(width>=1280){assert.ok(metrics.layoutScroll<=1);assert.ok(metrics.controlsScroll<=1);}
  }
  assert.deepEqual(errors,[]);
  console.log('Disk object: title cancel/save/quota rollback/reload, crop and five viewport layouts passed.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
