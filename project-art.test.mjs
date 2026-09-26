import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ART_GENERATION_RATIOS,
  FLOPPY_ART_WINDOW_ASPECT_RATIO,
  FLOPPY_GEOMETRY,
  commitProjectArt,
  createProjectArt,
  cropImageStyle,
  nearestSupportedAspectRatio,
  normalizeProjectArt,
} from './project-art.mjs';

test('legacy image paths migrate into structured project-art data', () => {
  assert.deepEqual(normalizeProjectArt(undefined, 'art/orbit.png'), {
    sourceUrl: 'art/orbit.png',
    sourceType: 'legacy',
    prompt: '',
    useProjectContext: true,
    references: [],
    crop: { x: 0.5, y: 0.5, zoom: 1 },
    generatedAt: null,
    updatedAt: null,
  });
});

test('crop values are normalized to safe position and zoom bounds', () => {
  const art = createProjectArt({
    sourceUrl: 'data:image/jpeg;base64,AA==',
    sourceType: 'upload',
    crop: { x: 2, y: -1, zoom: 9 },
  });
  assert.deepEqual(art.crop, { x: 1, y: 0, zoom: 3 });
});

test('structured art preserves bounded reference images and generation metadata', () => {
  const art = createProjectArt({
    sourceUrl: 'data:image/jpeg;base64,AA==',
    sourceType: 'generated',
    generatedAt: '2026-09-24T12:00:00.000Z',
    references: [
      { id: 'ref-1', title: 'Current disk artwork', type: 'current', sourceUrl: 'data:image/png;base64,AA==' },
      { id: 'bad', title: 'Not an image', type: 'uploaded', sourceUrl: 'javascript:alert(1)' },
    ],
  });
  assert.equal(art.generatedAt, '2026-09-24T12:00:00.000Z');
  assert.deepEqual(art.references, [
    { id: 'ref-1', title: 'Current disk artwork', type: 'current', sourceUrl: 'data:image/png;base64,AA==' },
  ]);
});

test('editor and floppy crop styles share the same normalized framing', () => {
  const crop = { x: 0.25, y: 0.7, zoom: 1.5 };
  const style = cropImageStyle({ imageWidth: 2400, imageHeight: 600, frameAspectRatio: FLOPPY_ART_WINDOW_ASPECT_RATIO, crop });
  assert.deepEqual(style, { width: '300%', height: '150%', left: '-50%', top: '-35%' });
});

test('new upload or generation remains a candidate until explicitly committed', () => {
  const saved = { projectArt: createProjectArt({ sourceUrl: 'art/orbit.png' }), customArt: false };
  const savedBefore = structuredClone(saved);
  const candidate = createProjectArt({
    sourceUrl: 'data:image/jpeg;base64,AA==',
    sourceType: 'upload',
    references: [{ id: 'ref-1', title: 'Mood board', type: 'uploaded', sourceUrl: 'data:image/png;base64,AA==' }],
  });
  assert.deepEqual(saved, savedBefore);

  commitProjectArt(saved, candidate, '2026-09-24T12:00:00.000Z');
  assert.equal(saved.projectArt.sourceUrl, candidate.sourceUrl);
  assert.equal(saved.projectArt.sourceType, 'upload');
  assert.equal(saved.projectArt.updatedAt, '2026-09-24T12:00:00.000Z');
  assert.equal(saved.projectArt.references[0].title, 'Mood board');
  assert.equal(saved.customArt, true);
  assert.equal('art' in saved, false);
});

test('image generation selects the closest supported ratio to the floppy art window', () => {
  assert.equal(FLOPPY_ART_WINDOW_ASPECT_RATIO, 2);
  assert.equal(FLOPPY_GEOMETRY.artAspectRatio, 2);
  assert.equal(FLOPPY_GEOMETRY.artTop, '39%');
  assert.equal(FLOPPY_GEOMETRY.artWidth, '80%');
  assert.equal(nearestSupportedAspectRatio(FLOPPY_ART_WINDOW_ASPECT_RATIO, ART_GENERATION_RATIOS), '16:9');
});
