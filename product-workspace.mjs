import {chapterFlow} from './chapter-intelligence.mjs';
import {PRODUCT_CHAPTERS,productDraft,productDecisionText,applyProductDirection,confirmProductDecision,buildIdeaBrief,formatIdeaBrief,buildReadiness} from './product-shaping.mjs';
import {renderDecisionArtifact} from './chapter-artifact.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const excerpt=(value,limit=160)=>{const t=String(value||'');return esc(t.length>limit?t.slice(0,limit).trimEnd()+'…':t);};
const clone=value=>JSON.parse(JSON.stringify(value));
const briefGroups=[{name:'Overview',indices:[0,1,2]},{name:'Experience',indices:[6,7,8]},{name:'Direction',indices:[9,10]},{name:'Evidence',indices:[3,4,5]}];
const chapterPresentation={
 6:{kind:'first-product',title:'Your first useful version.'},
 7:{kind:'product-flow',title:'The first useful moment.'},
 8:{kind:'feature-scope',title:'The scope of your first version.'},
 9:{kind:'identity',title:'Your product identity.'},
 10:{kind:'design-direction',title:'Your design direction.'},
 11:{kind:'idea-brief',title:'Your confirmed Idea Brief.'},
 12:{kind:'prototype-plan',title:'Your prototype plan.'},
};

// Use the brief's own confirmed snapshot, including when reviewing a saved brief.
// Excerpts are presentation only; entry.value remains the complete detail text.
function briefEntryPreview(entry){
 const definition=PRODUCT_CHAPTERS[entry.index],fields=entry.shape?.fields;
 const recorded=definition&&fields?definition.fields.filter(field=>typeof fields[field.key]==='string'&&fields[field.key].trim()):[];
 if(!recorded.length)return `<span class="brief-entry-excerpt">${excerpt(entry.value,200)}</span>`;
 return `<span class="brief-entry-fields">${recorded.map(field=>`<span class="brief-preview-field brief-preview-${field.key}" data-field-key="${field.key}"><span class="brief-preview-label">${esc(field.label)}</span><span class="brief-preview-value">${excerpt(fields[field.key],entry.index===7?100:130)}</span></span>`).join('')}</span>`;
}

function showDetail(title,body,returnFocus){
 const dialog=document.createElement('dialog');dialog.className='product-detail-dialog';
 dialog.innerHTML=`<form method="dialog" class="dialog-top"><span class="eyebrow">PROJECT DETAIL</span><button class="quiet" aria-label="Close detail">✕</button></form><h2 id="productDetailTitle">${esc(title)}</h2><div class="product-detail-body">${body}</div>`;
 dialog.setAttribute('aria-labelledby','productDetailTitle');document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();returnFocus?.();},{once:true});dialog.showModal();
}

