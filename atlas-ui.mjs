// Floppy: Studio Archive — Quiet Skate-Shop / Studio Vault UI Controller
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

export const STUDIO_CATEGORY_OPTIONS = [
  { id: 'all', label: 'All 32' },
  { id: 'priority', label: 'Priority' },
  { id: 'saas', label: 'Core SaaS' },
  { id: 'infra', label: 'Agent Infra' },
  { id: 'creative', label: 'Creative' },
  { id: 'spatial', label: 'Spatial & Hardware' },
  { id: 'keep', label: 'Vault Origins' },
  { id: 'ops', label: 'Ops' }
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

export const DECK_STAGE_TAGS = [
  'Idea',
  'Prototype',
  'MVP',
  'Live',
  'Live'
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
  const cleanMatch = STUDIO_CATEGORY_OPTIONS.find(c => c.id === categoryId);
  if (cleanMatch && cleanMatch.id !== 'all') return cleanMatch.label;
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
        name: existing.name && existing.name !== 'Floppy' ? existing.name : hydratedCatalog.name,
        unlockedStage: 4
      } : {
        ...hydratedCatalog,
        ...existing,
        code: existing.code || rawCatalogProject.code,
        category: existing.category || rawCatalogProject.category,
        verificationBadge: existing.verificationBadge || rawCatalogProject.verificationBadge,
        subtitle: (existing.subtitle && existing.subtitle.length < 85) ? existing.subtitle : rawCatalogProject.subtitle,
        nextAction: (existing.nextAction && existing.nextAction.length < 85) ? existing.nextAction : rawCatalogProject.nextAction,
        sources: Array.isArray(existing.sources) && existing.sources.length ? existing.sources : (rawCatalogProject.sources || []),
        localPath: existing.localPath || rawCatalogProject.localPath || '',
        repoUrl: existing.repoUrl || rawCatalogProject.repoUrl || '',
        liveUrl: existing.liveUrl || rawCatalogProject.liveUrl || '',
        stageChecklist: existing.stageChecklist || rawCatalogProject.stageChecklist || {},
        unlockedStage: 4
      };
      if (existing.customArt !== true) {
        const hasEditedBuiltinCrop = Boolean(
          existing.projectArt?.updatedAt &&
          typeof existing.projectArt?.sourceUrl === 'string' &&
          !existing.projectArt.sourceUrl.startsWith('data:image/svg+xml')
        );
        enriched.projectArt = hasEditedBuiltinCrop
          ? { ...hydratedCatalog.projectArt, crop: existing.projectArt.crop, updatedAt: existing.projectArt.updatedAt }
          : hydratedCatalog.projectArt;
      }
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
  const activeCat = String(state.category || 'all').toLowerCase();

  const pieceCountEl = typeof document !== 'undefined' ? document.getElementById('studioPieceCount') : null;
  if (pieceCountEl) {
    pieceCountEl.textContent = filteredCount === totalCount ? `${totalCount} pieces` : `${filteredCount} / ${totalCount} pieces`;
  }

  container.innerHTML = `
    <div class="studio-view-switcher" role="tablist" aria-label="Studio Archive view modes">
      <button type="button" role="tab" class="studio-view-btn ${state.viewMode === 'carousel' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'carousel'}" data-atlas-view="carousel">Shelf</button>
      <button type="button" role="tab" class="studio-view-btn ${state.viewMode === 'grid' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'grid'}" data-atlas-view="grid">Deck Wall</button>
      <button type="button" role="tab" class="studio-view-btn ${state.viewMode === 'matrix' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'matrix'}" data-atlas-view="matrix">Stages</button>
      <button type="button" role="tab" class="studio-view-btn ${state.viewMode === 'vault' ? 'is-active' : ''}" aria-selected="${state.viewMode === 'vault'}" data-atlas-view="vault">Notes</button>
    </div>
    <div class="studio-category-select-wrap">
      <label class="sr-only" for="atlasCategorySelect">Filter by category</label>
      <select id="atlasCategorySelect" aria-label="Filter by category">
        ${STUDIO_CATEGORY_OPTIONS.map(cat => {
          const isSelected = activeCat === cat.id.toLowerCase();
          const label = cat.id === 'all' ? `All ${totalCount}` : cat.label;
          return `<option value="${esc(cat.id)}" ${isSelected ? 'selected' : ''}>${esc(label)}</option>`;
        }).join('')}
      </select>
    </div>
  `;

  container.querySelectorAll('[data-atlas-view]').forEach(btn => {
    btn.onclick = () => {
      state.viewMode = btn.dataset.atlasView;
      if (onChange) onChange();
    };
  });

  const catSelect = container.querySelector('#atlasCategorySelect');
  if (catSelect) {
    catSelect.onchange = e => {
      state.category = e.target.value;
      if (onChange) onChange();
    };
  }
}

