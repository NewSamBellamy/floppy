export function renderCinematicPortfolio(p) {
    const root = document.getElementById('project');
    if (!root) return;
    
    // Hide native Floppy elements by adding cinematic mode class
    document.body.classList.add('cinematic-mode');
    document.body.classList.add('project-view');
    document.body.dataset.activeChapter = p.chapter || 0;
    
    // Hide original elements
    const origToolbar = root.querySelector('.project-toolbar');
    const origPhases = root.querySelector('#phases');
    const origShell = root.querySelector('.workspace-shell');
    const origSupport = root.querySelector('.support');
    const origFooter = root.querySelector('.project-footer');
    
    if (origToolbar) origToolbar.style.display = 'none';
    if (origPhases) origPhases.style.display = 'none';
    if (origShell) origShell.style.display = 'none';
    if (origSupport) origSupport.style.display = 'none';
    if (origFooter) origFooter.style.display = 'none';

    // Create or find cinematic container
    let cinematicContainer = document.getElementById('cinematic-container');
    if (!cinematicContainer) {
        cinematicContainer = document.createElement('div');
        cinematicContainer.id = 'cinematic-container';
        root.appendChild(cinematicContainer);
    }
    
    // Fallbacks for data extraction
    const answers = p.answers || {};
    const ideaText = p.idea?.text || '';
    const twoLiner = answers[7]?.text || ideaText || 'Your two-liner pitch goes here...';
    const audienceText = answers[2]?.text || 'Define your audience...';
    const competitorsText = answers[3]?.text || 'List alternatives...';
    const problemText = answers[1]?.text || 'What is the burning problem?';
    const solutionText = answers[7]?.text || 'How do you solve it?';
    const mvpText = answers[6]?.text || 'Define your Minimum Viable Product...';

    // Inject the 5-tab cinematic UI
    cinematicContainer.innerHTML = `
        <div class="cinematic-header">
            <div class="cinematic-title-area">
                <button id="cinematicBack" class="quiet">← Library</button>
                <div class="cinematic-titles">
                    <h1>${p.name || 'Untitled Idea'}</h1>
                    <p>${p.productName || ideaText.substring(0, 50) || 'Loading...'}</p>
                </div>
            </div>
            <div class="cinematic-dropzone" id="agentDropzone">
                <span class="dropzone-text">Feed context to Agent to auto-update deck</span>
                <input type="file" id="agentDropInput" multiple />
            </div>
        </div>
        
        <nav class="cinematic-tabs">
            <button class="cinematic-tab active" data-tab="pitch">1. Pitch Deck</button>
            <button class="cinematic-tab" data-tab="journey">2. User Journey</button>
            <button class="cinematic-tab" data-tab="preview">3. Live Preview</button>
            <button class="cinematic-tab" data-tab="codebase">4. Codebase & Ops</button>
            <button class="cinematic-tab" data-tab="roadmap">5. Roadmap</button>
        </nav>
        
        <div class="cinematic-content">
            <section id="tab-pitch" class="cinematic-panel active">
                <div class="slides-container">
                    <div class="slide" contenteditable="true">
                        <h2>The 2-Liner</h2>
                        <p>${twoLiner}</p>
                    </div>
                    <div class="slide" contenteditable="true">
                        <h2>Audience & Competitors</h2>
                        <p><strong>Audience:</strong> ${audienceText}</p>
                        <p><strong>Competitors:</strong> ${competitorsText}</p>
                    </div>
                    <div class="slide" contenteditable="true">
                        <h2>Problem & Solution</h2>
                        <p><strong>Problem:</strong> ${problemText}</p>
                        <p><strong>Solution:</strong> ${solutionText}</p>
                    </div>
                    <div class="slide" contenteditable="true">
                        <h2>The MVP</h2>
                        <p>${mvpText}</p>
                    </div>
                </div>
            </section>
            
            <section id="tab-journey" class="cinematic-panel">
                <div class="asset-grid">
                    <div class="asset-placeholder">+ Add Storyboard</div>
                    <div class="asset-placeholder">+ Add Asset</div>
                </div>
            </section>
            
            <section id="tab-preview" class="cinematic-panel">
                ${p.liveUrl ? `<iframe src="${p.liveUrl}" class="live-iframe"></iframe>` : `<div class="preview-placeholder">Live Preview Unavailable<br><small>No liveUrl set</small></div>`}
            </section>
            
            <section id="tab-codebase" class="cinematic-panel">
                <div class="ops-card">
                    <h3>Hosting & Repository</h3>
                    <p><strong>Local Path:</strong> ${p.localPath || 'Not synced'}</p>
                    <p><strong>Repository:</strong> ${p.repoUrl ? `<a href="${p.repoUrl}" target="_blank">${p.repoUrl}</a>` : 'Not linked'}</p>
                </div>
                <div class="ops-card mcp-status">
                    <h3>MCP Connection</h3>
                    <div class="status-indicator disconnected"></div>
                    <span>Disconnected</span>
                </div>
            </section>
            
            <section id="tab-roadmap" class="cinematic-panel">
                <div class="roadmap-board">
                    <div class="roadmap-col">
                        <h4>Idea</h4>
                        <div class="roadmap-card done">Define Problem</div>
                    </div>
                    <div class="roadmap-col">
                        <h4>Prototype</h4>
                        <div class="roadmap-card">Figma Wireframes</div>
                    </div>
                    <div class="roadmap-col">
                        <h4>MVP</h4>
                        <div class="roadmap-card">Core Backend</div>
                    </div>
                    <div class="roadmap-col">
                        <h4>Prod</h4>
                        <div class="roadmap-card">Launch</div>
                    </div>
                    <div class="roadmap-col">
                        <h4>Post-prod</h4>
                        <div class="roadmap-card">Metrics Tracking</div>
                    </div>
                </div>
            </section>
        </div>
    `;

    // Event handlers
    document.getElementById('cinematicBack').onclick = () => {
        document.body.classList.remove('cinematic-mode');
        // Restore original visibility so back animation/library look fine
        if (origToolbar) origToolbar.style.display = '';
        if (origPhases) origPhases.style.display = '';
        if (origShell) origShell.style.display = '';
        if (origSupport) origSupport.style.display = '';
        if (origFooter) origFooter.style.display = '';
        
        // Hide cinematic container
        cinematicContainer.style.display = 'none';
        
        // Click the native back button
        const nativeBack = document.getElementById('back');
        if (nativeBack) nativeBack.click();
    };

    // Make sure container is visible if it was hidden by back
    cinematicContainer.style.display = 'flex';

    document.querySelectorAll('.cinematic-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cinematic-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.cinematic-panel').forEach(p => p.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetId = 'tab-' + e.target.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    const dropzone = document.getElementById('agentDropzone');
    dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
        alert('Agent received context. Auto-updating deck...');
    });
}
