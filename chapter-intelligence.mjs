import { createInvestigation } from './chapter-investigation.mjs';

const VALID_VIEWS = new Set(['understanding', 'investigation']);

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function relevantSources(project, index) {
  return (Array.isArray(project.contexts) ? project.contexts : []).filter(source => {
    if (!source || typeof source !== 'object') return false;
    if (source.projectLevel) return true;
    const tagged = source.chapterKey ?? source.chapter;
    if (tagged === undefined || tagged === null || tagged === '') return true;
    const chapter = Number(tagged);
    return Number.isInteger(chapter) && chapter >= 0 && chapter <= index;
  }).map(source => ({
    id: source.id,
    title: clean(source.title || source.fileName || source.url) || 'Project note',
    fileName: clean(source.fileName),
    kind: clean(source.kind || source.fileMime) || 'NOTE',
    text: typeof source.text === 'string' ? source.text.slice(0, 12000) : '',
    url: clean(source.sourceUrl || source.url),
    sourceUrl: clean(source.sourceUrl || source.url),
    date: source.date || source.createdAt || '',
    createdAt: source.createdAt || source.date || '',
    hasImage: typeof source.image === 'string' && source.image.startsWith('data:image/'),
    image: typeof source.image === 'string' ? source.image : '',
    fileMime: clean(source.fileMime),
    fileData: typeof source.fileData === 'string' ? source.fileData : '',
  }));
}

function ensureState(project, index, chapters) {
  if (!Number.isInteger(index) || index < 0 || index >= chapters.length) throw new RangeError('Choose a valid Phase 1 chapter.');
  project.chapterIntelligence ||= {};
  let state = project.chapterIntelligence[index];
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    state = {};
    project.chapterIntelligence[index] = state;
  }
  const legacyResearch = index === 1 ? project.problemSynthesis : null;
  const legacyBrief = project.workBriefs?.[index] || null;
  if (!VALID_VIEWS.has(state.view)) state.view = 'understanding';
  if (!state.proposal) state.proposal = null;
  if (!state.researchProposal) state.researchProposal = legacyResearch || null;
  if (!state.workBrief) state.workBrief = legacyBrief;
  if (!state.investigation && (state.workBrief || state.researchProposal)) {
    state.investigation = createInvestigation({
      projectId: project.id,
      chapterKey: index,
      chapter: chapters[index],
      sourceIds: state.researchProposal?.sourceIds || [],
    });
    state.investigation.brief = state.workBrief;
    state.investigation.synthesis = state.researchProposal;
    state.investigation.status = state.researchProposal ? 'synthesized' : 'brief-ready';
  }
  if (typeof state.draftText !== 'string') state.draftText = state.researchProposal?.proposedValue || state.researchProposal?.proposedProblem || state.proposal?.text || project.answers?.[index]?.text || '';
  return state;
}