export function renderAtlasGridView(container, projects, {
  activeId,
  colorOf,
  projectArtSource,
  onSelectProject,
  onOpenProject
} = {}) {
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `<div class="empty-projects"><p>No pieces match that filter.</p><button class="secondary" type="button" data-reset-atlas-filters>Reset filters</button></div>`;
    return;
  }

  container.innerHTML = `
    <div class="atlas-grid deck-wall-grid" aria-label="Skate-Shop Deck Wall of Floppy Disks">
      ${projects.map(p => {
        const color = colorOf ? colorOf(p) : (p.color || '#cf6c2c');
        const stageTag = DECK_STAGE_TAGS[Number(p.stage || 0)] || 'Idea';
        const artSrc = projectArtSource ? projectArtSource(p) : (p.projectArt?.sourceUrl || `art/atlas-${p.id}.jpg`);
        const crop = p.projectArt?.crop || { x: 0, y: 0, zoom: 1 };

        return `
          <article class="deck-wall-item ${p.id === activeId ? 'is-selected' : ''}" data-project-id="${esc(p.id)}">
            <button type="button" class="deck-wall-disk-btn" data-open-project="${esc(p.id)}" aria-label="Open ${esc(p.name)} · ${esc(stageTag)}">
              <div class="disk" style="--disk-color:${esc(color)}">
                <div class="shutter-track"></div>
                <div class="shutter"></div>
                <div class="disk-label">
                  <div class="disk-art-window" data-floppy-art-frame>
                    <img data-floppy-art-image data-crop-x="${crop.x ?? 0}" data-crop-y="${crop.y ?? 0}" data-crop-zoom="${crop.zoom ?? 1}" src="${esc(artSrc)}" alt="Artwork for ${esc(p.name)}" loading="lazy">
                  </div>
                  <div class="label-copy">
                    <strong>${esc(p.name)}</strong>
                    <span class="deck-stage-tag">${esc(stageTag)}</span>
                  </div>
                </div>
                <div class="disk-hole left"></div>
                <div class="disk-hole right"></div>
              </div>
            </button>
            <p class="deck-wall-subtitle" title="${esc(p.subtitle || '')}">${esc(p.subtitle || '')}</p>
          </article>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-open-project]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const id = btn.dataset.openProject;
      if (onSelectProject) onSelectProject(id);
      if (onOpenProject) onOpenProject(id);
    };
  });
}

