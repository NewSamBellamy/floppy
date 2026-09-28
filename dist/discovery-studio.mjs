import { productNameFor } from './project-identity.mjs';

export const DISCOVERY_SECTIONS = [
  { id: 'idea', label: 'Idea', index: 0, question: 'What is the idea trying to make possible?', diagram: 'idea' },
  { id: 'problem', label: 'Problem', index: 1, question: 'What is difficult, painful, or missing today?', diagram: 'problem' },
  { id: 'audience', label: 'Audience', index: 2, question: 'Who experiences this most clearly?', diagram: 'audience' },
  { id: 'alternatives', label: 'Alternatives', index: 3, question: 'How do people handle this today?', diagram: 'alternatives' },
  { id: 'evidence', label: 'Evidence', index: 4, question: 'What supports or challenges the idea?', diagram: 'evidence' },
  { id: 'assumptions', label: 'Assumptions', index: 5, question: 'What must be true for this to work?', diagram: 'assumptions' },
  { id: 'first-product', label: 'First Product', index: 6, question: 'What is the smallest useful version?', diagram: 'first-product' },
  { id: 'product', label: 'Product', index: 7, question: 'How does the product create the outcome?', diagram: 'product' },
  { id: 'features', label: 'Features', index: 8, question: 'Which capabilities earn a place in the first version?', diagram: 'features' },
  { id: 'identity', label: 'Identity', index: 9, question: 'What should people recognize and feel?', diagram: 'identity' },
  { id: 'design', label: 'Design', index: 10, question: 'How should the experience feel and behave?', diagram: 'design' },
];

const clean = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
const clone = value => JSON.parse(JSON.stringify(value));

