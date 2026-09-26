import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterInvestigationSpec, createInvestigation } from './chapter-investigation.mjs';
import { chapterFlow } from './chapter-intelligence.mjs';

const chapters = [
  'Idea', 'Problem', 'Audience', 'Alternatives', 'Evidence', 'Assumptions',
  'First Product', 'Product', 'Features', 'Identity', 'Design', 'Idea Brief', 'Readiness',
].map(name => ({ name, question: `What matters for ${name.toLowerCase()}?` }));

test('every Phase 1 chapter has a distinct investigation focus and seven-item output contract', () => {
  const specs = chapters.map(chapter => chapterInvestigationSpec(chapter));
  assert.equal(specs.length, 13);
  for (const spec of specs) {
    assert.ok(spec.objective.length > 30);
    assert.equal(spec.requiredReturnOutput.length, 7);
    assert.ok(spec.requiredReturnOutput.every(item => item.length > 15));
  }
  assert.notEqual(specs[0].objective, specs[1].objective);
  assert.match(specs[0].focus, /ambiguity|analog/i);
  assert.match(specs[3].focus, /workaround|substitute|competitor/i);
  assert.match(specs[12].focus, /Prototype|blocker|risk/i);
  assert.throws(() => chapterInvestigationSpec({ name: 'Prototype' }), /Phase 1 chapter/i);
});

test('new investigations keep brief, source, synthesis, and human confirmation as separate layers', () => {
  const record = createInvestigation({
    projectId: 'project-1', chapterKey: '3', chapter: chapters[3],
    sourceIds: ['source-a', 'source-b'], id: 'investigation-1', now: '2026-09-24T12:00:00.000Z',
  });
  assert.deepEqual(record, {
    id: 'investigation-1', projectId: 'project-1', chapterKey: '3',
    objective: chapterInvestigationSpec(chapters[3]).objective,
    brief: null, outputContract: chapterInvestigationSpec(chapters[3]).requiredReturnOutput,
    sourceIds: ['source-a', 'source-b'], status: 'preparing', synthesis: null,
    createdAt: '2026-09-24T12:00:00.000Z', updatedAt: '2026-09-24T12:00:00.000Z',
  });
});

test('all Phase 1 chapters share one investigation state and confirmation never happens during synthesis', () => {
  const project = {
    id: 'garden-1', name: 'Pocket Garden', chapter: 3,
    idea: { rawIdea: 'A small-space garden planner', confirmedVersion: 'A calm planner for small-space gardening.', status: 'resolved' },
    answers: { 0: { text: 'A small-space garden planner' }, 1: { text: 'The confirmed problem.' }, 2: { text: 'The confirmed audience.' }, 3: { text: 'Current alternative draft.' } },
    resolved: { 0: { date: '2026-01-01' }, 1: { date: '2026-01-02' }, 2: { date: '2026-01-03' } },
    contexts: [{ id: 'source-a', projectLevel: true, title: 'Interview note', text: 'People keep notes in three places.' }],
  };
  const flow = chapterFlow(project, 3, chapters);
  const originalAnswer = project.answers[3].text;
  const originalResolved = project.resolved[3];
  flow.beginInvestigation({ id: 'investigation-3', now: '2026-09-24T12:00:00.000Z' });
  flow.saveWorkBrief({ objective: 'Compare the real alternatives.', requiredReturnOutput: ['Tools', 'Workarounds'] });
  flow.saveResearchProposal({ proposedValue: 'People combine a calendar and notes.', unresolvedQuestions: ['How often?'], sourceIds: ['source-a'] });
  assert.equal(flow.state.investigation.chapterKey, '3');
  assert.deepEqual(flow.state.investigation.sourceIds, ['source-a']);
  assert.equal(flow.state.investigation.status, 'synthesized');
  assert.equal(flow.state.investigation.brief.objective, 'Compare the real alternatives.');
  assert.equal(flow.state.investigation.synthesis.proposedValue, 'People combine a calendar and notes.');
  assert.equal(project.answers[3].text, originalAnswer);
  assert.equal(project.resolved[3], originalResolved);
  flow.confirm('People combine tools and notes to plan care.');
  assert.equal(project.answers[3].text, 'People combine tools and notes to plan care.');
  assert.equal(project.answers[3].source, 'human-confirmed');
});