export function renderAtlasMatrixView(container, projects, {
  colorOf,
  onOpenProject
} = {}) {
  if (!container) return;

  const columns = STAGE_SHORT_NAMES.map((label, stageIndex) => {
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
              return `
                <button type="button" class="atlas-matrix-card" data-open-project="${esc(p.id)}" style="--card-accent:${esc(color)}">
                  <div class="atlas-matrix-card-top">
                    <strong>${esc(p.name)}</strong>
                    <span class="atlas-code-tag">${esc(p.code || 'OV')}</span>
                  </div>
                  <p class="atlas-matrix-sub">${esc(p.subtitle || '')}</p>
                </button>
              `;
            }).join('') : `<p class="atlas-matrix-empty">No pieces</p>`}
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
        title: ctx.title || ctx.fileName || 'Archive Note',
        text: ctx.text || ctx.url || '',
        source: sourceLabel,
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
        <div class="atlas-vault-title">
          <h2>Studio Notes &amp; Provenance</h2>
          <span class="studio-piece-count">${filteredEntries.length} notes</span>
        </div>
        <div class="atlas-vault-controls">
          <input type="search" id="atlasVaultSearch" placeholder="Search Keep, AI Studio, NotebookLM, Codex…" value="${esc(state.vaultSearch || '')}">
          <select id="atlasVaultSourceSelect" aria-label="Filter notes by source">
            ${normalizedSources.map(src => `<option value="${esc(src)}" ${vSource === src ? 'selected' : ''}>${esc(src)}</option>`).join('')}
          </select>
        </div>
      </header>
      <div class="atlas-vault-feed">
        ${filteredEntries.length ? filteredEntries.map(item => `
          <article class="atlas-vault-card" style="--card-accent:${esc(item.projectColor)}">
            <div class="atlas-vault-meta">
              <span class="atlas-code-tag">${esc(item.projectCode)}</span>
              <strong>${esc(item.projectName)}</strong>
              <span class="atlas-source-pill">${esc(item.source)}</span>
            </div>
            <h3>${esc(item.title)}</h3>
            <p class="atlas-vault-excerpt">${esc(item.text)}</p>
            <div class="atlas-vault-actions">
              ${safeLink(item.url) ? `<a href="${esc(safeLink(item.url))}" target="_blank" rel="noopener noreferrer" class="quiet">Source ↗</a>` : ''}
              <button type="button" class="text-button" data-open-project="${esc(item.projectId)}">Open disk →</button>
            </div>
          </article>
        `).join('') : `<div class="empty-projects"><p>No notes match that filter.</p></div>`}
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

