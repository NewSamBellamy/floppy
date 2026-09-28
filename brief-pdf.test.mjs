import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdeaBriefPdf } from './brief-pdf.mjs';

test('Idea Brief PDF is a multi-page readable PDF with ASCII-safe text', () => {
  const bytes = createIdeaBriefPdf({ project: { name: 'Garden' }, brief: { name: 'Garden', originalIdea: 'A calm plan', entries: Array.from({ length: 12 }, (_, index) => ({ name: `Chapter ${index}`, value: 'A confirmed decision with enough detail to wrap across a line in the exported document.' })), uncertainties: [{ chapter: 'Evidence', question: 'Will people return?' }], sources: [{ title: 'Interview notes', url: 'https://example.com/interview' }] }, synthesis: { summary: 'A focused summary.', northStar: 'Help someone plan one garden.', promise: 'Make planning calmer.', primaryUser: 'Small creative teams' } });
  const pdf = new TextDecoder().decode(bytes);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /\/Type \/Pages/);
  assert.match(pdf, /Will people return\?/);
  assert.ok(bytes.length > 1200);
});

test('discovery brief PDF preserves working language, edit authorship and page numbers',()=>{
 const brief={synthesis:{},originalIdea:'The founder draft',entries:[{name:'Idea',status:'inferred',editedBy:'human',value:'The saved section summary.'}],uncertainties:[],sources:[]};
 const pdf=new TextDecoder().decode(createIdeaBriefPdf({project:{name:'A deliberately long project title for checking cover wrapping'},brief,synthesis:{northStar:'Help a team keep its latest decision close to the next action.'}}));
 assert.match(pdf,/A working direction, with evidence and open questions\./);
 assert.match(pdf,/This map brings together your original idea, interview, research, and open questions/);
 assert.match(pdf,/Last edited by you \/ Status: inferred/);
 assert.match(pdf,/Page 1 of 2/);
 assert.match(pdf,/Page 2 of 2/);
 assert.doesNotMatch(pdf,/Last edited by you \?/);
});

test('PDF cover leads with the product name and keeps the picker title distinct',()=>{
 const pdf=new TextDecoder().decode(createIdeaBriefPdf({project:{name:'Founder workspace',productName:'Fieldnotes'},brief:{name:'Fieldnotes',productName:'Fieldnotes',entries:[],uncertainties:[]}}));
 assert.match(pdf,/Fieldnotes/);
 assert.match(pdf,/Workspace title: Founder workspace/);
});
