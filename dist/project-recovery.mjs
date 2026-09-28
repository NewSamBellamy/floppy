// Persist durable work, but never resume a request that died with the page.
export function recoverProjectSession(project) {
  project.unlockedStage = Math.max(project.stage || 0, Math.min(4, Number(project.unlockedStage) || 0));
  project.chapter = Math.max(0, Math.min(12, Number.isInteger(project.chapter) ? project.chapter : 0));
  if (project.idea?.workflow === 'generating') project.idea.workflow = 'writing';
  if (project.idea) {
    project.idea.editWarning = false;
    project.idea.editingWorking = false;
  }
  for (const state of Object.values(project.chapterIntelligence || {})) {
    if (!state || typeof state !== 'object') continue;
    for (const operation of ['proposal', 'brief', 'synthesis', 'direction']) {
      if (state[operation + 'Status'] !== 'generating') continue;
      state[operation + 'Status'] = 'failed';
      state[operation + 'Error'] = 'This request was interrupted. Your saved work is safe. Try again when ready.';
    }
    if (state.investigation && ['preparing', 'synthesizing'].includes(state.investigation.status)) {
      state.investigation.status = state.investigation.synthesis ? 'synthesized' : state.investigation.brief ? 'brief-ready' : 'results-added';
    }
  }
  return project;
}