export function renderFounderDossierBanner(bannerEl, project, { onCopyText, onToggleSources } = {}) {
  if (!bannerEl || !project) return;

  const hasDossier = Boolean(project.code || project.nextAction || project.verificationBadge || project.localPath || project.repoUrl || project.liveUrl);
  if (!hasDossier) {
    bannerEl.hidden = true;
    bannerEl.innerHTML = '';
    return;
  }

  bannerEl.hidden = false;
  const code = project.code || 'OV-00';
  const stageTag = DECK_STAGE_TAGS[Number(project.stage || 0)] || 'Idea';
  const nextAction = project.nextAction || 'Confirm next stage milestone.';
  const repoHref = safeLink(project.repoUrl);
  const liveHref = safeLink(project.liveUrl);
  const sourcesCount = (project.contexts || []).length;

  bannerEl.innerHTML = `
    <div class="archive-strip">
      <div class="archive-strip-left">
        <span class="archive-code">${esc(code)}</span>
        <span class="archive-sep" aria-hidden="true">·</span>
        <span class="archive-stage-pill">${esc(stageTag)}</span>
        <span class="archive-sep" aria-hidden="true">·</span>
        <span class="archive-next" title="${esc(nextAction)}"><strong>Next:</strong> ${esc(nextAction)}</span>
      </div>
      <div class="archive-strip-right">
        ${repoHref ? `<a href="${esc(repoHref)}" target="_blank" rel="noopener noreferrer" class="archive-link">Repo ↗</a>` : ''}
        ${liveHref ? `<a href="${esc(liveHref)}" target="_blank" rel="noopener noreferrer" class="archive-link">Live ↗</a>` : ''}
        ${project.localPath ? `<button type="button" class="archive-link" id="copyProjectLocalPath" title="${esc(project.localPath)}">Copy Path</button>` : ''}
        <button type="button" class="archive-link" id="toggleArchiveSources">Sources (${sourcesCount})</button>
      </div>
    </div>
  `;

  const copyBtn = bannerEl.querySelector('#copyProjectLocalPath');
  if (copyBtn && project.localPath) {
    copyBtn.onclick = () => {
      if (onCopyText) onCopyText(project.localPath, `Copied path: ${project.localPath}`);
    };
  }

  const sourcesBtn = bannerEl.querySelector('#toggleArchiveSources');
  if (sourcesBtn) {
    sourcesBtn.onclick = () => {
      if (onToggleSources) {
        onToggleSources();
      } else if (typeof document !== 'undefined') {
        const details = document.getElementById('chapterContext');
        if (details) {
          details.hidden = false;
          details.open = !details.open;
          if (details.open) details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
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
          <span class="eyebrow">PHASE 0${stageIndex + 1} · ${esc(stageName.toUpperCase())}</span>
          <h2>${esc(project.name)}</h2>
          <p class="description">${esc(project.subtitle || project.problem || '')}</p>
        </div>
      </div>

      <div class="stage-gate-grid">
        <section class="stage-gate-card">
          <div class="staging-card-heading">
            <div>
              <span class="eyebrow">STAGE CHECKLIST</span>
              <h3>${esc(stageName)} Criteria</h3>
            </div>
            <span class="staging-badge is-ready">${checklist.filter(item => item.done ?? item.completed ?? true).length} / ${checklist.length}</span>
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
              <span class="eyebrow">ARCHIVE SOURCES</span>
              <h3>Provenance (${sources.length})</h3>
            </div>
          </div>
          <div class="stage-sources-list">
            ${sources.length ? sources.map(c => `
              <article class="stage-source-item">
                <div class="stage-source-meta">
                  <span class="atlas-source-pill">${esc(c.sourceBadge || c.source || c.kind || 'VAULT')}</span>
                  <strong>${esc(c.title || c.fileName || 'Artifact')}</strong>
                </div>
                <p>${esc(c.text || c.url || '')}</p>
              </article>
            `).join('') : `<p class="small">No external context records attached yet.</p>`}
          </div>
        </section>
      </div>

      <section class="stage-gate-card">
        <label for="phaseAnswer"><strong>Notes for ${esc(stageName)}</strong></label>
        <textarea id="phaseAnswer" rows="3" maxlength="8000" placeholder="Capture decisions or notes for ${esc(stageName)}…">${esc(noteVal)}</textarea>
        <div class="action-buttons">
          <button type="button" class="primary" id="savePhase">Save ${esc(stageName)} Notes</button>
          ${stageIndex === 1 && onOpenPrototypeStaging ? `<button type="button" class="secondary" id="openSystemPromptBuilder">Agent PRD &amp; Prompt Builder</button>` : ''}
          <button type="button" class="quiet" id="returnIdea">← Return to Idea Studio</button>
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
      { label: `Next: ${project.nextAction || 'Advance to MVP'}`, done: project.stage > 1 }
    ];
  }
  if (stageIndex === 2) {
    return [
      { label: 'End-to-end persistence & real service integration wired', done: project.stage >= 2, detail: project.verificationBadge || 'MVP verification' },
      { label: 'Automated unit/integration test suite active', done: project.stage >= 2 },
      { label: `Next: ${project.nextAction || 'Production readiness review'}`, done: project.stage > 2 }
    ];
  }
  if (stageIndex === 3) {
    return [
      { label: 'Production deployment configuration hardened', done: project.stage >= 3, detail: project.liveUrl || project.repoUrl || project.localPath || '' },
      { label: 'Security, auth, and edge reliability verified', done: project.stage >= 3, detail: project.verificationBadge || '' },
      { label: `Next: ${project.nextAction || 'Post-production telemetry'}`, done: project.stage > 3 }
    ];
  }
  return [
    { label: 'Live user feedback loop & operational telemetry active', done: project.stage >= 4 },
    { label: 'Iterative roadmap & maintenance workflow established', done: project.stage >= 4 },
    { label: `Current focus: ${project.nextAction || 'Continuous expansion'}`, done: false }
  ];
}
