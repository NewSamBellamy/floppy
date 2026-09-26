import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionPresentation, renderDecisionArtifact } from './chapter-artifact.mjs';
import { chapterFlow } from './chapter-intelligence.mjs';

test('short confirmed decisions are readable artifacts, never form controls', () => {
  const text = 'People lose the original context when feedback changes hands.';
  assert.deepEqual(decisionPresentation(text), { lead: text, fullText: text, expanded: false });
  const html = renderDecisionArtifact(text);
  assert.match(html, /decision-artifact/);
  assert.ok(html.includes(text));
  assert.doesNotMatch(html, /textarea|input|contenteditable/);
});

test('long decisions use an explicit excerpt with access to the complete unchanged decision', () => {
  const text = 'A detailed founder decision.\n'.repeat(80);
  const display = decisionPresentation(text);
  assert.ok(display.lead.length <= 321);
  assert.equal(display.fullText, text);
  assert.equal(display.expanded, true);
  const html = renderDecisionArtifact(text);
  assert.match(html, /Read full decision/);
  assert.ok(html.includes(text));
});

test('artifact markup escapes user text in both summary and detail', () => {
  const html = renderDecisionArtifact('<img src=x onerror=alert(1)> '.repeat(50));
  assert.doesNotMatch(html, /<img|onerror="/);
  assert.match(html, /&lt;img/);
});

test('confirmation snapshots human judgment separately from inference and cited versus available sources', () => {
  const chapters = [{name:'Idea'}, {name:'Problem'}];
  const p = {id:'x', idea:{rawIdea:'An original product concept'}, contexts:[
    {id:'cited',text:'Interview evidence'}, {id:'uncited',text:'Unrelated context'},
  ]};
  const flow = chapterFlow(p,1,chapters);
  flow.saveProposal({text:'An AI interpretation.',sourceIds:['cited','invented'],openQuestions:['Still true?']});
  flow.confirm('The founder chooses a more precise statement.', '2026-09-25T12:00:00Z');
  const record = JSON.parse(JSON.stringify(flow.state.confirmation));
  assert.equal(record.value, p.answers[1].text);
  assert.equal(record.origin, 'human-confirmed');
  assert.equal(record.interpretation.text,'An AI interpretation.');
  assert.deepEqual(record.sourceIds,['cited']);
  assert.deepEqual(record.availableSourceIds,['cited','uncited']);
  assert.deepEqual(record.openQuestions,['Still true?']);
  flow.saveProposal({text:'Later AI interpretation.',sourceIds:['uncited']});
  assert.deepEqual(flow.state.confirmation, record);
  assert.equal(p.answers[1].text, record.value);
});
