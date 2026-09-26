import test from 'node:test';
import assert from 'node:assert/strict';
import { productDraft, applyProductDirection, confirmProductDecision, buildIdeaBrief, buildReadiness, formatIdeaBrief } from './product-shaping.mjs';
const chapters=['Idea','Problem','Audience','Alternatives','Evidence','Assumptions','First Product','Product','Features','Identity','Design','Idea Brief','Readiness'].map(name=>({name}));
function project(){return {id:'margin',name:'Margin',idea:{rawIdea:'An offline PDF reader with handwritten annotations.',confirmedVersion:'An offline reader for researchers.',status:'resolved'},resolved:{0:{date:'now'},1:{date:'now'},2:{date:'now'}},answers:{1:{text:'Research context gets lost.'},2:{text:'Researchers reading long papers.'}},contexts:[]};}
test('starting a product chapter keeps the founder concept intact without inventing functionality',()=>{
 const p=project(),original=structuredClone(p.idea),draft=productDraft(p,6);
 assert.deepEqual(draft.fields,{outcome:'',essential:'',deferred:''});
 assert.deepEqual(p.idea,original);
 assert.equal(p.answers[6],undefined);
 assert.equal(productDraft(p,7).fields.actor,p.answers[2].text);
 assert.equal(productDraft(p,9).fields.name,'Margin');
});
test('AI directions cannot become decisions without human confirmation; edited fields are authoritative',()=>{
 const p=project();
 const direction={label:'Small first version',fields:{outcome:'Keep reading context.',essential:'Read PDFs and retain margin notes.',deferred:'Cloud sync.'},sourceIds:['note'],openQuestions:['Are annotations legible?']};
 p.contexts=[{id:'note',title:'Interview',text:'Margin notes matter.'}];
 applyProductDirection(p,6,direction);
 assert.equal(p.resolved[6],undefined);
 productDraft(p,6).fields.essential='Read PDFs offline and retain handwritten margin notes.';
 p.chapterIntelligence[6].directionStatus='generating';p.chapterIntelligence[6].directionRequest='pending';p.chapterIntelligence[6].directionError='Old failed suggestion';
 confirmProductDecision(p,6,chapters);
 assert.equal(p.chapterIntelligence[6].directionRequest,'');
 assert.equal(p.chapterIntelligence[6].directionError,'');
 assert.match(p.answers[6].text,/handwritten/);
 assert.equal(p.chapterIntelligence[6].confirmation.shape.fields.essential,'Read PDFs offline and retain handwritten margin notes.');
 assert.equal(p.chapterIntelligence[6].confirmation.interpretation.fields.essential,direction.fields.essential);
 productDraft(p,6).fields.essential='Later draft';
 assert.match(p.chapterIntelligence[6].confirmation.shape.fields.essential,/handwritten/);
 assert.deepEqual(p.chapterIntelligence[6].confirmation.sourceIds,['note']);
 assert.equal(p.resolved[6].uncertain,true);
});
test('empty or malformed decisions and directions cannot confirm or overwrite a draft',()=>{
 const p=project();productDraft(p,7);
 const before=JSON.stringify(p);
 assert.throws(()=>confirmProductDecision(p,7,chapters),/complete/i);
 assert.equal(JSON.stringify(p),before);
 assert.throws(()=>applyProductDirection(p,7,{fields:{invented:'Do something else'}}),/direction/i);
 assert.equal(JSON.stringify(p),before);
});
test('Idea Brief derives only confirmed decisions, preserving full source and original-intent lineage',()=>{
 const p=project();
 p.answers[3]={text:'Unconfirmed competitor story'};
 p.chapterIntelligence={1:{confirmation:{sourceIds:['note'],openQuestions:['How often?']}}};
 p.contexts=[{id:'note',title:'Interview',text:'Original source text',url:'https://example.org/interview'}];
 const brief=buildIdeaBrief(p,chapters);
 assert.equal(brief.entries.length,3);
 assert.equal(brief.originalIdea,p.idea.rawIdea);
 assert.equal(brief.sources[0].id,'note');
 assert.equal(brief.sources[0].text,'Original source text');
 assert.doesNotMatch(formatIdeaBrief(brief),/competitor story/);
 assert.match(formatIdeaBrief(brief),/How often/);
 assert.match(formatIdeaBrief(brief),/https:\/\/example.org\/interview/);
 assert.doesNotMatch(formatIdeaBrief(brief),/Original source text/,'The shareable brief links to sources instead of reproducing every document');
});
test('Readiness surfaces known choices, unresolved questions, risks and deliberately deferred work without guessing',()=>{
 const p=project();
 p.resolved[5]={};p.answers[5]={text:'Readers must trust offline annotations.'};
 applyProductDirection(p,6,{label:'First version',fields:{outcome:'Keep context',essential:'PDF reading',deferred:'Cloud sync'},sourceIds:[],openQuestions:['Will readers switch?']});
 confirmProductDecision(p,6,chapters);
 const readiness=buildReadiness(p,chapters);
 assert.ok(readiness.known.some(item=>item.name==='First Product'));
 assert.ok(readiness.uncertain.some(item=>item.question==='Will readers switch?'));
 assert.ok(readiness.risks.includes('Readers must trust offline annotations.'));
 assert.deepEqual(readiness.deferred,['Cloud sync']);
 assert.equal(p.stage,undefined,'Assessing readiness must not advance the lifecycle');
});
