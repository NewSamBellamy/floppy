import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FOUNDER_ATLAS_CATEGORIES,
  FOUNDER_ATLAS_SOURCES,
  FOUNDER_ATLAS_PROJECTS,
} from './founder-atlas-data.mjs';

const VALID_COLORS = new Set([
  '#cf6c2c',
  '#8672c5',
  '#358eaa',
  '#539c76',
  '#d76883',
  '#d7a43e',
  '#6d83bd',
  '#ba7253',
]);

test('FOUNDER_ATLAS_CATEGORIES and FOUNDER_ATLAS_SOURCES match exact contract', () => {
  assert.deepEqual(FOUNDER_ATLAS_CATEGORIES, [
    { id: 'all', label: 'All Projects (32)' },
    { id: 'priority', label: '🔥 Priority Sprint' },
    { id: 'saas', label: '🚀 Core SaaS & AI' },
    { id: 'infra', label: '🛠️ Agent & MCP Infra' },
    { id: 'creative', label: '🎨 Creative & Media' },
    { id: 'spatial', label: '🥽 Spatial & Hardware' },
    { id: 'keep', label: '💡 Keep & AI Studio Vault' },
    { id: 'ops', label: '🏛️ Personal & Client Ops' },
  ]);

  assert.deepEqual(FOUNDER_ATLAS_SOURCES, [
    'All Sources',
    'Google Keep',
    'Google AI Studio',
    'NotebookLM',
    'Codex',
    'ZCode',
    'Claude Code',
    'GitHub',
    'Desktop Hub',
  ]);
});

test('FOUNDER_ATLAS_PROJECTS contains all 32 unique projects with complete schema and disk contexts', () => {
  assert.equal(FOUNDER_ATLAS_PROJECTS.length, 32);

  const ids = new Set();
  const codes = new Set();
  const validCategories = new Set(
    FOUNDER_ATLAS_CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id)
  );
  const validSources = new Set(
    FOUNDER_ATLAS_SOURCES.filter((s) => s !== 'All Sources')
  );

  for (const p of FOUNDER_ATLAS_PROJECTS) {
    assert.equal(typeof p.id, 'string');
    assert.ok(p.id.length > 0, 'Project id must be non-empty');
    assert.ok(!ids.has(p.id), `Duplicate project id: ${p.id}`);
    ids.add(p.id);

    assert.match(p.code, /^OV-\d{2}$/, `Invalid code format for ${p.id}: ${p.code}`);
    assert.ok(!codes.has(p.code), `Duplicate project code: ${p.code}`);
    codes.add(p.code);

    for (const field of [
      'name',
      'productName',
      'subtitle',
      'projectDescription',
      'problem',
      'audience',
      'context',
      'nextAction',
      'localPath',
      'verificationBadge',
    ]) {
      assert.equal(typeof p[field], 'string', `${p.id}.${field} must be string`);
      assert.ok(p[field].trim().length > 0, `${p.id}.${field} must be non-empty`);
    }

    assert.equal(typeof p.repoUrl, 'string');
    assert.equal(typeof p.liveUrl, 'string');
    assert.ok(validCategories.has(p.category), `Invalid category ${p.category} on ${p.id}`);

    assert.ok(Array.isArray(p.sources) && p.sources.length > 0, `${p.id}.sources must be non-empty array`);
    for (const src of p.sources) {
      assert.ok(validSources.has(src), `Invalid source ${src} on ${p.id}`);
    }

    assert.ok(Number.isInteger(p.stage) && p.stage >= 0 && p.stage <= 4, `Invalid stage on ${p.id}`);
    assert.ok(Number.isInteger(p.chapter) && p.chapter >= 0 && p.chapter <= 12, `Invalid chapter on ${p.id}`);

    for (let ch = 0; ch <= 12; ch++) {
      assert.equal(typeof p.answers?.[ch]?.text, 'string', `${p.id} missing answer for chapter ${ch}`);
      assert.ok(p.answers[ch].text.length > 10, `${p.id} answer for chapter ${ch} too short`);
    }

    assert.equal(p.resolved?.[0], true, `${p.id} must resolve chapter 0`);
    assert.equal(p.idea?.status, 'resolved');
    assert.equal(p.idea?.needsClarification, false);
    assert.ok(p.idea?.rawIdea.length > 10);
    assert.ok(p.idea?.confirmedVersion.length > 10);

    assert.ok(Array.isArray(p.contexts) && p.contexts.length >= 2, `${p.id} must have contexts from disk`);
    for (const ctx of p.contexts) {
      assert.ok(['note', 'file', 'link'].includes(ctx.kind), `Invalid context kind ${ctx.kind}`);
      assert.ok(ctx.title && ctx.sourceBadge && ctx.text.length > 20, `Context on ${p.id} missing content`);
    }

    for (const stageKey of ['1', '2', '3', '4']) {
      assert.ok(Array.isArray(p.stageChecklist?.[stageKey]), `${p.id} missing stageChecklist[${stageKey}]`);
      assert.ok(p.stageChecklist[stageKey].length > 0);
    }

    assert.ok((p.projectArt?.sourceUrl?.startsWith('art/atlas-') && p.projectArt.sourceUrl.endsWith('.jpg')) || p.projectArt?.sourceUrl === 'art/floppy.png', `${p.id} missing studio artwork path: ${p.projectArt?.sourceUrl}`);
    assert.ok(fs.existsSync(path.resolve(p.projectArt.sourceUrl)), `Studio artwork file missing on disk: ${p.projectArt.sourceUrl}`);
    assert.ok(fs.existsSync(path.resolve('dist', p.projectArt.sourceUrl)), `Dist studio artwork file missing on disk: dist/${p.projectArt.sourceUrl}`);
    assert.ok(p.subtitle.length < 85, `${p.id} subtitle exceeds 85 chars (${p.subtitle.length})`);
    assert.ok(p.nextAction.length < 85, `${p.id} nextAction exceeds 85 chars (${p.nextAction.length})`);
    assert.equal(p.projectArt.sourceType, 'builtin');
    assert.deepEqual(p.projectArt.crop, { x: 0, y: 0, zoom: 1 });
    assert.ok(VALID_COLORS.has(p.color), `Invalid disk color ${p.color} on ${p.id}`);
    assert.deepEqual(p.done, {});
    assert.deepEqual(p.notes, []);
    assert.ok(Array.isArray(p.history) && p.history.length >= 1);
  }

  for (const requiredId of [
    'floppy',
    'lumen',
    'stratemark',
    'ai-slot-machine',
    'project-thanos',
    'open-creative-mcp',
  ]) {
    assert.ok(ids.has(requiredId), `Missing required project id: ${requiredId}`);
  }
});

test('dist/founder-atlas-data.mjs is synced with root founder-atlas-data.mjs', () => {
  const rootFile = fs.readFileSync(path.resolve('founder-atlas-data.mjs'), 'utf8');
  const distFile = fs.readFileSync(path.resolve('dist/founder-atlas-data.mjs'), 'utf8');
  assert.equal(rootFile, distFile);
});
