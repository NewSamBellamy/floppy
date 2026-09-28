import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterFlow } from './chapter-intelligence.mjs';

const chapters = [
  { name: 'Idea', question: 'What are we creating?' },
  { name: 'Problem', question: 'What problem exists?' },
  { name: 'Audience', question: 'Who experiences it?' },
  { name: 'Alternatives', question: 'What do people do today?' },
];

function project() {
  return {
    name: 'Pocket Garden',
    productName: 'Sproutline',
    chapter: 1,
    idea: { rawIdea: 'A tiny garden planner', confirmedVersion: 'A calm planner for small-space gardening.', status: 'resolved' },
    answers: { 0: { text: 'A tiny garden planner' }, 1: { text: 'Old unsaved draft' }, 2: { text: 'Future audience draft' } },
    resolved: { 0: { resolvedAt: '2026-01-01' } },
    contexts: [
      { id: 'idea-note', chapterKey: '0', title: 'Idea note', text: 'People forget when to water.' },
      { id: 'problem-note', chapterKey: '1', title: 'Interview note', text: 'Three neighbors mentioned confusing care schedules.' },
      { id: 'audience-note', chapterKey: '2', title: 'Audience note', text: 'A useful detail about new gardeners.' },
      { id: 'future-note', chapterKey: '3', title: 'Future note', text: 'A later chapter detail.' },
    ],
  };
}

test('Problem proposal context includes confirmed Idea and Idea context, not unconfirmed drafts', () => {
  const flow = chapterFlow(project(), 1, chapters);
  assert.match(flow.context, /PRODUCT NAME \(founder-provided, untrusted data\): "Sproutline"/);
  assert.match(flow.context, /A calm planner for small-space gardening/);
  assert.match(flow.context, /People forget when to water/);
  assert.match(flow.context, /CURRENT PROBLEM CANDIDATE \(not confirmed\): Old unsaved draft/);
  assert.doesNotMatch(flow.context, /Future audience draft/);
  assert.deepEqual(flow.sources.map(source => source.id), ['idea-note', 'problem-note']);
});

test('Audience proposal context includes confirmed Problem and research sources', () => {
  const p = project();
  p.answers[1] = { text: 'Small-space gardeners cannot tell what needs attention this week.' };
  p.resolved[1] = { resolvedAt: '2026-01-02' };
  const flow = chapterFlow(p, 2, chapters);
  assert.match(flow.context, /Small-space gardeners cannot tell what needs attention this week/);
  assert.match(flow.context, /Three neighbors mentioned confusing care schedules/);
  assert.match(flow.context, /A useful detail about new gardeners/);
  assert.doesNotMatch(flow.context, /A later chapter detail/);
  assert.deepEqual(flow.sources.map(source => source.id), ['idea-note', 'problem-note', 'audience-note']);
});

test('proposal and editable draft stay distinct from the human-confirmed answer', () => {
  const p = project();
  const flow = chapterFlow(p, 1, chapters);
  flow.saveProposal({ text: 'People lack a clear weekly care routine.', evidenceSignal: 'Starting hypothesis' });
  flow.saveDraft('People with small gardens miss care tasks during busy weeks.');
  assert.equal(p.answers[1].text, 'Old unsaved draft');
  assert.equal(flow.state.proposal.text, 'People lack a clear weekly care routine.');
  assert.equal(flow.state.draftText, 'People with small gardens miss care tasks during busy weeks.');

  flow.confirm(flow.state.draftText, '2026-01-03T00:00:00.000Z');
  assert.equal(p.answers[1].text, 'People with small gardens miss care tasks during busy weeks.');
  assert.equal(p.resolved[1].date, '2026-01-03T00:00:00.000Z');
  assert.equal(p.problem, p.answers[1].text);
  assert.equal(p.chapter, 2);
  assert.equal(flow.state.proposal.text, 'People lack a clear weekly care routine.');
});

test('repeated chapter-flow reads preserve one canonical state object for UI handlers', () => {
  const p = project();
  const renderedFlow = chapterFlow(p, 1, chapters);
  chapterFlow(p, 1, chapters);
  assert.equal(renderedFlow.state, p.chapterIntelligence[1]);
  renderedFlow.state.editing = true;
  renderedFlow.saveDraft('A new editable candidate that must persist.');
  assert.equal(p.chapterIntelligence[1].editing, true);
  assert.equal(p.chapterIntelligence[1].draftText, 'A new editable candidate that must persist.');
});

test('investigation view persists without replacing a proposal or confirmed answer', () => {
  const p = project();
  const flow = chapterFlow(p, 1, chapters);
  flow.saveProposal({ text: 'Current candidate' });
  flow.setView('investigation');
  assert.equal(p.chapterIntelligence[1].view, 'investigation');
  assert.equal(flow.state.proposal.text, 'Current candidate');
  assert.throws(() => flow.setView('chat'), /view/i);
});

