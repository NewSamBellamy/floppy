const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Presentation only: never rewrite the confirmed value to make it fit the screen.
export function decisionPresentation(value) {
  const fullText = String(value ?? '');
  const readable = fullText.trim();
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(readable)];
  if (readable.length <= 320 && sentences.length <= 3) return { lead: readable, fullText, expanded: false };
  const excerpt = sentences.slice(0, 3).map(item => item.segment).join('').slice(0, 320).trim();
  const boundary = Math.max(excerpt.lastIndexOf('. '), excerpt.lastIndexOf('? '), excerpt.lastIndexOf('! '));
  const end = /[.!?]$/.test(excerpt) ? excerpt.length : boundary > 100 ? boundary + 1 : Math.max(excerpt.lastIndexOf(' '), 100);
  return { lead: `${excerpt.slice(0, end).trim()}…`, fullText, expanded: true };
}

export function renderDecisionArtifact(value) {
  const display = decisionPresentation(value);
  return `<article class="decision-artifact" aria-label="Confirmed decision"><p class="decision-lead">${escapeHTML(display.lead)}</p>${display.expanded ? `<details class="decision-full"><summary>Read full decision</summary><div class="decision-full-text">${escapeHTML(display.fullText)}</div></details>` : ''}</article>`;
}
