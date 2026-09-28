import test from 'node:test';
import assert from 'node:assert/strict';
import { generateArtwork, startDeepResearch, startFocusedResearch, getDeepResearch, generateDiscoverySynthesis, assessDiscoveryInterview, generateDiscoverySectionEdit, generateWorkingIdea } from './identity.js';

const KEY = 'AIzaSyabcdefghijklmnop';
const PNG = 'iVBORw0KGgo=';

test('focused research requests Google Search and preserves provider citations', async()=>{
 const original=globalThis.fetch;let body;
 globalThis.fetch=async(_,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({id:'focused-one',steps:[{type:'model_output',content:[{type:'text',text:'A bounded report.',annotations:[{type:'url_citation',url:'https://example.org/study',title:'Study'}]}]},{type:'google_search_result',result:[{search_suggestions:'<div>Search suggestions</div>'}]}]}));};
 try{
  const result=await startFocusedResearch({key:KEY,input:'Research the audience and alternatives for a proof approval app for designers.'});
  assert.deepEqual(body.tools,[{type:'google_search'}]);assert.equal(body.agent,undefined);
  assert.equal(result.text,'A bounded report.');assert.equal(result.sources[0].url,'https://example.org/study');assert.match(result.searchSuggestions,/Search suggestions/);
 }finally{globalThis.fetch=original;}
});

test('adaptive assessment includes current answers and permits an early finish', async () => {
  const original = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ready:true,nextQuestion:'',reason:'The prototype outcome and audience are clear.',remainingEstimate:0,coverage:[{area:'audience',status:'clear',note:'Independent designers'}]})}]}}]}));
  };
  try {
    const result = await assessDiscoveryInterview({key:KEY,context:'The founder wants to help independent designers approve one proof.',previousQuestions:['What should the prototype prove?']});
    assert.equal(result.ready,true);
    assert.equal(result.remainingEstimate,0);
    assert.equal(result.coverage[0].status,'clear');
    assert.match(sent.contents[0].parts[0].text,/independent designers/);
    assert.match(sent.contents[0].parts[0].text,/What should the prototype prove/);
  } finally { globalThis.fetch=original; }
});

test('adaptive assessment rejects missing next question without inventing one', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({ready:false,nextQuestion:'',coverage:[]})}]}}]}));
  try { await assert.rejects(assessDiscoveryInterview({key:KEY,context:'An idea'}),/next question/); }
  finally { globalThis.fetch=original; }
});

test('section editing sends the requested change through the model transport', async () => {
  const original=globalThis.fetch;
  let sent;
  globalThis.fetch=async(_,options)=>{
    sent=JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({response:'Narrowed the scope.',proposedSummary:'One proof approval',proposedDetails:['Review one proof'],proposedOpenQuestions:[]})}]}}]}));
  };
  try {
    const result=await generateDiscoverySectionEdit({key:KEY,project:{name:'Workspace title',productName:'Fieldnotes'},section:{id:'features'},request:'Remove team accounts'});
    assert.equal(result.proposedSummary,'One proof approval');
    assert.match(sent.contents[0].parts[0].text,/Remove team accounts/);
    assert.match(sent.contents[0].parts[0].text,/"productName":"Fieldnotes"/);
  } finally { globalThis.fetch=original; }
});

function installImageStubs(fetchImpl) {
  const original = {
    fetch: globalThis.fetch,
    Image: globalThis.Image,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
  };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return fetchImpl();
  };
  globalThis.URL.createObjectURL = () => 'blob:test';
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.Image = class {
    constructor() { this.naturalWidth = 2; this.naturalHeight = 2; }
    set src(value) { if (value) queueMicrotask(() => this.onload?.()); }
  };
  return { calls, restore() {
    globalThis.fetch = original.fetch;
    globalThis.Image = original.Image;
    globalThis.URL.createObjectURL = original.createObjectURL;
    globalThis.URL.revokeObjectURL = original.revokeObjectURL;
  } };
}