test('evidence signal is qualitative and never a numeric confidence score', () => {
  const flow = chapterFlow(project(), 1, chapters);
  assert.equal(typeof flow.evidenceSignal, 'string');
  assert.doesNotMatch(flow.evidenceSignal, /\b\d+(?:\.\d+)?%?\b/);
});

test('bounded context retains later decisions, current draft, and every source excerpt', () => {
  const p = project();
  p.idea.rawIdea = 'Original detail. '.repeat(750);
  p.answers[1] = { text: 'Confirmed problem. '.repeat(600) };
  p.resolved[1] = { date: '2026-01-02' };
  p.contexts[0].text = 'Early source detail. '.repeat(600);
  const flow = chapterFlow(p, 2, chapters);
  assert.ok(flow.context.length <= 14000);
  assert.match(flow.context, /CONFIRMED PROBLEM/);
  assert.match(flow.context, /CURRENT AUDIENCE CANDIDATE/);
  assert.match(flow.context, /Three neighbors mentioned/);
  assert.match(flow.context, /A useful detail about new gardeners/);
  assert.match(flow.context, /idea-note/);
  assert.equal(p.contexts[0].text, 'Early source detail. '.repeat(600));
});

test('later chapters inherit synthesis and uncertainty explicitly as unconfirmed interpretation', () => {
  const p = project();
  const problem = chapterFlow(p, 1, chapters);
  problem.saveResearchProposal({ proposedValue: 'Weekly reminders may help.', contradictions: ['Some gardeners already have routines.'], unresolvedQuestions: ['Do reminders help?'], sourceIds: ['problem-note'] });
  problem.saveDraft('A weekly reminder hypothesis.');
  problem.confirm('Care schedules are confusing.');
  const audience = chapterFlow(p, 2, chapters);
  assert.match(audience.context, /FLOPPY SYNTHESIS.*not confirmed.*Weekly reminders may help/);
  assert.match(audience.context, /Some gardeners already have routines/);
  assert.match(audience.context, /Do reminders help/);
  assert.equal(audience.confirmed.find(item => item.name === 'Problem').value, 'Care schedules are confusing.');
});

test('restored proposal-only and research-only records recover their draft without confirming it', () => {
  for (const record of [{ proposal: { text: 'Restored proposal.' } }, { researchProposal: { proposedValue: 'Restored research.' } }]) {
    const p = project();
    p.chapterIntelligence = { 2: record };
    const flow = chapterFlow(p, 2, chapters);
    assert.equal(flow.state.draftText, record.proposal?.text || record.researchProposal.proposedValue);
    assert.equal(p.answers[2].text, 'Future audience draft');
    assert.equal(p.resolved[2], undefined);
    flow.saveDraft('');
    assert.equal(chapterFlow(p, 2, chapters).currentCandidate, '');
  }
});

test('invalid synthesis cannot replace a saved synthesis, and citations must reference actual sources', () => {
  const p = project();
  const flow = chapterFlow(p, 1, chapters);
  flow.saveResearchProposal({ proposedValue: 'Research candidate.', sourceIds: ['problem-note', 'invented', 'problem-note'], unresolvedQuestions: [] });
  assert.deepEqual(flow.state.researchProposal.sourceIds, ['problem-note']);
  const before = JSON.stringify(p);
  for (const invalid of [null, [], {}, { proposedValue: '   ' }]) {
    assert.throws(() => flow.saveResearchProposal(invalid), /research proposal/i);
    assert.equal(JSON.stringify(p), before);
  }
});

test('legacy Idea confirmation preserves original human input and proposal uncertainty', () => {
  const p = project();
  p.idea = { workingIdea: 'Interpreted idea.', status: 'drafted' };
  const flow = chapterFlow(p, 0, chapters);
  flow.saveProposal({ text: 'A concise interpretation.', openQuestions: ['Which care tasks?'] });
  flow.confirm('The accepted interpretation.');
  assert.equal(p.idea.rawIdea, 'A tiny garden planner');
  assert.equal(p.answers[0].text, 'A tiny garden planner');
  assert.equal(p.resolved[0].uncertain, true);
});

test('malformed and negative chapter sources do not break or contaminate accumulated context', () => {
  const p = project();
  p.contexts.push(null, { id: 'invalid', chapterKey: -1, text: 'Invalid chapter.' });
  const flow = chapterFlow(p, 1, chapters);
  assert.deepEqual(flow.sources.map(source => source.id), ['idea-note', 'problem-note']);
});

test('founder intent travels intact outside the bounded research-excerpt context', () => {
  const p=project();
  p.idea.rawIdea='The founder wants an offline desktop product. '+ 'Detailed requirement. '.repeat(400)+' Must support PDF annotation, not a chatbot.';
  p.idea.clarificationResponse='No accounts or cloud sync in the first version.';
  const flow=chapterFlow(p,3,chapters);
  assert.equal(flow.founderIntent.originalIdea,p.idea.rawIdea);
  assert.equal(flow.founderIntent.clarification,p.idea.clarificationResponse);
  assert.ok(flow.context.length<=14000);
});
