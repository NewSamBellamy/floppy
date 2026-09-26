// Isolated account journey. All Supabase and Gemini calls are mocked in-browser.
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.FLOPPY_URL||'http://127.0.0.1:8766/index.html';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 await context.addInitScript(()=>{
  window.__FLOPPY_CLOUD_CONFIG__={url:'https://mock.supabase.co',publishableKey:'test-publishable'};
  const oldProject={id:'device-old',name:'Device idea',subtitle:'Local only',context:'Local thought',problem:'Local thought',audience:'One person',stage:0,chapter:0,notes:[],history:[],done:{},projectArt:{sourceUrl:'art/orbit.png',crop:{x:0.5,y:0.5,zoom:1}}};
  if(!localStorage.getItem('floppy-projects-v3'))localStorage.setItem('floppy-projects-v3',JSON.stringify({version:4,projects:[oldProject],active:'device-old'}));
  window.supabase={createClient:()=>{
   let listener=null;
   const user=()=>localStorage.getItem('__mock-user')?{id:'user-one',email:'founder@example.com'}:null;
   const record=()=>JSON.parse(localStorage.getItem('__mock-cloud')||'null');
   return {
    auth:{getUser:async()=>({data:{user:user()},error:null}),onAuthStateChange:callback=>{listener=callback;return {data:{subscription:{unsubscribe(){}}}};},signInWithOtp:async()=>{localStorage.setItem('__mock-user','yes');setTimeout(()=>listener?.('SIGNED_IN',{user:user()}),0);return {error:null};},signOut:async()=>{localStorage.removeItem('__mock-user');listener?.('SIGNED_OUT',null);return {error:null};}},
    from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='floppy_collections'?record():localStorage.getItem('__mock-vault')?{last_four:'TEST'}:null,error:null})})})}),
    rpc:async(_,args)=>{const old=record(),revision=old?.revision||0;if(args.expected_revision!==revision)return {data:null,error:{code:'40001',message:'conflict'}};localStorage.setItem('__mock-cloud',JSON.stringify({snapshot:args.next_snapshot,revision:revision+1}));return {data:revision+1,error:null};},
    functions:{invoke:async(_,{body})=>{if(body.action==='status')return {data:{hasKey:!!localStorage.getItem('__mock-vault'),lastFour:'TEST'},error:null};if(body.action==='save'){localStorage.setItem('__mock-vault','present');return {data:{hasKey:true,lastFour:'TEST'},error:null};}if(body.action==='test')return {data:{connected:true},error:null};return {data:{candidates:[{content:{parts:[{text:'{}'}]}}]},error:null};}}
   };
  }};
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#authGate').waitFor({state:'visible'});
 await page.screenshot({path:path.join(os.tmpdir(),'floppy-cloud-sign-in.png')});
 assert.equal(await page.locator('#library').isVisible(),false);
 await page.locator('#authEmail').fill('founder@example.com');
 await page.locator('#authForm button[type="submit"]').click();
 await page.locator('#authGate').waitFor({state:'hidden'});
 assert.equal(await page.locator('.empty-projects').isVisible(),true);
 await page.screenshot({path:path.join(os.tmpdir(),'floppy-cloud-empty.png')});
 await page.locator('#newProject').click();
 await page.locator('#newContext').fill('A quiet place to collect and develop independent film ideas.');
 await page.locator('#createIdea').click();
 await page.waitForFunction(()=>document.querySelector('#saveState')?.textContent==='Saved to account');
 const before=await page.evaluate(()=>({cloud:JSON.parse(localStorage.getItem('__mock-cloud')),device:JSON.parse(localStorage.getItem('floppy-projects-v3'))}));
 assert.equal(before.cloud.snapshot.projects.length,1);
 assert.equal(before.cloud.snapshot.projects[0].idea.rawIdea,'A quiet place to collect and develop independent film ideas.');
 assert.equal(before.device.projects[0].name,'Device idea');
 await page.locator('#settingsButton').click();
 await page.locator('#settingsKey').fill('ABCDEFGHIJKLMNOPQRSTUVWX');
 await page.locator('#saveSettings').click();
 await page.locator('#maskedKey').waitFor({state:'visible'});
 assert.match(await page.locator('#maskedKey').textContent(),/TEST$/);
 await page.locator('#settingsDialog .dialog-top button').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#authGate').waitFor({state:'hidden'});
 assert.equal(await page.locator('#projectTitle').isVisible(),false);
 assert.match(await page.locator('#resumeSubtitle').textContent(),/independent film ideas/);
 await page.locator('#settingsButton').click();
 assert.match(await page.locator('#maskedKey').textContent(),/TEST$/);
 await page.locator('#settingsDialog .dialog-top button').click();
 await page.evaluate(()=>localStorage.removeItem('__mock-cloud'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#authGate').waitFor({state:'hidden'});
 await page.locator('#accountButton').click();
 assert.equal(await page.locator('#importLocal').isVisible(),true);
 await page.locator('#importLocal').click();
 await page.waitForFunction(()=>document.querySelector('#saveState')?.textContent==='Saved to account');
 const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('__mock-cloud')).snapshot.projects[0].name);
 assert.equal(imported,'Device idea');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'Account journey passed',cloudProjects:before.cloud.snapshot.projects.length,deviceProjectPreserved:before.device.projects[0].name,keyRestored:true,imported,errors}));
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
