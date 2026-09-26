import test from 'node:test';
import assert from 'node:assert/strict';
import { generateArtwork, generateChapterProposal, generateWorkBrief, synthesizeChapterEvidence, generateProductDirections } from './identity.js';

const key = 'local_test_key_123456';

test('product directions are bounded suggestions, with real citations and the founder draft passed intact',async()=>{
 await withGeminiResponse({directions:[{label:'Quiet and precise',fields:{name:'Margin',positioning:'An offline reading companion.',qualities:'Thoughtful, precise',avoid:'Cloud-first promises'},sourceIds:['real','fake'],openQuestions:['Is the name distinctive?']}]},async request=>{
  const draft={fields:{name:'Margin',positioning:'My preferred promise',qualities:'',avoid:''}};
  const result=await generateProductDirections({key,index:9,project:{name:'Margin'},founderIntent:{originalIdea:'Offline PDF annotations'},confirmedState:[],draft,context:'Interview notes',sources:[{id:'real',title:'Interview'}]});
  assert.equal(result.length,1);assert.deepEqual(result[0].sourceIds,['real']);
  assert.equal(draft.fields.positioning,'My preferred promise');
  assert.match(request().body.contents[0].parts[0].text,/Offline PDF annotations/);
  assert.match(request().body.contents[0].parts[0].text,/My preferred promise/);
  assert.match(request().body.contents[0].parts[0].text,/not decisions/i);
 });
});

async function withGeminiResponse(value, run) {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }) };
  };
  try { return await run(() => captured); }
  finally { globalThis.fetch = originalFetch; }
}

test('chapter proposal is sourced, distinguishes confirmed state, and filters invented source IDs', async () => {
  await withGeminiResponse({ candidate: 'A clear proposed problem statement.', openQuestions: ['Does this happen often?'], sourceIds: ['source-1', 'invented'] }, async request => {
    const proposal = await generateChapterProposal({
      key, project: { name: 'Garden' }, chapter: { name: 'Problem', question: 'What hurts?' },
      confirmedState: [{ name: 'Idea', value: 'A care planner' }], currentCandidate: 'Early draft',
      context: 'Idea note: missed watering.', sources: [{ id: 'source-1', title: 'Note', kind: 'NOTE' }],
    });
    assert.equal(proposal.candidate, 'A clear proposed problem statement.');
    assert.deepEqual(proposal.sourceIds, ['source-1']);
    const sent = JSON.stringify(request().body);
    assert.match(sent, /human-approved foundation/);
    assert.match(sent, /Early draft/);
    assert.match(sent, /missed watering/);
  });
});

test('chapter proposal generation accepts later Phase 1 chapters and applies their specific focus', async () => {
  await withGeminiResponse({ candidate: 'People switch between notes and gardening apps.', openQuestions: ['Which workaround is most common?'], sourceIds: [] }, async request => {
    const proposal = await generateChapterProposal({
      key, project: { name: 'Garden' }, chapter: { name: 'Alternatives', question: 'How do people handle this today?' },
      confirmedState: [{ name: 'Problem', value: 'Care tasks are scattered.' }], currentCandidate: '', context: 'Confirmed problem: care tasks are scattered.',
    });
    assert.equal(proposal.candidate, 'People switch between notes and gardening apps.');
    assert.match(JSON.stringify(request().body), /manual workarounds/);
  });
});

test('research synthesis passes supported PDF/image files as bounded inline data', async () => {
  await withGeminiResponse({ proposedValue: 'A research-backed draft.', strongestEvidence: ['Interview note'], contradictions: [], affectedPeople: [], alternatives: [], unresolvedQuestions: [], sourceIds: ['source-1'] }, async request => {
    const synthesis = await synthesizeChapterEvidence({
      key, project: { name: 'Garden' }, chapter: { name: 'Problem', question: 'What hurts?' },
      sources: [{ id: 'source-1', title: 'Photo' }], returnedWork: 'Observed care label.',
      files: [{ mimeType: 'image/jpeg', data: 'YWJj' }],
    });
    assert.equal(synthesis.proposedValue, 'A research-backed draft.');
    const inline = request().body.contents[0].parts.find(part => part.inlineData);
    assert.deepEqual(inline.inlineData, { mimeType: 'image/jpeg', data: 'YWJj' });
  });
});

