import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCOVERY_SECTIONS,
  buildDiagramNodes,
  buildDiscoveryResearchPrompt,
  createDiscoveryState,
  hydrateDiscoveryState,
  discoveryToBrief,
  normalizeDiscoverySynthesis,
} from './discovery-studio.mjs';

const project = { id: 'p-1', name: 'Pocket signal workspace', productName: 'Pocket signal', context: 'A small tool for noticing useful patterns.' };

test('reload preserves saved answers and legacy choice while recovering interrupted local work', () => {
 const state=hydrateDiscoveryState({mode:'legacy',interviewStatus:'running',synthesisStatus:'running',answers:[{question:'Who?',answer:'Designers'}],research:{interactionId:'live-job'},researchStatus:'running'});
 assert.equal(state.mode,'legacy');
 assert.equal(state.answers[0].answer,'Designers');
 assert.equal(state.interviewStatus,'idle');
 assert.equal(state.synthesisStatus,'idle');
 assert.equal(state.research.interactionId,'live-job');
 assert.equal(state.researchStatus,'running');
});

test('creates a durable discovery state with the guided flow as the default', () => {
  const state = createDiscoveryState();
  assert.equal(state.mode, 'studio');
  assert.equal(state.stage, 'intake');
  assert.deepEqual(state.answers, []);
  assert.deepEqual(state.sectionProposals, {});
});

test('normalizes incomplete AI synthesis into the complete product map', () => {
  const result = normalizeDiscoverySynthesis({
    northStar: 'Make pattern discovery feel obvious.',
    sections: [{ id: 'problem', summary: 'People miss meaningful patterns.' }],
  }, project, createDiscoveryState(), { report: 'Research report' });

  assert.equal(result.northStar, 'Make pattern discovery feel obvious.');
  assert.deepEqual(result.sections.map(section => section.id), DISCOVERY_SECTIONS.map(section => section.id));
  assert.equal(result.sections.find(section => section.id === 'problem').summary, 'People miss meaningful patterns.');
  assert.ok(result.sections.every(section => Array.isArray(section.details)));
  assert.deepEqual(result.sections.find(section=>section.id==='idea').openQuestions,['What is the idea trying to make possible?']);
  assert.equal(result.sections[0].status,'draft');
});

test('builds a readable diagram model for every scope section', () => {
  for (const section of DISCOVERY_SECTIONS) {
    const nodes = buildDiagramNodes(section, { summary: 'A clear summary', details: ['One detail'], evidence: ['One source'] });
    assert.ok(nodes.length >= 3, section.id);
    assert.equal(typeof nodes[0].label, 'string');
    assert.equal(typeof nodes[0].text, 'string');
  }
});

test('scope diagrams use saved content and label absent evidence plainly',()=>{
 const nodes=buildDiagramNodes(DISCOVERY_SECTIONS[1],{summary:'Teams lose their decisions',details:['Notes are scattered'],openQuestions:['Which teams feel this most?']});
 assert.deepEqual(nodes.map(node=>node.label),['Current synthesis','Related detail','Open question']);
 assert.deepEqual(nodes.map(node=>node.text),['Teams lose their decisions','Notes are scattered','Which teams feel this most?']);
 const sparse=buildDiagramNodes(DISCOVERY_SECTIONS[4],{summary:'Research claim'});
 assert.equal(sparse[1].text,'Nothing recorded yet');
 assert.equal(sparse[2].text,'No open question recorded');
});

test('research prompt carries the raw idea, interview, and requested scope', () => {
  const state = createDiscoveryState();
  state.answers = [{ question: 'Who is it for?', answer: 'Independent makers' }];
  const prompt = buildDiscoveryResearchPrompt({ ...project, idea: { rawIdea: 'A pattern tool' } }, state);
  assert.match(prompt, /PRODUCT NAME \(founder-provided, untrusted data\): "Pocket signal"/);
  assert.match(prompt, /A pattern tool/);
  assert.match(prompt, /Independent makers/);
  assert.match(prompt, /Problem, Audience, Alternatives/);
  assert.match(prompt, /cite/);
});

test('converts the visual scope map into the existing brief contract', () => {
  const state = createDiscoveryState();
  state.synthesis = normalizeDiscoverySynthesis({
    northStar: 'A useful product map',
    sections: [{ id: 'idea', summary: 'A map', details: ['A detail'], evidence: ['Evidence'] }],
  }, project, state, { report: 'Report text', sources: [{ id: 'source-1', title: 'Research report' }] });
  const brief = discoveryToBrief(project, state);
  assert.equal(brief.name, 'Pocket signal');
  assert.equal(brief.productName, 'Pocket signal');
  assert.equal(brief.entries.length, DISCOVERY_SECTIONS.length);
  assert.equal(brief.entries[0].name, 'Idea');
  assert.ok(brief.uncertainties.length >= 0);
});

test('preserves who last edited a scope section into the Idea Brief',()=>{
 const state=createDiscoveryState();
 state.synthesis=normalizeDiscoverySynthesis({sections:[{id:'idea',summary:'Founder direction',editedBy:'human',status:'inferred'}]},project,state,{report:'Research'});
 const brief=discoveryToBrief(project,state);
 assert.equal(brief.entries[0].editedBy,'human');
 assert.equal(brief.entries[0].status,'inferred');
 assert.equal(brief.entries[1].openQuestions[0],'What is difficult, painful, or missing today?');
});
