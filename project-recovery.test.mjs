import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverProjectSession } from './project-recovery.mjs';

test('reload recovers interrupted chapter requests without losing durable decisions', () => {
  const project = {
    stage: 1, chapter: 2, unlockedStage: 1,
    idea: { workflow: 'generating', rawIdea: 'Original notes', confirmedVersion: 'Accepted idea' },
    answers: { 1: { text: 'Accepted problem' } }, resolved: { 1: { date: 'saved' } },
    chapterIntelligence: { 2: { proposalStatus: 'generating', briefStatus: 'generating', synthesisStatus: 'generating', investigation: { status: 'synthesizing', brief: { objective: 'Learn' }, synthesis: { proposedValue: 'Research draft' } } } },
  };
  recoverProjectSession(project);
  assert.equal(project.idea.workflow, 'writing');
  assert.equal(project.chapterIntelligence[2].proposalStatus, 'failed');
  assert.equal(project.chapterIntelligence[2].briefStatus, 'failed');
  assert.equal(project.chapterIntelligence[2].synthesisStatus, 'failed');
  assert.equal(project.chapterIntelligence[2].investigation.status, 'synthesized');
  assert.equal(project.answers[1].text, 'Accepted problem');
  assert.equal(project.unlockedStage, 1);
});

test('interrupted product directions recover without changing founder choices',()=>{
 const project={chapterIntelligence:{6:{directionStatus:'generating',directionRequest:'dead-request',productDraft:{fields:{essential:'Offline PDF annotations'}}}}};
 recoverProjectSession(project);
 assert.equal(project.chapterIntelligence[6].directionStatus,'failed');
 assert.equal(project.chapterIntelligence[6].productDraft.fields.essential,'Offline PDF annotations');
});
