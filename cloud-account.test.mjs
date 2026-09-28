import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudCollection,validCollection,signInWithGoogle} from './cloud-account.mjs';
import {ACCOUNT_GEMINI_KEY,setAccountGeminiGateway,generateWorkingIdea,verifyGeminiKey} from './identity.js';

const snapshot=(name='One')=>({version:4,active:'one',projects:[{id:'one',name,projectArt:{sourceUrl:'art/orbit.png'}}]});
test('cloud snapshots exclude malformed collection shapes',()=>{
 assert.equal(validCollection(snapshot()),true);
 assert.equal(validCollection({...snapshot(),projects:[{id:'one',name:'One'}]}),false);
});
test('Google sign-in uses the configured Supabase OAuth redirect',async()=>{
 const calls=[];
 await signInWithGoogle({auth:{signInWithOAuth:async options=>{calls.push(options);return {error:null};}}},'https://floppy.example.com/');
 assert.deepEqual(calls,[{provider:'google',options:{redirectTo:'https://floppy.example.com/'}}]);
});
test('cloud load leaves an empty account empty and never imports local data automatically',async()=>{
 const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})};
 const cloud=new CloudCollection(client,'person');assert.deepEqual(await cloud.load(),{version:4,projects:[],active:''});
});
test('cloud writes use a revision and serialize a newer pending edit',async()=>{
 const calls=[];let release;
 const client={rpc:async(_,args)=>{calls.push(args);if(calls.length===1)await new Promise(resolve=>release=resolve);return {data:calls.length,error:null};}};
 const cloud=new CloudCollection(client,'person');cloud.queue(snapshot('First'));const first=cloud.flush();cloud.queue(snapshot('Second'));release();await first;await cloud.flush();cloud.stop();
 assert.deepEqual(calls.map(call=>[call.expected_revision,call.next_snapshot.projects[0].name]),[[0,'First'],[1,'Second']]);
});
test('revision conflicts retain pending data and stop automatic retries',async()=>{
 const states=[],client={rpc:async()=>({data:null,error:{code:'40001',message:'conflict'}})};
 const cloud=new CloudCollection(client,'person',(state,message)=>states.push([state,message]));cloud.queue(snapshot());await cloud.flush();
 assert.equal(cloud.conflicted,true);assert.equal(cloud.pending.projects[0].name,'One');assert.equal(states.at(-1)[0],'error');cloud.stop();
});
test('account Gemini uses the vault gateway without sending or returning the saved key',async()=>{
 const calls=[];setAccountGeminiGateway(async request=>{calls.push(request);return request.action==='test'?{connected:true}:{candidates:[{content:{parts:[{text:JSON.stringify({workingIdea:'A quiet place for independent film ideas.',needsClarification:false,followUp:''})}]}}]};});
 try{
  assert.equal(await verifyGeminiKey({key:ACCOUNT_GEMINI_KEY}),true);
  const result=await generateWorkingIdea({key:ACCOUNT_GEMINI_KEY,rawIdea:'A quiet place for independent film ideas.'});
  assert.equal(result.workingIdea,'A quiet place for independent film ideas.');
  assert.deepEqual(calls.map(call=>call.action),['test','generate']);
  assert.equal(JSON.stringify(calls).includes('x-goog-api-key'),false);
 }finally{setAccountGeminiGateway(null);}
});