test('work brief carries PDFs and always includes the seven required return items', async () => {
  await withGeminiResponse({ objective: 'Investigate one focused question.', investigationQuestions: ['q1', 'q2', 'q3', 'q4', 'q5'], evidenceToSeek: ['evidence'], deliverables: ['return'], falsificationQuestions: ['could this be wrong?'] }, async request => {
    const brief = await generateWorkBrief({ key, project: { title: 'Garden' }, chapter: { name: 'Problem', question: 'What hurts?' }, context: 'Confirmed idea.', files: [{ mimeType: 'application/pdf', data: 'YWJj' }] });
    assert.equal(brief.requiredReturnOutput.length, 7);
    assert.match(brief.requiredReturnOutput[0], /problem statement/i);
    assert.match(brief.requiredReturnOutput[6], /source names and links/i);
    assert.deepEqual(request().body.contents[0].parts.find(part => part.inlineData).inlineData, { mimeType: 'application/pdf', data: 'YWJj' });
  });
});

test('work briefs use a chapter-specific output contract beyond Problem and Audience', async () => {
  await withGeminiResponse({ objective: 'Map the assumptions that could change this product.', investigationQuestions: ['q1', 'q2', 'q3', 'q4', 'q5'], evidenceToSeek: ['Observed behavior'], deliverables: ['Assumption map'], falsificationQuestions: ['What would disprove it?'] }, async request => {
    const brief = await generateWorkBrief({ key, project: { title: 'Garden' }, chapter: { name: 'Assumptions', question: 'What must be true?' }, context: 'Confirmed idea: a small garden planner.' });
    assert.equal(brief.requiredReturnOutput.length, 7);
    assert.match(brief.requiredReturnOutput[0], /assumption/i);
    assert.match(brief.requiredReturnOutput.join(' '), /falsif|disconfirm|validation/i);
    assert.match(JSON.stringify(request().body), /riskiest assumption/i);
  });
});

test('research briefs distinguish founder intent from inference and never presuppose an unchosen implementation', async () => {
 await withGeminiResponse({objective:'Test the current uncertainty.',investigationQuestions:['q1','q2','q3','q4','q5'],evidenceToSeek:['Evidence'],deliverables:['Findings'],falsificationQuestions:['What would disprove it?']},async request=>{
  const originalIdea='An offline annotation tool. '+'Specific founder detail. '.repeat(300)+' Retain handwritten margin notes.';
  await generateWorkBrief({key,project:{title:'Margin',founderIntent:{originalIdea,clarification:'No cloud account.'},openQuestions:['Do users need offline access?']},chapter:{name:'First Product',question:'What is the smallest useful version?'},context:'AI-inferred: a web dashboard.'});
  const prompt=request().body.contents[0].parts[0].text;
  assert.ok(prompt.includes(originalIdea));
  assert.match(prompt,/Do not presuppose/i);
  assert.match(prompt,/founder-stated.*AI-inferred.*unknown/is);
  assert.match(prompt,/current uncertainty/i);
 });
});

test('image generation sends the editable prompt, optional project context, and chosen reference images', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'YWJj' } }] } }] }) };
  };
  try {
    await assert.rejects(generateArtwork({
      key,
      prompt: 'A quiet botanical atlas with a single amber seed.',
      projectContext: 'A calm planner for small-space gardening.',
      references: [{ mimeType: 'image/jpeg', data: 'YWJj', title: 'Current disk art' }],
    }), /invalid|unsupported/i);
    const parts = captured.body.contents[0].parts;
    assert.match(parts[0].text, /A quiet botanical atlas/);
    assert.match(parts[0].text, /small-space gardening/);
    assert.match(parts[0].text, /final 2:1 crop window/);
    assert.match(parts[0].text, /simple clear silhouette/);
    assert.match(parts[0].text, /unless the user explicitly asks/);
    assert.deepEqual(parts[1].inlineData, { mimeType: 'image/jpeg', data: 'YWJj' });
    assert.equal(captured.body.generationConfig.responseFormat.image.aspectRatio, '16:9');
  } finally { globalThis.fetch = originalFetch; }
});