export function chapterFlow(project, index, chapters) {
  const state = ensureState(project, index, chapters);
  const sources = relevantSources(project, index);
  const confirmed = [];
  for (let chapter = 0; chapter < index; chapter += 1) {
    const idea = chapter === 0 ? project.idea : null;
    const value = chapter === 0
      ? clean(idea?.confirmedVersion || (idea?.status === 'resolved' ? project.answers?.[0]?.text : ''))
      : clean(project.answers?.[chapter]?.text);
    if ((chapter === 0 ? idea?.status === 'resolved' : !!project.resolved?.[chapter]) && value) {
      confirmed.push({ name: chapters[chapter]?.name || `Chapter ${chapter + 1}`, value });
    }
  }
  const rawIdea = clean(project.idea?.rawIdea || project.answers?.[0]?.text || project.context);
  const currentCandidate = clean(state.draftText);
  const openQuestions = [
    ...(Array.isArray(state.proposal?.openQuestions) ? state.proposal.openQuestions : []),
    ...(Array.isArray(state.researchProposal?.unresolvedQuestions) ? state.researchProposal.unresolvedQuestions : []),
  ].map(clean).filter(Boolean);
  const inheritedSynthesis = Object.entries(project.chapterIntelligence || {}).filter(([key, value]) => Number(key) < index && value?.researchProposal).map(([key, value]) => `FLOPPY SYNTHESIS for ${chapters[Number(key)]?.name || key} (not confirmed): ${clean(value.researchProposal.proposedValue || value.researchProposal.proposedProblem)}${value.researchProposal.contradictions?.length ? ` | Contradictions: ${value.researchProposal.contradictions.map(clean).join(' | ')}` : ''}${value.researchProposal.unresolvedQuestions?.length ? ` | Open: ${value.researchProposal.unresolvedQuestions.map(clean).join(' | ')}` : ''}`);
  const contextParts = [
    `PROJECT: ${clean(project.name) || 'Untitled idea'}`,
    rawIdea ? `ORIGINAL IDEA (human-written): ${rawIdea.slice(0, 1800)}` : '',
    ...confirmed.map(item => `CONFIRMED ${item.name.toUpperCase()} (human-confirmed): ${item.value.slice(0, 1300)}`),
    currentCandidate ? `CURRENT ${chapters[index]?.name?.toUpperCase() || 'CHAPTER'} CANDIDATE (not confirmed): ${currentCandidate}` : '',
    openQuestions.length ? `OPEN QUESTIONS (unresolved): ${openQuestions.join(' | ')}` : '',
    ...inheritedSynthesis.map(value => value.slice(0, 1200)),
    ...sources.map(source => `SOURCE — ${source.id || 'unlabeled'} · ${source.title} (${source.kind}): ${(source.text || (source.hasImage ? '[image attached]' : source.url || '[file attached]')).slice(0, 1000)}`),
  ].filter(Boolean);
  const perPart = Math.max(120, Math.floor(13900 / contextParts.length) - 2);
  const context = contextParts.map(part => part.slice(0, perPart)).join('\n\n');

  const beginInvestigation = ({ id, now = new Date().toISOString() } = {}) => {
    state.investigation ||= createInvestigation({
      projectId: project.id,
      chapterKey: index,
      chapter: chapters[index],
      sourceIds: sources.map(source => source.id).filter(Boolean),
      id,
      now,
    });
    state.investigation.sourceIds = [...new Set(sources.map(source => source.id).filter(Boolean))];
    state.investigation.updatedAt = now;
    return state.investigation;
  };
  const flow = {
    state,
    sources,
    confirmed,
    context,
    // The human's product definition is not a research excerpt. Send it as a
    // distinct record so a crowded source list cannot truncate its requirements.
    founderIntent: {
      originalIdea: String(project.idea?.rawIdea || project.answers?.[0]?.text || project.context || ''),
      clarification: String(project.idea?.clarificationResponse || ''),
    },
    currentCandidate,
    openQuestions,
    get evidenceSignal() {
      if (state.researchProposal?.strongestEvidence?.length) return 'Research attached · findings still need your judgment';
      if (sources.length) return 'Grounded in project context · not independently verified';
      if (index === 2 && confirmed.some(item => item.name === 'Problem')) return 'Built from your confirmed Problem · supporting research is limited';
      return 'Starting hypothesis · no supporting sources attached';
    },
    saveProposal(proposal) {
      if (!proposal || typeof proposal.text !== 'string' || !clean(proposal.text)) throw new TypeError('A non-empty proposal is required.');
      state.proposal = {
        ...proposal,
        text: clean(proposal.text),
        openQuestions: Array.isArray(proposal.openQuestions) ? proposal.openQuestions.map(clean).filter(Boolean) : [],
        sourceIds: Array.isArray(proposal.sourceIds) ? proposal.sourceIds.filter(id => sources.some(source => source.id === id)) : [],
        createdAt: proposal.createdAt || new Date().toISOString(),
      };
      state.draftText = state.proposal.text;
      state.view = 'understanding';
      return state.proposal;
    },
    saveDraft(value) {
      state.draftText = String(value ?? '').slice(0, 12000);
      return state.draftText;
    },
    saveResearchProposal(proposal) {
      if (!proposal || Array.isArray(proposal) || typeof proposal.proposedValue !== 'string' || !clean(proposal.proposedValue)) throw new TypeError('A non-empty research proposal is required.');
      const saved = {...proposal, proposedValue: clean(proposal.proposedValue), sourceIds: [...new Set((Array.isArray(proposal.sourceIds) ? proposal.sourceIds : []).filter(id => sources.some(source => source.id === id)))]};
      state.researchProposal = saved;
      if (index === 1) project.problemSynthesis = saved;
      const investigation = beginInvestigation();
      investigation.synthesis = saved;
      investigation.sourceIds = saved.sourceIds;
      investigation.status = 'synthesized';
      return saved;
    },
    beginInvestigation,
    saveWorkBrief(brief) {
      if (!brief || typeof brief !== 'object' || typeof brief.objective !== 'string') throw new TypeError('A prepared Work Brief is required.');
      state.workBrief = brief;
      project.workBriefs ||= {};
      project.workBriefs[index] = brief;
      const investigation = beginInvestigation();
      investigation.objective = brief.objective;
      investigation.brief = brief;
      investigation.outputContract = Array.isArray(brief.requiredReturnOutput) ? [...brief.requiredReturnOutput] : investigation.outputContract;
      if (!['synthesized', 'confirmed'].includes(investigation.status)) investigation.status = 'brief-ready';
      return investigation;
    },
    setView(view) {
      if (!VALID_VIEWS.has(view)) throw new TypeError('Choose a valid chapter view.');
      if (view === 'investigation') beginInvestigation();
      state.view = view;
      return view;
    },
    confirm(value, date = new Date().toISOString()) {
      const text = clean(value);
      if (!text) throw new TypeError('A chapter decision cannot be empty.');
      project.answers ||= {};
      project.resolved ||= {};
      if (index === 0) {
        project.idea ||= {};
        project.idea.rawIdea ||= project.answers?.[0]?.text || project.context || text;
        project.idea.workingIdea = text;
        project.idea.confirmedVersion = text;
        project.idea.status = 'resolved';
        project.idea.workflow = 'review';
        project.idea.resolvedAt = date;
        project.idea.updatedAt = date;
        project.projectDescription = text;
        project.answers[index] = { text: project.idea.rawIdea || text };
      } else {
        project.answers[index] = { text, source: 'human-confirmed' };
      }
      project.resolved[index] = { date, uncertain: !!(state.researchProposal?.unresolvedQuestions?.length || state.proposal?.openQuestions?.length) };
      if (index === 1) project.problem = text;
      if (index === 2) project.audience = text;
      project.chapter = Math.min(index + 1, chapters.length - 1);
      state.confirmedAt = date;
      // Freeze the lineage at the moment of human approval. Later research may
      // revise an interpretation, but must not rewrite what was approved before.
      const interpretation = state.researchProposal || state.proposal;
      state.confirmation = {
        value: text,
        origin: 'human-confirmed',
        confirmedAt: date,
        sourceIds: [...new Set((interpretation?.sourceIds || []).filter(id => sources.some(source => source.id === id)))],
        availableSourceIds: sources.map(source => source.id).filter(Boolean),
        openQuestions: [...new Set([...(state.proposal?.openQuestions || []), ...(state.researchProposal?.unresolvedQuestions || [])].map(clean).filter(Boolean))],
        interpretation: interpretation ? JSON.parse(JSON.stringify(interpretation)) : null,
      };
      state.draftText = text;
      state.view = 'understanding';
      if (state.investigation) {
        state.investigation.status = 'confirmed';
        state.investigation.updatedAt = date;
      }
      return project.answers[index];
    },
  };
  return flow;
}
