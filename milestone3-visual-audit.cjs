const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const os = require('node:os');

const url = process.env.FLOPPY_URL || 'http://127.0.0.1:8767/index.html';
const auditTag = process.env.FLOPPY_AUDIT_TAG || 'after';
const sizes = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const reports = [];
  const screenshots = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: size });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(url);
      if (auditTag === 'after' && await page.locator('#identityDialog').count()) throw new Error('Duplicate legacy identity dialog is still present.');
      const view = async name => {
        const metrics = await page.evaluate(screenName => {
          const box = selector => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, overflowY: style.overflowY, text: element.innerText?.slice(0, 120) };
          };
          const visible = selector => {
            const element = document.querySelector(selector);
            if (!element || element.getClientRects().length === 0) return false;
            const rect = element.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
          };
          const primarySelector = { home: '#continueProject', idea: '#continueIdea', settings: '#saveSettings', art: '#saveProjectArt', problem: '#resolveChapter' }[screenName];
          return {
            viewport: { width: innerWidth, height: innerHeight },
            document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, bodyWidth: document.body.scrollWidth, bodyHeight: document.body.scrollHeight },
            pageScrollY: scrollY,
            library: box('#library'), project: box('#project'), heading: box('.library-heading'), carousel: box('#carousel'), selectedDisk: box('.disk-card.selected'), resume: box('.resume'), topbar: box('.topbar'), toolbar: box('.project-toolbar'), lifecycle: box('.phases'), rail: box('.chapter-rail'), workspace: box('.workspace-main'), action: box('#actionPanel'), question: box('#actionPanel h2'), composer: box('.idea-composer, .chapter-composer'), primary: box('#actionPanel .primary'), dialog: box('dialog[open]'), artLayout: box('.project-art-layout'), artControls: box('.project-art-controls'), artFooter: box('.art-editor-footer'),
            continueVisible: visible('#continueProject'), questionVisible: visible('#actionPanel h2'), composerVisible: visible('.idea-composer, .chapter-composer'), actionVisible: visible('#actionPanel .primary'), dialogVisible: visible('dialog[open]'),
            primaryActionVisible: visible(primarySelector),
          };
        }, name);
        const file = path.join(os.tmpdir(), `floppy-m3-${auditTag}-${size.width}x${size.height}-${name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        screenshots.push(file);
        reports.push({ ...size, name, ...metrics, errors: [...errors] });
      };
      await view('home');
      await page.locator('#continueProject').click();
      await page.locator('#actionPanel h2').waitFor();
      await view('idea');
      await page.locator('#settingsButton').click();
      await page.locator('#settingsDialog[open]').waitFor();
      await view('settings');
      await page.locator('#settingsDialog form[method="dialog"] button').click();
      await page.locator('#back').click();
      await page.locator('[data-id="floppy"].disk-card').hover();
      await page.locator('[data-art-id="floppy"]').click();
      await page.locator('#artDialog[open]').waitFor();
      await view('art');
      if (size.width <= 760) {
        const reachability = await page.evaluate(() => {
          const layout = document.querySelector('.project-art-layout');
          const footer = document.querySelector('.art-editor-footer').getBoundingClientRect();
          layout.scrollTop = layout.scrollHeight;
          const generate = document.querySelector('#generateProjectArt').getBoundingClientRect();
          const upload = document.querySelector('.project-art-controls .art-options label').getBoundingClientRect();
          return { scrollHeight: layout.scrollHeight, clientHeight: layout.clientHeight, scrollTop: layout.scrollTop, uploadAboveFooter: upload.bottom <= footer.top, generateAboveFooter: generate.bottom <= footer.top };
        });
        if (reachability.scrollHeight <= reachability.clientHeight || !reachability.uploadAboveFooter || !reachability.generateAboveFooter) {
          throw new Error(`Art dialog controls are not reachable at ${size.width}x${size.height}: ${JSON.stringify(reachability)}`);
        }
      }
      await page.locator('#cancelArtEdit').click();
      await page.evaluate(() => {
        const store = JSON.parse(localStorage.getItem('floppy-projects-v3'));
        const project = store.projects.find(item => item.id === 'floppy');
        project.chapter = 1;
        project.idea.status = 'resolved';
        project.idea.confirmedVersion = project.idea.workingIdea || project.idea.rawIdea;
        project.idea.workingIdea = project.idea.confirmedVersion;
        project.resolved = { ...(project.resolved || {}), 0: { resolvedAt: new Date().toISOString() } };
        project.answers = { ...(project.answers || {}), 1: { text: '' } };
        project.contexts = [...(project.contexts || []), { id: 'm3-evidence', projectId: project.id, kind: 'NOTE', title: 'Interview note', text: 'Two makers described the same handoff delay.', chapter: 1, chapterKey: '1', currentAssociatedChapter: 'Problem', date: new Date().toISOString(), createdAt: new Date().toISOString() }];
        localStorage.setItem('floppy-projects-v3', JSON.stringify(store));
      });
      await page.reload();
      await page.locator('#continueProject').click();
      await page.locator('#resolveChapter').waitFor();
      await view('problem');
      if (auditTag === 'after' && !(await page.locator('#chapterContext').evaluate(element => element.hidden))) throw new Error('The chapter source list should stay collapsed until the user asks for it.');
      if (auditTag === 'after' && await page.locator('.evidence-disclosure .source-note').count()) throw new Error('Evidence status is duplicated inside the disclosure.');
      const evidence = page.locator('.chapter-disclosure > summary').first();
      if (await evidence.count()) {
        await evidence.click();
        await view('problem-details');
        await page.locator('#jumpContext').click();
        if (auditTag === 'after' && await page.locator('#chapterContext').evaluate(element => element.hidden || !element.open)) throw new Error('View sources did not open the detailed source list.');
        await view('problem-sources');
      }
      await page.close();
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(JSON.stringify({ reports, screenshots }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
