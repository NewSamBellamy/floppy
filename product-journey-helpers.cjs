const choices={
 Clydeo:{
  6:{outcome:'Let a founder share a credential with one agent without copying it into chat.',essential:'A protected credential store and an explicit sharing permission.',deferred:'Virtual-card spending controls need separate validation.'},
  7:{actor:'A founder working with an AI agent',action:'Selects a credential and grants limited access',system:'Checks permission before supplying the credential',result:'The agent completes the task without exposing the secret in chat'},
  8:{core:'Store a credential securely\nGrant and revoke agent access',supporting:'Explain which agent has access',later:'Virtual-card spending limits',dependencies:'Permission checks must precede access. Security validation is essential before real credentials.'},
  9:{name:'Clydeo',positioning:'Credential control for founders collaborating with agents.',qualities:'Clear, trustworthy, restrained',avoid:'Claims that security is guaranteed'},
 10:{feeling:'Calm and in control',principles:'Keep permission scope visible; hide secret values.',interaction:'Review and confirm access before sharing.',references:'Permission review screens, focusing on explicit scope.'},
 12:{goal:'Can founders correctly choose a limited permission?',signal:'They can explain what access they granted and revoke it without help.'},
 },
 Fieldnotes:{
  6:{outcome:'Resolve one conflicting piece of client feedback without losing its context.',essential:'Collect feedback, compare conflicting requests, record a decision.',deferred:'Automated client reporting.'},
  7:{actor:'An independent designer',action:'Brings conflicting client feedback into one view',system:'Keeps the comments next to their original context',result:'The designer records one clear next decision'},
  8:{core:'Collect feedback\nCompare contradictory comments\nRecord a decision',supporting:'Link each decision to original comments',later:'Automated reports',dependencies:'Feedback must retain its source before it can support a decision.'},
  9:{name:'Fieldnotes',positioning:'A clear next decision from scattered client feedback.',qualities:'Thoughtful, precise, calm',avoid:'Heavy project-management language'},
 10:{feeling:'Spacious and focused',principles:'The decision should dominate, with sources one step away.',interaction:'Compare comments before confirming a decision.',references:'Editorial notes with quiet source links.'},
 12:{goal:'Can a designer resolve contradictory feedback using the original context?',signal:'They choose and explain a next action without rereading every thread.'},
 },
 Margin:{
  6:{outcome:'Keep a researcher’s handwritten thoughts beside the paper they are reading.',essential:'Open local PDFs, write margin notes, retain everything offline.',deferred:'Cloud synchronization and team collaboration.'},
  7:{actor:'A researcher reading a long paper offline',action:'Opens a local PDF and writes a margin note',system:'Keeps the handwriting attached to its page locally',result:'The researcher resumes reading with the original thought intact'},
  8:{core:'Open local PDFs\nHandwritten margin notes\nRestore notes on reopening',supporting:'Navigate pages without losing annotation position',later:'Cloud sync\nShared libraries',dependencies:'Page coordinates must stay stable before handwriting can be restored. Cloud accounts add no value to the first offline test.'},
  9:{name:'Margin',positioning:'An offline reading companion for researchers who think by hand.',qualities:'Quiet, tactile, scholarly',avoid:'AI chat branding or cloud-first promises'},
 10:{feeling:'Like a well-used paper notebook',principles:'The paper and handwriting take priority; controls recede.',interaction:'Write directly beside a paragraph; reopen exactly where you left off.',references:'Paper margin annotations; borrow their spatial link to the text.'},
 12:{goal:'Can a researcher resume a thought using a handwritten note after reopening the PDF?',signal:'They find and interpret the original note without asking where it was saved.'},
 },
};
async function fillProductChoices(page,index,project='Margin'){
 const fields=choices[project][index]||{};
 for(const [key,value] of Object.entries(fields)){
  await page.locator(`[data-shape-field="${key}"]`).click();
  await page.locator('#shapeFieldInput').fill(value);
  await page.locator('#saveShapeField').click();
 }
}
module.exports={choices,fillProductChoices};