export function renderProductWorkspace({root,project,index,chapters,actions}){
 const flow=chapterFlow(project,index,chapters),state=flow.state;
 const resolved=!!project.resolved?.[index],definition=PRODUCT_CHAPTERS[index];
 const presentation=chapterPresentation[index];
 const snapshot=state.confirmation;
 const status=message=>{const el=root.querySelector('#shapeStatus');if(el)el.textContent=message;};
 const transaction=mutation=>{
  const previous=clone(project);
  try{mutation();}catch(error){for(const key of Object.keys(project))delete project[key];Object.assign(project,previous);repaint();status(error.message);return false;}
  if(actions.persist())return true;
  for(const key of Object.keys(project))delete project[key];Object.assign(project,previous);
  repaint();status('Not saved. Your previous decisions are safe. Try again when storage is available.');return false;
 };
 const repaint=()=>actions.render();
 const legacy=resolved&&!snapshot?.shape&&index!==11;
 const draft=index===11?null:productDraft(project,index);
 const fields=resolved&&snapshot?.shape?snapshot.shape.fields:draft?.fields||{};
 root.classList.add('product-thinking');root.classList.toggle('decision-confirmed',resolved);

 const fieldMarkup=field=>{
  const value=fields[field.key]||'';
  const lines=index===8?value.split('\n').filter(Boolean):null;
  return `<button type="button" class="shape-field shape-field-${field.key} ${value?'has-value':'is-empty'} ${resolved?'is-confirmed':'is-draft'}" data-shape-field="${field.key}" data-field-key="${field.key}" data-chapter-index="${index}" data-confirmed="${resolved}" aria-label="${resolved?'Read':'Edit'} ${esc(field.label)}"><span class="shape-field-label">${esc(field.label)}<span class="shape-field-action" aria-hidden="true">${resolved?'↗':value?'Edit':'＋'}</span></span>${lines?.length?`<ul class="shape-field-items">${lines.slice(0,3).map(line=>`<li>${excerpt(line,85)}</li>`).join('')}</ul>${lines.length>3?`<small class="shape-field-overflow">+${lines.length-3} more</small>`:''}`:`<span class="shape-value">${value?excerpt(value,index===7?140:180):esc(field.hint)}</span>`}</button>`;
 };
 const footer=`<p id="shapeStatus" class="form-status" role="status"></p><div class="shape-secondary"><button class="quiet" id="investigateChapter">Investigate with AI</button><button class="quiet" id="shapeSources">Sources · ${flow.sources.length}</button>${!resolved?'<button class="quiet" id="shapeAddContext">Add context</button>':''}</div>`;
 const previousNotes=!snapshot?.shape&&(project.answers?.[index]?.text||state.proposal?.text);
 const anchor=`<details class="founder-anchor"><summary>Your original idea & confirmed context</summary><div class="disclosure-body"><h3>Founder-written idea</h3><p>${esc(flow.founderIntent.originalIdea)}</p>${flow.founderIntent.clarification?`<p>${esc(flow.founderIntent.clarification)}</p>`:''}${flow.confirmed.filter(item=>['Problem','Audience','First Product'].includes(item.name)).map(item=>`<h3>${esc(item.name)} · confirmed</h3><p>${esc(item.value)}</p>`).join('')}${previousNotes?`<h3>Previous ${esc(chapters[index].name)} notes · retained for review</h3><p>${esc(previousNotes)}</p>`:''}</div></details>`;
 const research=state.researchProposal?'<button class="text-button" id="shapeResearch">Review returned research ↗</button>':'';

 if(index===11){
  const brief=resolved&&snapshot?.brief?snapshot.brief:buildIdeaBrief(project,chapters);
  const tab=Number.isInteger(state.briefTab)&&state.briefTab<briefGroups.length?state.briefTab:0;
  const entries=brief.entries.filter(item=>briefGroups[tab].indices.includes(item.index));
  root.innerHTML=`<p class="eyebrow">${esc(project.name)} / IDEA BRIEF</p><h2 class="shape-title">${resolved?esc(presentation.title):'The idea, brought together.'}</h2><p class="shape-guidance">Assembled from your confirmed decisions. Nothing new is being invented here.</p><nav class="brief-tabs" aria-label="Brief sections">${briefGroups.map((group,i)=>`<button data-brief-tab="${i}" aria-pressed="${i===tab}">${group.name}</button>`).join('')}</nav><div class="brief-composition shape-idea-brief shape-chapter-11 ${resolved?'is-confirmed':'is-draft'}" data-chapter-index="11" data-confirmed="${resolved}" data-brief-section="${briefGroups[tab].name.toLowerCase()}">${entries.map(entry=>`<button type="button" class="brief-entry brief-entry-${chapterPresentation[entry.index]?.kind||'decision'} is-confirmed" data-brief-entry="${entry.index}" data-chapter-index="${entry.index}" data-confirmed="true"><span class="shape-field-label">${esc(entry.name)} <span class="brief-entry-action">Read full detail ↗</span></span>${briefEntryPreview(entry)}</button>`).join('')||'<p>No confirmed decisions in this section yet.</p>'}</div><div class="brief-meta"><span>${brief.entries.length} confirmed decisions</span><span>${brief.sources.length} cited sources</span><button class="text-button" id="briefUnknowns">${brief.uncertainties.length} open questions</button>${footer}</div><div class="action-buttons chapter-actions"><button class="secondary" id="copyIdeaBrief">Copy complete brief</button>${resolved?'<button class="quiet" id="reopenChapter">Reopen review</button><button class="primary" id="nextProductChapter">Review readiness →</button>':'<button class="primary" id="resolveChapter">This reflects my idea →</button>'}</div>`;
  root.querySelectorAll('[data-brief-tab]').forEach(button=>button.onclick=()=>{state.briefTab=Number(button.dataset.briefTab);repaint();});
  root.querySelectorAll('[data-brief-entry]').forEach(button=>button.onclick=()=>{const entry=brief.entries.find(item=>item.index===Number(button.dataset.briefEntry));showDetail(entry.name,`<p class="full-decision">${esc(entry.value)}</p><p class="small">Cited sources: ${entry.sourceIds.map(esc).join(', ')||'none recorded'}</p>`,()=>root.querySelector(`[data-brief-entry="${entry.index}"]`)?.focus());});
  root.querySelector('#briefUnknowns').onclick=()=>showDetail('Open questions',`<ul>${brief.uncertainties.map(item=>`<li><strong>${esc(item.chapter)}</strong> — ${esc(item.question)}</li>`).join('')||'<li>No questions recorded. This does not establish certainty.</li>'}</ul>`);
  root.querySelector('#copyIdeaBrief').onclick=async()=>{const content=formatIdeaBrief(brief);try{await navigator.clipboard.writeText(content);status('Complete brief copied, including original notes and source references.');}catch{showDetail('Complete Idea Brief',`<pre class="brief-copy-text">${esc(content)}</pre>`);}};
  root.querySelector('#resolveChapter')?.addEventListener('click',()=>{
   if(brief.entries.length<11){status('Confirm the earlier chapters before approving this brief.');return;}
   if(transaction(()=>{flow.confirm(`Reviewed the Idea Brief for ${project.name}, assembled from ${brief.entries.length} human-confirmed decisions, with ${brief.sources.length} cited sources and ${brief.uncertainties.length} open questions.`);flow.state.confirmation.brief=clone(brief);actions.event('You reviewed the assembled Idea Brief.');}))repaint();
  });
 }else{
  const readiness=index===12?(resolved&&snapshot?.readiness?snapshot.readiness:buildReadiness(project,chapters)):null;
  const readinessMarkup=readiness?`<div class="readiness-overview">${[
   ['Known',`${readiness.known.length} choices made`,readiness.known.map(item=>`${item.name}: ${item.value}`)],
   ['Uncertain',`${readiness.uncertain.length} open questions`,readiness.uncertain.map(item=>`${item.chapter}: ${item.question}`)],
   ['Risky',readiness.risks.length?'Beliefs to test':'No risks recorded',readiness.risks],
   ['Deferred',readiness.deferred.length?'Intentionally not yet':'Not yet recorded',readiness.deferred],
  ].map(([label,summary,values])=>`<details class="readiness-dimension readiness-${label.toLowerCase()}" data-readiness-kind="${label.toLowerCase()}"><summary><strong>${label}</strong><span>${esc(summary)}</span></summary><div class="disclosure-body"><ul>${values.map(value=>`<li>${esc(value)}</li>`).join('')||'<li>Not recorded. Do not mistake a missing entry for certainty.</li>'}</ul></div></details>`).join('')}</div>`:'';
  const shapeContent=legacy?renderDecisionArtifact(project.answers?.[index]?.text||''):`<div class="shape-composition shape-chapter-${index} shape-${presentation.kind} ${resolved?'is-confirmed':'is-draft'}" data-chapter-index="${index}" data-confirmed="${resolved}">${definition.fields.map(fieldMarkup).join('')}</div>`;
  const directions=!resolved&&state.productDirections?.length?`<details class="direction-options"><summary>AI possibilities · ${state.productDirections.length} to explore</summary><div>${state.productDirections.map((direction,i)=>`<button class="secondary" data-direction="${i}">${esc(direction.label)} ↗</button>`).join('')}</div></details>`:'';
  const images=index===10?flow.sources.filter(source=>source.hasImage):[];
  const references=images.length?`<div class="design-reference-strip" aria-label="Project visual references">${images.map(source=>`<button data-design-reference="${esc(source.id)}" aria-label="Inspect ${esc(source.title)}"><img src="${esc(source.image)}" alt="${esc(source.title)}"></button>`).join('')}</div>`:'';
  root.innerHTML=`<h2 class="shape-title">${esc(resolved?presentation.title:definition.title)}</h2><p class="${resolved?'answer-state':'shape-guidance'}">${resolved?'Confirmed by you':esc(definition.why)}</p>${readinessMarkup}${shapeContent}${references}${research}${directions}${state.directionStatus==='generating'?'<p class="brief-loading" role="status">Exploring possibilities from your idea… <button class="text-button" id="cancelDirections">Cancel</button></p>':''}${state.directionError?`<p class="form-status" role="alert">${esc(state.directionError)}</p>`:''}<div class="action-buttons chapter-actions">${resolved?`<button class="secondary" id="reopenChapter">Reopen decision</button>${index===12?'<button class="primary" id="beginPrototype">Begin Prototype →</button>':'<button class="primary" id="nextProductChapter">Continue →</button>'}`:`${definition.action?`<button class="secondary" id="suggestDirections" ${state.directionStatus==='generating'?'disabled':''}>${esc(definition.action)}</button>`:''}<button class="primary" id="resolveChapter">${index===12?'Confirm prototype plan':'Use this direction'} →</button>`}</div>${index!==12?anchor:''}${footer}`;
  root.querySelectorAll('[data-shape-field]').forEach(button=>button.onclick=()=>openField(button.dataset.shapeField));
  root.querySelectorAll('[data-design-reference]').forEach(button=>button.onclick=()=>{const source=images.find(item=>item.id===button.dataset.designReference);showDetail(source.title,`<img class="design-reference-full" src="${esc(source.image)}" alt="${esc(source.title)}"><p>${esc(source.text||'Attached project reference. Decide what to borrow, not merely how it looks.')}</p>`);});
  root.querySelector('#resolveChapter')?.addEventListener('click',()=>{
   if(transaction(()=>{confirmProductDecision(project,index,chapters);if(readiness)chapterFlow(project,index,chapters).state.confirmation.readiness=clone(readiness);actions.event(`You shaped and confirmed ${chapters[index].name}.`);}))repaint();
  });
  root.querySelector('#suggestDirections')?.addEventListener('click',async()=>{
   const request=crypto.randomUUID();state.directionRequest=request;state.directionStatus='generating';state.directionError='';actions.persist();repaint();
   try{
    const directions=await actions.generate(clone(productDraft(project,index)));
    const latest=chapterFlow(project,index,chapters).state;if(latest.directionRequest!==request)return;
    if(directions)latest.productDirections=directions;
    latest.directionStatus='ready';actions.persist();
   }catch(error){const latest=chapterFlow(project,index,chapters).state;if(latest.directionRequest===request){latest.directionStatus='failed';latest.directionError=error.message;actions.persist();}}
   finally{if(chapterFlow(project,index,chapters).state.directionRequest===request)repaint();}
  });
  root.querySelector('#cancelDirections')?.addEventListener('click',()=>{state.directionRequest='';state.directionStatus='';actions.persist();repaint();});
  root.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>openDirection(Number(button.dataset.direction)));
 }

 root.querySelector('#shapeSources').onclick=actions.sources;
 root.querySelector('#shapeAddContext')?.addEventListener('click',actions.addContext);
 root.querySelector('#investigateChapter').onclick=actions.investigate;
 root.querySelector('#beginPrototype')?.addEventListener('click',actions.beginPrototype);
 root.querySelector('#nextProductChapter')?.addEventListener('click',()=>{project.chapter=Math.min(12,index+1);actions.persist();repaint();});
 root.querySelector('#reopenChapter')?.addEventListener('click',()=>{
  if(transaction(()=>{for(let i=index;i<chapters.length;i++)delete project.resolved[i];if(snapshot?.shape)state.productDraft=clone(snapshot.shape);project.chapter=index;actions.event(`You reopened ${chapters[index].name}; later decisions are retained for review.`);}))repaint();
 });
 root.querySelector('#shapeResearch')?.addEventListener('click',()=>{
  const research=state.researchProposal;
  showDetail('Returned research · not confirmed',`<p class="full-decision">${esc(research.proposedValue||research.proposedProblem)}</p><h3>Evidence</h3><ul>${(research.strongestEvidence||[]).map(esc).map(item=>`<li>${item}</li>`).join('')}</ul><h3>Open questions</h3><ul>${(research.unresolvedQuestions||[]).map(esc).map(item=>`<li>${item}</li>`).join('')}</ul><p class="small">Use these findings to shape your choices. Research does not replace your original product.</p>`);
 });

 function openField(key){
  const field=definition.fields.find(item=>item.key===key);if(!field)return;
  if(resolved){showDetail(field.label,`<p class="full-decision">${esc(fields[key]||'Not recorded.')}</p>`,()=>root.querySelector(`[data-shape-field="${key}"]`)?.focus());return;}
  const dialog=document.createElement('dialog');dialog.className='product-field-dialog';
  dialog.innerHTML=`<form method="dialog" class="dialog-top"><span class="eyebrow">${esc(chapters[index].name)}</span><button class="quiet" aria-label="Cancel edit">✕</button></form><h2 id="shapeFieldTitle">${esc(field.label)}</h2><p class="shape-guidance">${esc(field.hint)}</p><label class="sr-only" for="shapeFieldInput">${esc(field.label)}</label><textarea id="shapeFieldInput" rows="5" maxlength="2000">${esc(productDraft(project,index).fields[key])}</textarea><p class="form-status" id="shapeFieldStatus" role="status"></p><div class="action-buttons"><button class="primary" id="saveShapeField">Save choice</button><button class="quiet" id="cancelShapeField">Cancel</button></div>`;
  dialog.setAttribute('aria-labelledby','shapeFieldTitle');document.body.append(dialog);
  dialog.querySelector('#cancelShapeField').onclick=()=>dialog.close();
  dialog.querySelector('#saveShapeField').onclick=()=>{
   const value=dialog.querySelector('#shapeFieldInput').value.trim();
   if(transaction(()=>{const current=productDraft(project,index);current.fields[key]=value;chapterFlow(project,index,chapters).saveDraft(productDecisionText(index,current.fields));})){dialog.close();repaint();root.querySelector(`[data-shape-field="${key}"]`)?.focus();}
   else dialog.querySelector('#shapeFieldStatus').textContent='Not saved. Your text is still here; try again.';
  };
  dialog.addEventListener('close',()=>{dialog.remove();root.querySelector(`[data-shape-field="${key}"]`)?.focus();},{once:true});dialog.showModal();
 }
 function openDirection(directionIndex){
  const direction=state.productDirections[directionIndex];
  const body=`<p class="shape-guidance">A possibility to edit—not a decision. Applying it replaces the current draft fields, not your confirmed project.</p><dl class="direction-preview">${definition.fields.map(field=>`<dt>${esc(field.label)}</dt><dd>${esc(direction.fields[field.key]||'Not suggested')}</dd>`).join('')}</dl><h3>Questions to consider</h3><ul>${direction.openQuestions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><button class="primary" id="applyProductDirection">Use as my draft</button>`;
  showDetail(direction.label,body);
  const dialog=document.querySelector('.product-detail-dialog');
  dialog.querySelector('#applyProductDirection').onclick=()=>{
   if(transaction(()=>{const current=applyProductDirection(project,index,direction);chapterFlow(project,index,chapters).saveDraft(productDecisionText(index,current.fields));})){dialog.close();repaint();}
   else{const message=document.createElement('p');message.className='form-status';message.textContent='Could not save the draft. Your previous choices are safe.';dialog.querySelector('.product-detail-body').append(message);}
  };
 }
}