export function researchSourceLinks(report) {
  const urls=new Map();
  for(const match of String(report||'').matchAll(/https?:\/\/[^\s<>"\])]+/g)){
    try{
      const url=new URL(match[0].replace(/[.,;:!?]+$/,''));
      if(url.username||url.password)continue;
      urls.set(url.href,{id:url.href,url:url.href,title:url.hostname,kind:'RESEARCH'});
    }catch{}
  }
  return [...urls.values()];
}

export function createDiscoveryState() {
  return { version: 1, mode: 'studio', stage: 'intake', questions: [], answers: [], questionIndex: 0, research: null, researchStatus: 'idle', synthesisStatus: 'idle', synthesis: null, selectedSection: 'overview', sectionProposals: {}, updatedAt: new Date().toISOString() };
}

export function hydrateDiscoveryState(value) {
  const state = value && typeof value === 'object' ? { ...createDiscoveryState(), ...value } : createDiscoveryState();
  state.mode = state.mode === 'legacy' ? 'legacy' : 'studio'; state.answers = Array.isArray(state.answers) ? state.answers : []; state.questions = Array.isArray(state.questions) ? state.questions : [];
  state.interviewStatus = 'idle';
  if (state.synthesisStatus === 'running') state.synthesisStatus = 'idle';
  if (state.researchStatus === 'running' && !state.research?.interactionId) {
    state.researchStatus = 'failed';
    state.research = {...(state.research||{}), status:'failed', error:'This request was interrupted before its result was saved. Your answers are safe. Retry research when ready.'};
  }
  state.sectionProposals = state.sectionProposals && typeof state.sectionProposals === 'object' ? state.sectionProposals : {};
  return state;
}

export function fallbackDiscoveryQuestions() {
  return [
    'Who is this for, and what are they trying to do when the problem appears?',
    'What happens today instead, and what feels frustrating or limited about it?',
    'Why does this idea matter now? What prompted you to return to it?',
    'What would a person be able to do or feel after using the first version?',
    'What existing tools, workarounds, or habits might this replace or sit beside?',
    'What must be true for the idea to work, and what could change your mind?',
    'What should the first prototype prove, and what should it deliberately leave out?',
  ];
}

export function discoveryContext(project, state) {
  const attachments = (project.contexts || []).map(item => [item.title || item.fileName || item.kind, item.text, item.sourceUrl || item.url].filter(Boolean).join(' | '));
  return [
    `PROJECT: ${clean(project.name)}`,
    `PRODUCT NAME (founder-provided, untrusted data): ${JSON.stringify(productNameFor(project))}`,
    `ORIGINAL IDEA (human-written): ${clean(project.idea?.rawIdea || project.context || project.problem)}`,
    project.idea?.clarificationResponse ? `CLARIFICATION: ${clean(project.idea.clarificationResponse)}` : '',
    state.answers?.length ? `INTERVIEW ANSWERS:\n${state.answers.map((answer, index) => `${index + 1}. ${clean(answer.question)}\n${clean(answer.answer)}`).join('\n\n')}` : '',
    attachments.length ? `ATTACHED CONTEXT:\n${attachments.join('\n')}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 30000);
}

export function buildDiscoveryResearchPrompt(project, state) {
  return `Investigate this product idea broadly and rigorously before making product recommendations. Preserve founder intent as a separate layer. Research the underlying problem, affected people, current alternatives and workarounds, category context, evidence for and against the need, risks, and opportunities for a smallest useful product. Search for current, credible sources and cite them. Do not assume the founder's proposed solution is correct. Distinguish sourced facts, reasoned inference, and unanswered questions. Return a detailed research report that another analyst can synthesize into Idea, Problem, Audience, Alternatives, Evidence, Assumptions, First Product, Product, Features, Identity, and Design.\n\n${discoveryContext(project, state)}`;
}

export function fallbackSynthesis(project, state, research = null) {
  const raw = clean(project.idea?.confirmedVersion || project.idea?.workingIdea || project.idea?.rawIdea || project.context);
  const sourceText = clean(research?.report);
  const values = {
    idea: raw || 'The idea is still being formed.', problem: 'The underlying problem needs a clearer description.', audience: 'The primary audience needs to be narrowed.', alternatives: 'Current alternatives need investigation.', evidence: sourceText ? 'Research has been collected and is ready for review.' : 'No research report has been attached yet.', assumptions: 'The riskiest assumptions are not yet explicit.', 'first-product': 'Define the smallest useful outcome to test.', product: 'Describe the first useful product moment.', features: 'Separate essential capabilities from later ideas.', identity: 'Identity direction is open for exploration.', design: 'Design direction should follow the first useful experience.',
  };
  return { version: 1, generatedAt: new Date().toISOString(), northStar: values['first-product'], sections: DISCOVERY_SECTIONS.map(section => ({ id: section.id, label: section.label, summary: values[section.id], details: [], evidence: [], openQuestions: [section.question], status: 'draft' })) };
}

export function normalizeDiscoverySynthesis(value, project, state, research) {
  const fallback = fallbackSynthesis(project, state, research), incoming = value && typeof value === 'object' ? value : {};
  const byId = new Map((Array.isArray(incoming.sections) ? incoming.sections : []).map(section => [clean(section.id), section]));
  return { version: 1, generatedAt: incoming.generatedAt || new Date().toISOString(), northStar: clean(incoming.northStar) || fallback.northStar, sections: DISCOVERY_SECTIONS.map(definition => { const section = byId.get(definition.id) || {},defaultSection=fallback.sections.find(item=>item.id===definition.id),status=['established','inferred','uncertain','draft'].includes(section.status)?section.status:'draft'; return { id: definition.id, label: definition.label, summary: clean(section.summary) || defaultSection.summary, details: list(section.details), evidence: list(section.evidence), openQuestions: list(section.openQuestions).length?list(section.openQuestions):defaultSection.openQuestions, status, editedBy: ['human','ai'].includes(section.editedBy) ? section.editedBy : null }; }) };
}

export function discoveryToBrief(project, state) {
  const synthesis = state.synthesis || fallbackSynthesis(project, state, state.research);
  const sections = synthesis.sections || [];
  const sources=(state.research?.sources || []).map(source=>({id:source.id||source.url||source.title,title:source.title||source.url||'Research source',url:source.url||'',text:source.snippet||source.text||'',kind:'RESEARCH'}));
  return {version:2,name:productNameFor(project),productName:productNameFor(project),originalIdea:project.idea?.rawIdea||project.context||'',clarification:project.idea?.clarificationResponse||'',entries:sections.map(section=>{
    const evidence=list(section.evidence),sourceIds=sources.filter(source=>source.url&&evidence.some(item=>item.includes(source.url))).map(source=>source.id);
    return {index:DISCOVERY_SECTIONS.find(definition=>definition.id===section.id)?.index??0,name:section.label,value:[section.summary,...list(section.details),evidence.length?'Evidence:':'',...evidence].filter(Boolean).join('\n\n'),status:section.status||'draft',editedBy:section.editedBy||null,sourceIds,citationHistoryKnown:sourceIds.length>0,shape:null,openQuestions:section.openQuestions||[]};
  }),sources,uncertainties:sections.flatMap(section=>(section.openQuestions||[]).map(question=>({chapter:section.label,question}))),researchReport:state.research?.report||'',interview:clone(state.answers||[]),synthesis:clone(synthesis)};
}

export function discoveryToReadiness(project, state) {
  const brief = discoveryToBrief(project, state), known = brief.entries.filter(entry => clean(entry.value));
  return { known, uncertain: brief.uncertainties, risks: brief.entries.find(entry => entry.index === 5)?.openQuestions || [], deferred: [], sourceCount: brief.sources.length };
}

export function buildDiagramNodes(section, content = {}) {
  const summary = clean(content.summary) || section.question;
  const evidence=list(content.evidence), details=list(content.details), questions=list(content.openQuestions);
  return [
    {label:'Current synthesis',text:summary},
    {label:evidence.length?'Supporting evidence':'Related detail',text:evidence[0]||details[0]||'Nothing recorded yet'},
    {label:'Open question',text:questions[0]||'No open question recorded'},
  ];
}