test('art generation labels the current artwork as an edit reference', async () => {
  const stub = installImageStubs(() => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG } }] } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } }));
  try {
    await generateArtwork({
      key: KEY,
      prompt: 'Make the background warmer and keep the central symbol.',
      projectContext: 'Project: Floppy',
      references: [{ mimeType: 'image/png', data: PNG, title: 'Current disk artwork', type: 'current' }],
    });
    const request = stub.calls[0];
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent');
    assert.match(request.body.contents[0].parts[0].text, /current disk artwork/i);
    assert.equal(request.body.contents[0].parts[1].inlineData.mimeType, 'image/png');
    assert.deepEqual(request.body.generationConfig.responseModalities, ['IMAGE']);
    assert.equal(request.body.generationConfig.responseFormat.image.aspectRatio, '16:9');
  } finally {
    stub.restore();
  }
});

test('the first Working Idea synthesis uses the founder-provided product name',async()=>{
 const original=globalThis.fetch;let body;
 globalThis.fetch=async(_,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({workingIdea:'A clear product direction.',needsClarification:false,followUp:''})}]}}]}));};
 try{
  await generateWorkingIdea({key:KEY,rawIdea:'A small useful idea.',productName:'Fieldnotes'});
  assert.match(body.contents[0].parts[0].text,/PRODUCT NAME \(founder-provided, untrusted data; keep it consistent and do not rename it\): "Fieldnotes"/);
 }finally{globalThis.fetch=original;}
});

test('art generation explains that image quota or billing is the blocker', async () => {
  const stub = installImageStubs(() => new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }), { status: 429 }));
  try {
    await assert.rejects(
      generateArtwork({ key: KEY, prompt: 'A retro orange comet', projectContext: 'Project: Floppy' }),
      /image-generation quota.*billing/i,
    );
  } finally {
    stub.restore();
  }
});

test('deep research starts as a stored background interaction', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: 'interaction-1', status: 'in_progress' }), { status: 200 });
  };
  try {
    const result = await startDeepResearch({ key: KEY, input: 'Research the problem, audience, alternatives, evidence, and risks for this product idea.' });
    assert.equal(result.id, 'interaction-1');
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.body.agent, 'deep-research-preview-04-2026');
    assert.equal(request.body.background, true);
    assert.equal(request.body.store, true);
    assert.equal(request.body.agent_config.type, 'deep-research');
  } finally { globalThis.fetch = originalFetch; }
});

test('deep research polling extracts the completed report text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: 'interaction-1', status: 'completed', steps: [{ content: [{ text: 'A cited research report.' }] }],
  }), { status: 200 });
  try {
    const result = await getDeepResearch({ key: KEY, id: 'interaction-1' });
    assert.equal(result.status, 'completed');
    assert.equal(result.text, 'A cited research report.');
  } finally { globalThis.fetch = originalFetch; }
});

test('discovery synthesis uses the standard Gemini model after research', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      northStar: 'Make the first useful path obvious.',
      sections: Array.from({ length: 11 }, (_, index) => ({ id: ['idea', 'problem', 'audience', 'alternatives', 'evidence', 'assumptions', 'first-product', 'product', 'features', 'identity', 'design'][index], label: 'Section', summary: 'Summary', details: [], evidence: [], openQuestions: [], status: 'inferred' })),
    }) }] } }] }), { status: 200 });
  };
  try {
    const result = await generateDiscoverySynthesis({ key: KEY, project: { name: 'Pocket signal' }, interview: 'Founder interview', researchReport: 'Research report' });
    assert.equal(result.northStar, 'Make the first useful path obvious.');
    assert.equal(result.sections.length, 11);
    assert.match(request.url, /gemini-3\.8-flash:generateContent$/);
    assert.match(request.body.contents[0].parts[0].text, /Research report/);
  } finally { globalThis.fetch = originalFetch; }
});
