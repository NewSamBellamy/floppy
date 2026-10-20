// Floppy: Founder Product & Idea Atlas — Modular UI & Telemetry Controller
import * as atlasDataModule from './founder-atlas-data.mjs';

export const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All Projects (32)' },
  { id: 'priority', label: '🔥 Priority Sprint' },
  { id: 'saas', label: '🚀 Core SaaS & AI' },
  { id: 'infra', label: '🛠️ Agent & MCP Infra' },
  { id: 'creative', label: '🎨 Creative & Media' },
  { id: 'spatial', label: '🥽 Spatial & Hardware' },
  { id: 'keep', label: '💡 Keep & AI Studio Vault' },
  { id: 'ops', label: '🏛️ Personal & Client Ops' }
];

export const DEFAULT_SOURCES = [
  'All Sources',
  'Google Keep',
  'Google AI Studio',
  'NotebookLM',
  'Codex',
  'ZCode',
  'Claude Code',
  'GitHub',
  'Desktop Hub'
];

export const STAGE_LABELS = [
  '1. Idea',
  '2. Prototype',
  '3. MVP',
  '4. Production',
  '5. Post-production'
];

export const STAGE_SHORT_NAMES = [
  'Idea',
  'Prototype',
  'MVP',
  'Production',
  'Post-production'
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const safeLink = s => {
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};

export function normalizeCategoryList(rawCategories) {
  const list = Array.isArray(rawCategories) && rawCategories.length ? rawCategories : DEFAULT_CATEGORIES;
  return list.map(item => {
    if (typeof item === 'string') {
      const lower = item.toLowerCase();
      if (lower === 'all' || lower.startsWith('all ')) return { id: 'all', label: item };
      return { id: item, label: item };
    }
    return {
      id: String(item.id || item.label || 'all'),
      label: String(item.label || item.id || 'All')
    };
  });
}

export function getCategoryLabel(categoryId) {
  if (!categoryId) return '';
  const { categories } = getAtlasCatalog();
  const match = categories.find(c => c.id === categoryId || c.label === categoryId);
  return match ? match.label : String(categoryId);
}

export function getAtlasCatalog() {
  const projects = Array.isArray(atlasDataModule.FOUNDER_ATLAS_PROJECTS)
    ? atlasDataModule.FOUNDER_ATLAS_PROJECTS
    : [];
  const categories = normalizeCategoryList(atlasDataModule.FOUNDER_ATLAS_CATEGORIES);
  const sources = Array.isArray(atlasDataModule.FOUNDER_ATLAS_SOURCES) && atlasDataModule.FOUNDER_ATLAS_SOURCES.length
    ? atlasDataModule.FOUNDER_ATLAS_SOURCES
    : DEFAULT_SOURCES;
  return { projects, categories, sources };
}

export function mergeFounderAtlasProjects(currentProjects, hydrateProjectFn) {
  const { projects: catalog } = getAtlasCatalog();
  if (!catalog.length) return currentProjects;

  const byId = new Map();
  for (const existing of currentProjects || []) {
    if (existing?.id) byId.set(existing.id, existing);
  }

  const merged = [];
  for (const rawCatalogProject of catalog) {
    const hydratedCatalog = hydrateProjectFn ? hydrateProjectFn(structuredClone(rawCatalogProject), 4) : structuredClone(rawCatalogProject);
    if (byId.has(rawCatalogProject.id)) {
      const existing = byId.get(rawCatalogProject.id);
      const isGenericSeed = !existing.code && ['floppy', 'orbit', 'handoff'].includes(existing.id);
      const enriched = isGenericSeed ? {
        ...existing,
        ...hydratedCatalog,
        unlockedStage: 4
      } : {
        ...hydratedCatalog,
        ...existing,
        code: existing.code || rawCatalogProject.code,
        category: existing.category || rawCatalogProject.category,
        verificationBadge: existing.verificationBadge || rawCatalogProject.verificationBadge,
        nextAction: existing.nextAction || rawCatalogProject.nextAction,
        sources: Array.isArray(existing.sources) && existing.sources.length ? existing.sources : (rawCatalogProject.sources || []),
        localPath: existing.localPath || rawCatalogProject.localPath || '',
        repoUrl: existing.repoUrl || rawCatalogProject.repoUrl || '',
        liveUrl: existing.liveUrl || rawCatalogProject.liveUrl || '',
        stageChecklist: existing.stageChecklist || rawCatalogProject.stageChecklist || {},
        unlockedStage: 4
      };
      if (!Array.isArray(enriched.contexts) || !enriched.contexts.length) {
        enriched.contexts = hydratedCatalog.contexts || [];
      }
      merged.push(enriched);
      byId.delete(rawCatalogProject.id);
    } else {
      hydratedCatalog.unlockedStage = 4;
      merged.push(hydratedCatalog);
    }
  }

  // Append any custom user-created projects not in the catalog (skip unmodified vanilla demo placeholders)
  for (const remaining of byId.values()) {
    if (!remaining.code && ['orbit', 'handoff'].includes(remaining.id) && !(remaining.history?.length)) continue;
    merged.push(remaining);
  }

  return merged;
}

export function createAtlasState() {
  return {
    viewMode: 'carousel', // 'carousel' | 'grid' | 'matrix' | 'vault'
    category: 'all',
    source: 'All Sources',
    vaultSearch: '',
    vaultSource: 'All Sources'
  };
}

export function projectMatchesAtlasFilters(project, { query = '', category = 'all', source = 'All Sources' } = {}) {
  const catFilter = String(category || 'all').toLowerCase();
  if (catFilter && catFilter !== 'all') {
    const projCatId = String(project.category || '').toLowerCase();
    const projCatLabel = String(getCategoryLabel(project.category) || '').toLowerCase();
    if (projCatId !== catFilter && projCatLabel !== catFilter && !projCatLabel.includes(catFilter)) {
      return false;
    }
  }
  if (source && source !== 'All Sources') {
    const pSources = Array.isArray(project.sources) ? project.sources : [];
    const contextSources = (project.contexts || []).map(c => c.sourceBadge || c.source || c.kind || c.title || '');
    const matchSource = pSources.some(s => String(s).toLowerCase().includes(source.toLowerCase())) ||
      contextSources.some(s => String(s).toLowerCase().includes(source.toLowerCase()));
    if (!matchSource) return false;
  }
  const q = query.trim().toLowerCase();
  if (q) {
    const haystack = [
      project.code,
      project.name,
      project.productName,
      project.subtitle,
      project.projectDescription,
      project.category,
      getCategoryLabel(project.category),
      project.verificationBadge,
      project.nextAction,
      project.context,
      project.problem,
      project.audience,
      project.localPath,
      project.repoUrl,
      project.liveUrl,
      project.idea?.rawIdea,
      ...(project.sources || []),
      ...(project.contexts || []).map(c => `${c.title || ''} ${c.text || ''} ${c.sourceBadge || c.source || ''}`)
    ].map(v => String(v || '').toLowerCase());
    if (!haystack.some(text => text.includes(q))) return false;
  }
  return true;
}

export function renderAtlasCommandBar(container, state, { totalCount = 32, filteredCount = 32, onChange } = {}) {
  if (!container) return;
  const { categories, sources } = getAtlasCatalog();
  const normalizedSources = sources.includes('All Sources') ? sources : ['All Sources', ...sources];
  const activeCat = String(state.category || 'all').toLowerCase();

  container.innerHTML = `
    <div class="atlas-command-top">
      <div class="atlas-view-tabs" role="tablist" aria-label="Founder Atlas view modes">
        <button type="button" role="tab" class="atlas-view-tab ${state.viewMode === 'carousel' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'carousel'}" data-atlas-view="carousel">💾 Disk Carousel</button>
        <button type="button" role="tab" class="atlas-view-tab ${state.viewMode === 'grid' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'grid'}" data-atlas-view="grid">🗂️ Atlas Grid</button>
        <button type="button" role="tab" class="atlas-view-tab ${state.viewMode === 'matrix' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'matrix'}" data-atlas-view="matrix">🧭 5-Stage Lifecycle Matrix</button>
        <button type="button" role="tab" class="atlas-view-tab ${state.viewMode === 'vault' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'vault'}" data-atlas-view="vault">🔎 Cross-History Vault</button>
      </div>
      <div class="atlas-source-filter">
        <label class="sr-only" for="atlasSourceSelect">Filter by history source</label>
        <select id="atlasSourceSelect" aria-label="Filter by history source">
          ${normalizedSources.map(src => `<option value="${esc(src)}" ${state.source === src ? 'selected' : ''}>${esc(src)}</option>`).join('')}
        </select>
        <span class="atlas-count-pill" role="status">${filteredCount} / ${totalCount} ventures</span>
      </div>
    </div>
    <div class="atlas-category-bar" role="group" aria-label="Filter by venture category">
      ${categories.map(cat => {
        const isCurrent = activeCat === cat.id.toLowerCase() || activeCat === cat.label.toLowerCase();
        return `<button type="button" class="atlas-category-pill ${isCurrent ? 'is-active' : ''}" data-atlas-category="${esc(cat.id)}" aria-pressed="${isCurrent}">${esc(cat.label)}</button>`;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-atlas-view]').forEach(btn => {
    btn.onclick = () => {
      state.viewMode = btn.dataset.atlasView;
      if (onChange) onChange();
    };
  });

  container.querySelectorAll('[data-atlas-category]').forEach(btn => {
    btn.onclick = () => {
      state.category = btn.dataset.atlasCategory;
      if (onChange) onChange();
    };
  });

  const sourceSelect = container.querySelector('#atlasSourceSelect');
  if (sourceSelect) {
    sourceSelect.onchange = e => {
      state.source = e.target.value;
      if (onChange) onChange();
    };
  }
}

export function renderAtlasGridView(container, projects, {
  activeId,
  colorOf,
  projectProgress,
  projectArtSource,
  onSelectProject,
  onOpenProject
} = {}) {
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `<div class="empty-projects"><p>No ventures match the current filters.</p><button class="secondary" type="button" data-reset-atlas-filters>Reset filters</button></div>`;
    return;
  }

  container.innerHTML = `
    <div class="atlas-grid">
      ${projects.map(p => {
        const color = colorOf ? colorOf(p) : (p.color || '#cf6c2c');
        const progress = projectProgress ? projectProgress(p) : 0;
        const stageName = STAGE_LABELS[p.stage || 0] || STAGE_LABELS[0];
        const code = p.code || 'OV-00';
        const badge = p.verificationBadge || 'Verified on Disk';
        const catLabel = getCategoryLabel(p.category);
        const sources = Array.isArray(p.sources) && p.sources.length ? p.sources : ['Desktop Hub'];
        const nextAction = p.nextAction || 'Confirm next milestone in workspace.';
        const artSrc = projectArtSource ? projectArtSource(p) : (p.projectArt?.sourceUrl || 'art/floppy.png');

        return `
          <article class="atlas-card ${p.id === activeId ? 'is-selected' : ''}" data-project-id="${esc(p.id)}" style="--card-accent:${esc(color)}">
            <div class="atlas-card-header">
              <div class="atlas-mini-floppy" style="--disk-color:${esc(color)}">
                <img src="${esc(artSrc)}" alt="" loading="lazy">
              </div>
              <div class="atlas-card-titles">
                <div class="atlas-card-badges">
                  <span class="atlas-code-badge">${esc(code)}</span>
                  <span class="atlas-stage-badge stage-${Number(p.stage || 0)}">${esc(stageName)}</span>
                  <span class="atlas-progress-badge">${progress}%</span>
                </div>
                <h3>${esc(p.name)}</h3>
                <p class="atlas-card-subtitle">${esc(p.subtitle || '')}</p>
              </div>
            </div>
            <div class="atlas-verification-row">
              <span class="atlas-verified-pill">✓ ${esc(badge)}</span>
              ${catLabel ? `<span class="atlas-category-tag">${esc(catLabel)}</span>` : ''}
            </div>
            <div class="atlas-next-action-box">
              <span class="eyebrow">NEXT ACTION</span>
              <p>${esc(nextAction)}</p>
            </div>
            <div class="atlas-card-footer">
              <div class="atlas-source-pills">
                ${sources.slice(0, 4).map(s => `<span class="atlas-source-pill">${esc(s)}</span>`).join('')}
                ${sources.length > 4 ? `<span class="atlas-source-pill">+${sources.length - 4}</span>` : ''}
              </div>
              <button type="button" class="primary atlas-open-btn" data-open-project="${esc(p.id)}">Open Project →</button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.atlas-card').forEach(card => {
    card.onclick = e => {
      if (e.target.closest('[data-open-project]')) return;
      if (onSelectProject) onSelectProject(card.dataset.projectId);
    };
  });

  container.querySelectorAll('[data-open-project]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      if (onOpenProject) onOpenProject(btn.dataset.openProject);
    };
  });
}

export function renderAtlasMatrixView(container, projects, {
  colorOf,
  projectProgress,
  onOpenProject
} = {}) {
  if (!container) return;

  const columns = STAGE_LABELS.map((label, stageIndex) => {
    const items = projects.filter(p => Number(p.stage || 0) === stageIndex);
    return { label, stageIndex, items };
  });

  container.innerHTML = `
    <div class="atlas-matrix">
      ${columns.map(col => `
        <section class="atlas-matrix-column" aria-label="${esc(col.label)}">
          <header class="atlas-matrix-header stage-${col.stageIndex}">
            <h3>${esc(col.label)}</h3>
            <span class="atlas-matrix-count">${col.items.length}</span>
          </header>
          <div class="atlas-matrix-list">
            ${col.items.length ? col.items.map(p => {
              const color = colorOf ? colorOf(p) : (p.color || '#cf6c2c');
              const progress = projectProgress ? projectProgress(p) : 0;
              return `
                <article class="atlas-matrix-card" style="--card-accent:${esc(color)}">
                  <div class="atlas-matrix-card-top">
                    <span class="atlas-code-badge">${esc(p.code || 'OV')}</span>
                    <span class="atlas-progress-badge">${progress}%</span>
                  </div>
                  <h4>${esc(p.name)}</h4>
                  <p class="atlas-matrix-sub">${esc(p.subtitle || '')}</p>
                  ${p.verificationBadge ? `<p class="atlas-matrix-verified">✓ ${esc(p.verificationBadge)}</p>` : ''}
                  <div class="atlas-matrix-next">
                    <strong>Next:</strong> ${esc(p.nextAction || 'Open dossier')}
                  </div>
                  <button type="button" class="secondary atlas-matrix-open" data-open-project="${esc(p.id)}">Open Project →</button>
                </article>
              `;
            }).join('') : `<p class="atlas-matrix-empty">No ventures in this stage.</p>`}
          </div>
        </section>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-open-project]').forEach(btn => {
    btn.onclick = () => {
      if (onOpenProject) onOpenProject(btn.dataset.openProject);
    };
  });
}

export function renderCrossHistoryVaultView(container, allProjects, state, {
  onOpenProject,
  onStateChange
} = {}) {
  if (!container) return;
  const { sources } = getAtlasCatalog();
  const normalizedSources = sources.includes('All Sources') ? sources : ['All Sources', ...sources];

  // Collect all context entries across all projects
  const entries = [];
  for (const p of allProjects) {
    for (const ctx of (p.contexts || [])) {
      const sourceLabel = ctx.sourceBadge || ctx.source || ctx.kind || (p.sources && p.sources[0]) || 'Desktop Hub';
      entries.push({
        id: ctx.id || `${p.id}-${entries.length}`,
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code || 'OV',
        projectColor: p.color || '#cf6c2c',
        projectStage: STAGE_LABELS[p.stage || 0] || '1. Idea',
        title: ctx.title || ctx.fileName || 'Historical Context Note',
        text: ctx.text || ctx.url || '',
        source: sourceLabel,
        date: ctx.createdAt || ctx.date || p.updatedAt || '',
        url: ctx.sourceUrl || ctx.url || ''
      });
    }
  }

  const vQuery = (state.vaultSearch || '').trim().toLowerCase();
  const vSource = state.vaultSource || 'All Sources';

  const filteredEntries = entries.filter(item => {
    if (vSource !== 'All Sources') {
      const sMatch = String(item.source).toLowerCase().includes(vSource.toLowerCase()) ||
        String(item.title).toLowerCase().includes(vSource.toLowerCase());
      if (!sMatch) return false;
    }
    if (vQuery) {
      const hay = `${item.projectCode} ${item.projectName} ${item.title} ${item.text} ${item.source}`.toLowerCase();
      if (!hay.includes(vQuery)) return false;
    }
    return true;
  });

  container.innerHTML = `
    <div class="atlas-vault">
      <header class="atlas-vault-header">
        <div>
          <h2>Cross-History Intelligence Vault</h2>
          <p class="small">Unified searchable feed across <code>thecommonquarters@gmail.com</code> Google Keep, Google AI Studio, NotebookLM, Codex, ZCode, Claude Code, GitHub, and Desktop workspaces.</p>
        </div>
        <div class="atlas-vault-controls">
          <input type="search" id="atlasVaultSearch" placeholder="Search Keep notes, AI Studio prompts, Codex logs…" value="${esc(state.vaultSearch || '')}">
          <select id="atlasVaultSourceSelect" aria-label="Filter vault by source">
            ${normalizedSources.map(src => `<option value="${esc(src)}" ${vSource === src ? 'selected' : ''}>${esc(src)}</option>`).join('')}
          </select>
          <span class="atlas-count-pill">${filteredEntries.length} records</span>
        </div>
      </header>
      <div class="atlas-vault-feed">
        ${filteredEntries.length ? filteredEntries.map(item => `
          <article class="atlas-vault-card" style="--card-accent:${esc(item.projectColor)}">
            <div class="atlas-vault-meta">
              <span class="atlas-code-badge">${esc(item.projectCode)}</span>
              <strong>${esc(item.projectName)}</strong>
              <span class="atlas-source-pill is-highlight">${esc(item.source)}</span>
              <span class="atlas-stage-badge">${esc(item.projectStage)}</span>
              ${item.date ? `<span class="atlas-vault-date">${esc(String(item.date).slice(0, 10))}</span>` : ''}
            </div>
            <h3>${esc(item.title)}</h3>
            <p class="atlas-vault-excerpt">${esc(item.text)}</p>
            <div class="atlas-vault-actions">
              ${safeLink(item.url) ? `<a href="${esc(safeLink(item.url))}" target="_blank" rel="noopener noreferrer" class="secondary">Source Link ↗</a>` : ''}
              <button type="button" class="primary" data-open-project="${esc(item.projectId)}">Open ${esc(item.projectName)} →</button>
            </div>
          </article>
        `).join('') : `<div class="empty-projects"><p>No vault records match that filter.</p></div>`}
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#atlasVaultSearch');
  if (searchInput) {
    searchInput.oninput = e => {
      state.vaultSearch = e.target.value;
      if (onStateChange) onStateChange('vaultSearch');
    };
  }

  const sourceSelect = container.querySelector('#atlasVaultSourceSelect');
  if (sourceSelect) {
    sourceSelect.onchange = e => {
      state.vaultSource = e.target.value;
      if (onStateChange) onStateChange('vaultSource');
    };
  }

  container.querySelectorAll('[data-open-project]').forEach(btn => {
    btn.onclick = () => {
      if (onOpenProject) onOpenProject(btn.dataset.openProject);
    };
  });
}

export function renderFounderDossierBanner(bannerEl, project, { onCopyText } = {}) {
  if (!bannerEl || !project) return;

  const hasDossier = Boolean(project.code || project.nextAction || project.verificationBadge || project.localPath || project.repoUrl || project.liveUrl);
  if (!hasDossier) {
    bannerEl.hidden = true;
    bannerEl.innerHTML = '';
    return;
  }

  bannerEl.hidden = false;
  const code = project.code || 'OV-00';
  const badge = project.verificationBadge || 'Verified Telemetry';
  const catLabel = getCategoryLabel(project.category);
  const sources = Array.isArray(project.sources) && project.sources.length ? project.sources : ['Desktop Hub'];
  const nextAction = project.nextAction || 'Review and confirm next stage milestone.';
  const repoHref = safeLink(project.repoUrl);
  const liveHref = safeLink(project.liveUrl);

  bannerEl.innerHTML = `
    <div class="dossier-banner-inner">
      <div class="dossier-next-action">
        <span class="dossier-next-eyebrow">⚡ DOMINANT NEXT ACTION</span>
        <p class="dossier-next-text">${esc(nextAction)}</p>
      </div>
      <div class="dossier-meta-cluster">
        <div class="dossier-pills">
          <span class="atlas-code-badge">${esc(code)}</span>
          ${catLabel ? `<span class="atlas-category-tag">${esc(catLabel)}</span>` : ''}
          <span class="atlas-verified-pill">✓ ${esc(badge)}</span>
          ${sources.map(s => `<span class="atlas-source-pill">${esc(s)}</span>`).join('')}
        </div>
        <div class="dossier-quick-actions">
          ${project.localPath ? `<button type="button" class="secondary dossier-action-btn" id="copyProjectLocalPath" title="${esc(project.localPath)}">📋 Copy Local Path</button>` : ''}
          ${repoHref ? `<a href="${esc(repoHref)}" target="_blank" rel="noopener noreferrer" class="secondary dossier-action-btn">GitHub Repo ↗</a>` : ''}
          ${liveHref ? `<a href="${esc(liveHref)}" target="_blank" rel="noopener noreferrer" class="primary dossier-action-btn">Live App ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;

  const copyBtn = bannerEl.querySelector('#copyProjectLocalPath');
  if (copyBtn && project.localPath) {
    copyBtn.onclick = () => {
      if (onCopyText) onCopyText(project.localPath, `Copied path: ${project.localPath}`);
    };
  }
}

export function renderStageGateDossierPanel(rootEl, project, stageIndex, {
  phases,
  onSaveNotes,
  onSwitchStage,
  onToggleChecklistItem,
  onOpenPrototypeStaging
} = {}) {
  if (!rootEl || !project) return;
  const stageName = phases?.[stageIndex] || STAGE_SHORT_NAMES[stageIndex] || 'Stage';
  const checklistObj = project.stageChecklist || {};
  const rawChecklist = checklistObj[stageIndex] || checklistObj[String(stageIndex)] || checklistObj[stageName] || checklistObj[stageName.toLowerCase()] || [];

  const checklist = Array.isArray(rawChecklist) && rawChecklist.length
    ? rawChecklist
    : getDefaultStageChecklist(project, stageIndex);

  const sources = project.contexts || [];
  const noteVal = project.phaseNotes?.[stageIndex] || '';

  rootEl.classList.remove('idea-mode', 'investigation-mode', 'product-thinking');
  rootEl.innerHTML = `
    <div class="stage-gate-panel">
      <div class="stage-gate-header">
        <div>
          <span class="eyebrow">PHASE 0${stageIndex + 1} // ${esc(stageName.toUpperCase())} ENGINEERING DOSSIER</span>
          <h2>${esc(project.name)} — ${esc(stageName)} Gate & Telemetry</h2>
          <p class="description">${esc(project.subtitle || project.problem || '')}</p>
        </div>
        <div class="stage-gate-badges">
          <span class="atlas-code-badge">${esc(project.code || 'OV')}</span>
          <span class="atlas-verified-pill">✓ ${esc(project.verificationBadge || 'Disk Verified')}</span>
        </div>
      </div>

      <section class="stage-gate-card stage-next-callout">
        <span class="eyebrow">DOMINANT NEXT ACTION FOR THIS VENTURE</span>
        <p><strong>${esc(project.nextAction || 'Complete current stage verification checklist.')}</strong></p>
        ${project.localPath ? `<p class="small mono">Local Workspace: ${esc(project.localPath)}</p>` : ''}
      </section>

      <div class="stage-gate-grid">
        <section class="stage-gate-card">
          <div class="staging-card-heading">
            <div>
              <span class="eyebrow">STAGE GATE CHECKLIST</span>
              <h3>${esc(stageName)} Verification Criteria</h3>
            </div>
            <span class="staging-badge is-ready">${checklist.filter(item => item.done ?? item.completed ?? true).length} / ${checklist.length} verified</span>
          </div>
          <ul class="stage-checklist">
            ${checklist.map((item, idx) => {
              const label = typeof item === 'string' ? item : (item.label || item.text || item.title || '');
              const checked = typeof item === 'object' && item !== null ? (item.done ?? item.completed ?? true) : true;
              const detail = typeof item === 'object' && item !== null ? (item.detail || item.evidence || '') : '';
              return `
                <li class="stage-checklist-item ${checked ? 'is-done' : ''}">
                  <label class="check-label">
                    <input type="checkbox" data-checklist-index="${idx}" ${checked ? 'checked' : ''}>
                    <div>
                      <strong>${esc(label)}</strong>
                      ${detail ? `<small>${esc(detail)}</small>` : ''}
                    </div>
                  </label>
                </li>
              `;
            }).join('')}
          </ul>
        </section>

        <section class="stage-gate-card">
          <div class="staging-card-heading">
            <div>
              <span class="eyebrow">VERIFIED ARTIFACTS & SOURCES</span>
              <h3>Cross-History Evidence (${sources.length})</h3>
            </div>
            <span class="staging-badge">${(project.sources || []).length || 1} platforms</span>
          </div>
          <div class="stage-sources-list">
            ${sources.length ? sources.map(c => `
              <article class="stage-source-item">
                <div class="stage-source-meta">
                  <span class="atlas-source-pill">${esc(c.sourceBadge || c.source || c.kind || 'VAULT')}</span>
                  <strong>${esc(c.title || c.fileName || 'Captured Artifact')}</strong>
                </div>
                <p>${esc(c.text || c.url || '')}</p>
              </article>
            `).join('') : `<p class="small">No external context records attached yet.</p>`}
          </div>
        </section>
      </div>

      <section class="stage-gate-card">
        <label for="phaseAnswer"><strong>Founder Notes & Decisions for ${esc(stageName)}</strong></label>
        <textarea id="phaseAnswer" rows="4" maxlength="8000" placeholder="Capture engineering blockers, launch telemetry, or architecture notes for ${esc(stageName)}…">${esc(noteVal)}</textarea>
        <div class="action-buttons">
          <button type="button" class="primary" id="savePhase">Save ${esc(stageName)} Notes</button>
          ${stageIndex === 1 && onOpenPrototypeStaging ? `<button type="button" class="secondary" id="openSystemPromptBuilder">Open Agent PRD & Prompt Builder</button>` : ''}
          <button type="button" class="secondary" id="returnIdea">Open 13-Chapter Idea Studio (Phase 1) ↗</button>
        </div>
      </section>
    </div>
  `;

  rootEl.querySelectorAll('[data-checklist-index]').forEach(checkbox => {
    checkbox.onchange = () => {
      const idx = Number(checkbox.dataset.checklistIndex);
      if (onToggleChecklistItem) onToggleChecklistItem(stageIndex, idx, checkbox.checked, checklist);
    };
  });

  rootEl.querySelector('#savePhase')?.addEventListener('click', () => {
    const val = rootEl.querySelector('#phaseAnswer')?.value.trim() || '';
    if (onSaveNotes) onSaveNotes(stageIndex, val);
  });

  rootEl.querySelector('#openSystemPromptBuilder')?.addEventListener('click', () => {
    if (onOpenPrototypeStaging) onOpenPrototypeStaging();
  });

  rootEl.querySelector('#returnIdea')?.addEventListener('click', () => {
    if (onSwitchStage) onSwitchStage(0);
  });
}

function getDefaultStageChecklist(project, stageIndex) {
  const name = project.name || 'Venture';
  if (stageIndex === 1) {
    return [
      { label: `Core architecture & working prototype scaffolded for ${name}`, done: project.stage >= 1, detail: project.localPath || 'Local repository verified' },
      { label: 'Primary user workflow & interactive slice validated', done: project.stage >= 1, detail: project.verificationBadge || 'Prototype telemetry' },
      { label: `Next milestone queued: ${project.nextAction || 'Advance to MVP'}`, done: project.stage > 1 }
    ];
  }
  if (stageIndex === 2) {
    return [
      { label: 'End-to-end persistence & real service integration wired', done: project.stage >= 2, detail: project.verificationBadge || 'MVP verification' },
      { label: 'Automated unit/integration test suite or verification harness active', done: project.stage >= 2 },
      { label: `Next milestone queued: ${project.nextAction || 'Production readiness review'}`, done: project.stage > 2 }
    ];
  }
  if (stageIndex === 3) {
    return [
      { label: 'Production deployment configuration & environment hardened', done: project.stage >= 3, detail: project.liveUrl || project.repoUrl || project.localPath || '' },
      { label: 'Security, auth, and edge reliability verified', done: project.stage >= 3, detail: project.verificationBadge || '' },
      { label: `Next milestone queued: ${project.nextAction || 'Post-production telemetry'}`, done: project.stage > 3 }
    ];
  }
  return [
    { label: 'Live user feedback loop & operational telemetry active', done: project.stage >= 4 },
    { label: 'Iterative roadmap & multi-agent maintenance workflow established', done: project.stage >= 4 },
    { label: `Current focus: ${project.nextAction || 'Continuous expansion'}`, done: false }
  ];
}
