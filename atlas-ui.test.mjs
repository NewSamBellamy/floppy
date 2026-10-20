import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAtlasCatalog,
  mergeFounderAtlasProjects,
  projectMatchesAtlasFilters,
  createAtlasState
} from './atlas-ui.mjs';

test('Founder Atlas catalog loads all 32 ventures, categories, and sources', () => {
  const { projects, categories, sources } = getAtlasCatalog();
  assert.equal(projects.length, 32, 'Expected 32 Founder Atlas projects');
  assert.ok(categories.length >= 8, 'Expected at least 8 category filters');
  assert.ok(sources.includes('Google Keep'), 'Expected Google Keep in sources');
  assert.ok(sources.includes('Google AI Studio'), 'Expected Google AI Studio in sources');
});

test('mergeFounderAtlasProjects upgrades 3-project seed to 32 projects while preserving custom projects', () => {
  const seedProjects = [
    { id: 'floppy', name: 'Floppy', subtitle: 'Seed', stage: 0 },
    { id: 'custom-user-idea', name: 'Custom Idea', subtitle: 'User created', stage: 0 }
  ];
  const merged = mergeFounderAtlasProjects(seedProjects, p => ({ ...p }));
  assert.equal(merged.length, 33, 'Expected 32 catalog projects + 1 custom user project');
  const floppy = merged.find(p => p.id === 'floppy');
  assert.equal(floppy.code, 'OV-06');
  assert.equal(floppy.unlockedStage, 4);
});

test('projectMatchesAtlasFilters filters by category, source, and search query', () => {
  const { projects } = getAtlasCatalog();
  const state = createAtlasState();
  assert.equal(state.viewMode, 'carousel');

  const priorityProjects = projects.filter(p => projectMatchesAtlasFilters(p, { category: 'priority' }));
  assert.ok(priorityProjects.length > 0 && priorityProjects.length < projects.length);

  const keepProjects = projects.filter(p => projectMatchesAtlasFilters(p, { source: 'Google Keep' }));
  assert.ok(keepProjects.length > 0);

  const codeMatch = projects.filter(p => projectMatchesAtlasFilters(p, { query: 'OV-06' }));
  assert.equal(codeMatch.length, 1);
  assert.equal(codeMatch[0].id, 'floppy');
});
