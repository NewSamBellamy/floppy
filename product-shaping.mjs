import { chapterFlow } from './chapter-intelligence.mjs';

const field=(key,label,hint,required=true)=>({key,label,hint,required});
export const PRODUCT_CHAPTERS={
 6:{title:'Keep the idea. Find its smallest useful version.',why:'Choose the first useful moment while keeping what matters about your original idea.',action:'Shape a starting point with AI',fields:[
  field('outcome','Prove this value','What should someone be able to accomplish?'),
  field('essential','Keep in the first version','Which parts of your original idea are essential to that outcome?'),
  field('deferred','Leave for later','What are you deliberately choosing not to build yet?',false)]},
 7:{title:'Map the first useful moment.',why:'Follow one person from a real need to a useful result. Every step should earn its place.',action:'Suggest a flow with AI',fields:[
  field('actor','User','Who is in this moment?'),field('action','Does','What do they do first?'),
  field('system','Product responds','What must your product do for them?'),field('result','They get','What changes for the person?')]},
 8:{title:'Give every capability a reason to exist.',why:'Core delivers the value. Supporting makes it usable. Later protects the first version from growing.',action:'Organize with AI',fields:[
  field('core','Core','One capability per line. Tie each to the result your user needs.'),
  field('supporting','Supporting','What makes the core experience usable? Note dependencies.',false),
  field('later','Later','Which useful ideas can wait?',false),
  field('dependencies','Gaps & tradeoffs','What depends on what? What is missing, complex, or unnecessary?',false)]},
 9:{title:'Choose what people should recognize.',why:'A name is only one part of identity. Make the promise and personality yours.',action:'Explore identity with AI',fields:[
  field('name','Working name','Keep your name or try a new direction. This does not rename the project.'),
  field('positioning','The promise','For whom, in what category, and why is this worth choosing?'),
  field('qualities','Feel like','Choose a few qualities you want people to associate with it.'),
  field('avoid','Not like','What associations, lookalikes, or naming conflicts should you avoid?',false)]},
 10:{title:'Give the experience a clear direction.',why:'Useful design principles guide decisions before you draw the first screen.',action:'Explore design with AI',fields:[
  field('feeling','Intended feeling','How should using this product feel?'),
  field('principles','Interface principles','What deserves attention? What should stay quiet?'),
  field('interaction','Interaction patterns','Describe the important behavior: navigating, creating, reviewing, or deciding.'),
  field('references','References','Name a visual or interaction reference and what to learn from it.',false)]},
 12:{title:'What should the prototype prove?',why:'You do not need certainty to start. You need a clear question and a way to learn.',fields:[
  field('goal','The question to test','What is the most important thing the prototype should help you learn?'),
  field('signal','What would change your mind?','What observable result would support or challenge your direction?')]},
};
const clone=value=>JSON.parse(JSON.stringify(value));
const text=value=>typeof value==='string'?value.trim():'';
export function productDraft(project,index){
 const definition=PRODUCT_CHAPTERS[index];if(!definition)throw new RangeError('Choose a product-shaping chapter.');
 project.chapterIntelligence||={};const state=project.chapterIntelligence[index]||={};
 if(!state.productDraft){
  const fields=Object.fromEntries(definition.fields.map(item=>[item.key,'']));
  if(index===7&&project.resolved?.[2])fields.actor=project.answers?.[2]?.text||'';
  if(index===9)fields.name=project.name||'';
  state.productDraft={version:1,fields,referenceIds:[]};
 }
 return state.productDraft;
}
export function validateDirection(index,direction){
 const definition=PRODUCT_CHAPTERS[index];
 if(!definition||!direction||!direction.fields||typeof direction.fields!=='object')throw new TypeError('Incomplete product direction.');
 const fields={};
 for(const field of definition.fields){
  const value=direction.fields[field.key];
  if(typeof value!=='string'||value.length>2000||(field.required&&!value.trim()))throw new TypeError('Incomplete product direction.');
  fields[field.key]=value.trim();
 }
 return {label:text(direction.label).slice(0,100)||'Suggested direction',fields,sourceIds:Array.isArray(direction.sourceIds)?direction.sourceIds.filter(id=>typeof id==='string'):[],openQuestions:Array.isArray(direction.openQuestions)?direction.openQuestions.filter(q=>typeof q==='string').slice(0,6):[]};
}
export function applyProductDirection(project,index,direction){
 const validated=validateDirection(index,direction);
 const draft=productDraft(project,index);
 draft.fields=clone(validated.fields);draft.direction=clone(validated);
 return draft;
}
export function productDecisionText(index,fields){
 return PRODUCT_CHAPTERS[index].fields.filter(field=>text(fields[field.key])).map(field=>`${field.label}: ${text(fields[field.key])}`).join('\n\n');
}
export function confirmProductDecision(project,index,chapters){
 const draft=productDraft(project,index),definition=PRODUCT_CHAPTERS[index];
 if(definition.fields.some(field=>field.required&&!text(draft.fields[field.key])))throw new Error('Complete the essential decisions before continuing.');
 const flow=chapterFlow(project,index,chapters);
 flow.confirm(productDecisionText(index,draft.fields));
 flow.state.confirmation.shape=clone(draft);
 flow.state.confirmation.interpretation=draft.direction?clone(draft.direction):null;
 flow.state.confirmation.sourceIds=[...new Set((draft.direction?.sourceIds||[]).filter(id=>flow.sources.some(source=>source.id===id)))];
 flow.state.confirmation.openQuestions=[...new Set([...(draft.direction?.openQuestions||[]),...(flow.state.researchProposal?.unresolvedQuestions||[])])];
 flow.state.confirmation.research=flow.state.researchProposal?clone(flow.state.researchProposal):null;
 project.resolved[index].uncertain=flow.state.confirmation.openQuestions.length>0;
 flow.state.directionRequest='';flow.state.directionStatus='';flow.state.directionError='';
 return flow.state.confirmation;
}
export function buildIdeaBrief(project,chapters){
 const entries=[];
 for(let index=0;index<=10;index++){
  if(index===0?project.idea?.status!=='resolved':!project.resolved?.[index])continue;
  const value=index===0?project.idea.confirmedVersion:project.answers?.[index]?.text;
  if(!text(value))continue;
  const record=project.chapterIntelligence?.[index]?.confirmation;
  entries.push({index,name:chapters[index].name,value,sourceIds:[...(record?.sourceIds||[])],citationHistoryKnown:!!record,shape:record?.shape?clone(record.shape):null,openQuestions:[...(record?.openQuestions||[])]});
 }
 const sourceIds=[...new Set(entries.flatMap(entry=>entry.sourceIds))];
 return {version:1,name:project.name,originalIdea:project.idea?.rawIdea||'',clarification:project.idea?.clarificationResponse||'',entries,
  sources:sourceIds.map(id=>{const source=project.contexts?.find(item=>item?.id===id);return source?{id,title:source.title||source.fileName||'Project source',text:source.text||'',url:source.sourceUrl||source.url||'',kind:source.kind||'',fileName:source.fileName||''}:{id,title:'Source no longer attached',missing:true};}),
  uncertainties:entries.flatMap(entry=>entry.openQuestions.map(question=>({chapter:entry.name,question}))),
 };
}
export function formatIdeaBrief(brief){
 return [`# ${brief.name} — Idea Brief`,'Human-confirmed project decisions. Confirmation records a choice, not independent proof.',
  ...brief.entries.map(entry=>`## ${entry.name}\n${entry.shape?productDecisionText(entry.index,entry.shape.fields):entry.value}\n${entry.citationHistoryKnown?`Cited sources: ${entry.sourceIds.join(', ')||'none'}`:'Citation history not recorded for this decision.'}`),
  `## Open questions\n${brief.uncertainties.map(item=>`- ${item.chapter}: ${item.question}`).join('\n')||'No questions recorded. This does not establish certainty.'}`,
  `## Sources\n${brief.sources.map(source=>`- ${source.id} · ${source.title}${source.url?` · ${source.url}`:''}${source.missing?' (not attached)':''}`).join('\n')||'No sources cited.'}`,
  `## Original founder notes\n${brief.originalIdea}${brief.clarification?`\nClarification: ${brief.clarification}`:''}`].join('\n\n');
}
export function buildReadiness(project,chapters){
 const brief=buildIdeaBrief(project,chapters);
 const risks=[];
 const assumptions=brief.entries.find(entry=>entry.index===5);if(assumptions)risks.push(assumptions.value);
 for(const entry of brief.entries){const record=project.chapterIntelligence?.[entry.index]?.confirmation;risks.push(...(record?.interpretation?.contradictions||[]),...(record?.research?.contradictions||[]));}
 const deferred=[brief.entries.find(entry=>entry.index===6)?.shape?.fields?.deferred,brief.entries.find(entry=>entry.index===8)?.shape?.fields?.later].filter(Boolean);
 return {known:brief.entries,uncertain:brief.uncertainties,risks:[...new Set(risks)],deferred:[...new Set(deferred)],sourceCount:brief.sources.length};
}
