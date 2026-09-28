import { productNameFor } from './project-identity.mjs';

const ascii = value => String(value ?? '')
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u2026/g, '...')
  .replace(/[^\x20-\x7e]/g, '?');

const pdfText = value => ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const wrap = (value, width = 86) => {
  const words = ascii(value).trim().split(/\s+/).filter(Boolean), lines = [];
  let line = '';
  for (const word of words) {
    if (word.length > width) {
      if (line) lines.push(line), line = '';
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
    } else if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else lines.push(line), line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const entryText = entry => entry?.shape?.fields
  ? Object.entries(entry.shape.fields).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key}: ${value}`).join('\n')
  : entry?.value || 'Not recorded.';

export function createIdeaBriefPdf({ project = {}, brief = {}, synthesis = null, readiness = null } = {}) {
  const pages = [], page = () => { const current = { commands: [] }; pages.push(current); return current; };
  let current = page(), y = 748;
  const ensure = height => { if (y < height) { current = page(); y = 748; } };
  const text = (value, size = 10, leading = 14, color = '0.16 0.15 0.13') => {
    const maxChars=Math.max(20,Math.floor(492/(size*0.52)));
    for (const line of String(value ?? '').split('\n').flatMap(item => wrap(item,maxChars))) {
      ensure(58); current.commands.push(`BT /F1 ${size} Tf ${color} rg 54 ${y} Td (${pdfText(line)}) Tj ET`); y -= leading;
    }
    y -= 2;
  };
  const heading = (value, size = 16, color = '0.17 0.35 0.42') => { ensure(90); y -= 6; text(value.toUpperCase(), size, size + 5, color); y -= 7; };
  current.commands.push('0.72 0.70 0.62 rg 0 0 600 792 re f');
  current.commands.push('0.16 0.15 0.13 rg 40 40 520 712 re f');
  y = 690;
  text('FLOPPY / IDEA BRIEF', 11, 16, '0.75 0.70 0.56');
  y -= 18;
  const title=productNameFor(project.productName?project:{...project,productName:brief.productName||brief.name});
  text(title, 28, 34, '0.95 0.93 0.87');
  if(project.name&&project.name!==title)text(`Workspace title: ${project.name}`,10,14,'0.72 0.75 0.72');
  text(brief.synthesis ? 'A working direction, with evidence and open questions.' : 'A clear, human-confirmed foundation for the next build.', 13, 20, '0.78 0.80 0.77');
  y -= 22;
  if (synthesis?.northStar) { heading('North Star', 18, '0.78 0.80 0.77'); text(synthesis.northStar, 14, 20, '0.95 0.93 0.87'); }
  text(`Prepared ${new Date().toLocaleDateString()}`, 9, 14, '0.58 0.60 0.57');

  current = page(); y = 742;
  heading('At a glance', 20);
  text(synthesis?.summary || (brief.synthesis?'This map brings together your original idea, interview, research, and open questions. It is a working direction you can continue to edit.':'This brief assembles the decisions you confirmed in Floppy. It does not turn open questions into facts.'));
  if (synthesis?.promise) { heading('Product promise'); text(synthesis.promise); }
  if (synthesis?.primaryUser) { heading('Primary user'); text(synthesis.primaryUser); }
  heading(brief.synthesis ? 'Product direction — review status by section' : 'Confirmed decisions', 20);
  for (const entry of brief.entries || []) { ensure(110); text(entry.name, 13, 18, '0.17 0.35 0.42'); if(entry.editedBy==='human')text(`Last edited by you / Status: ${entry.status||'draft'}`,9,13);else if(entry.editedBy==='ai')text(`AI proposal accepted / Status: ${entry.status||'inferred'}`,9,13);else if(entry.status)text(`Status: ${entry.status}`,9,13); text(entryText(entry), 10, 14); }
  if (readiness) {
    heading('Readiness', 20);
    text(`Known choices: ${readiness.known?.length || 0} | Open questions: ${readiness.uncertain?.length || 0} | Risks: ${readiness.risks?.length || 0}`);
  }
  heading('Open questions', 18);
  const questions = (brief.uncertainties || []).map(item => `${item.chapter}: ${item.question}`);
  (questions.length ? questions : ['No questions recorded. This does not establish certainty.']).forEach(item => text(`- ${item}`));
  heading('Sources', 18);
  const sources = brief.sources || [];
  (sources.length ? sources : [{ title: 'No sources cited.' }]).forEach(source => text(`- ${source.title || source.id || 'Untitled source'}${source.url ? ` - ${source.url}` : ''}`));
  heading('Founder notes', 18);
  text(brief.originalIdea || 'No original founder notes recorded.');
  if (brief.clarification) text(`Clarification: ${brief.clarification}`);

  pages.forEach((item,index)=>item.commands.push(`0.58 0.60 0.57 RG 54 42 m 546 42 l S`, `BT /F1 8 Tf 0.58 0.60 0.57 rg 54 26 Td (FLOPPY / IDEA BRIEF) Tj ET`, `BT /F1 8 Tf 0.58 0.60 0.57 rg 500 26 Td (Page ${index+1} of ${pages.length}) Tj ET`));

  const objects = [], add = body => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  const byteLength = value => new TextEncoder().encode(value).length;
  for (const item of pages) pageIds.push(add(`<< /Type /Page /Parent PAGES /MediaBox [0 0 600 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${add(`<< /Length ${byteLength(item.commands.join('\n'))} >>\nstream\n${item.commands.join('\n')}\nendstream`)} 0 R >>`));
  const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const body = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3'];
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(byteLength(body.join(''))); body.push(`${i + 1} 0 obj\n${objects[i].replace('PAGES', `${pagesId} 0 R`)}\nendobj\n`); }
  const xref = byteLength(body.join(''));
  body.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new TextEncoder().encode(body.join(''));
}