test('Idea synthesis remains separate from the original and confirmed Working Idea until accepted', () => {
  const project = {
    id: 'idea-1', name: 'Pocket Garden', chapter: 0,
    idea: { rawIdea: 'A planner that helps me care for balcony plants.', workingIdea: 'A calm planner for balcony plant care.', status: 'drafted' },
    answers: { 0: { text: 'A planner that helps me care for balcony plants.' } },
    resolved: {}, contexts: [],
  };
  const flow = chapterFlow(project, 0, chapters);
  flow.beginInvestigation({ id: 'idea-investigation', now: '2026-09-24T12:00:00.000Z' });
  flow.saveResearchProposal({ proposedValue: 'A weekly care guide for people growing plants in small homes.', sourceIds: [], unresolvedQuestions: ['Which care tasks repeat?'] });
  flow.saveDraft(flow.state.researchProposal.proposedValue);
  assert.equal(project.idea.rawIdea, 'A planner that helps me care for balcony plants.');
  assert.equal(project.idea.confirmedVersion, undefined);
  assert.equal(project.resolved[0], undefined);
  flow.confirm(flow.state.draftText, '2026-09-24T12:30:00.000Z');
  assert.equal(project.idea.rawIdea, 'A planner that helps me care for balcony plants.');
  assert.equal(project.idea.confirmedVersion, 'A weekly care guide for people growing plants in small homes.');
  assert.equal(project.resolved[0].date, '2026-09-24T12:30:00.000Z');
  assert.equal(project.chapter, 1);
});

test('all thirteen chapters instantiate the same persisted investigation lifecycle', () => {
  for (const [index, chapter] of chapters.entries()) {
    const project = { id: `project-${index}`, chapter, idea: { rawIdea: 'A working idea.', workingIdea: 'A confirmed idea.', status: 'resolved' }, answers: {}, resolved: {}, contexts: [] };
    const flow = chapterFlow(project, index, chapters);
    const investigation = flow.beginInvestigation({ id: `investigation-${index}`, now: '2026-09-24T12:00:00.000Z' });
    assert.equal(investigation.chapterKey, String(index));
    assert.equal(investigation.projectId, `project-${index}`);
    assert.equal(flow.setView('investigation'), 'investigation');
  }
});

test('unknown prototype-property chapter names are rejected as invalid chapters', () => {
  for (const name of ['constructor', 'toString', '__proto__']) {
    assert.throws(() => chapterInvestigationSpec(name), RangeError);
  }
});

test('reopening a cached brief preserves synthesized and confirmed investigation status in all chapters', () => {
  for (const [index] of chapters.entries()) {
    const project = { id: `project-${index}`, answers: {}, resolved: {}, contexts: [] };
    const flow = chapterFlow(project, index, chapters);
    const brief = { objective: 'Investigate the next question.', requiredReturnOutput: ['Return evidence.'] };
    flow.saveWorkBrief(brief);
    flow.saveResearchProposal({ proposedValue: 'A proposed understanding.', sourceIds: [] });
    flow.saveWorkBrief(brief);
    assert.equal(flow.state.investigation.status, 'synthesized');
    flow.confirm('An accepted understanding.');
    const restored = chapterFlow(JSON.parse(JSON.stringify(project)), index, chapters);
    restored.saveWorkBrief(brief);
    assert.equal(restored.state.investigation.status, 'confirmed');
    assert.equal(restored.state.investigation.synthesis.proposedValue, 'A proposed understanding.');
  }
});
