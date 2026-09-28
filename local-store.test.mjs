import test from 'node:test';
import assert from 'node:assert/strict';
import { savedAtFromSnapshot, withSaveTime } from './local-store.mjs';

test('local snapshots preserve their save timestamp', () => {
  const raw = withSaveTime({ version: 4, projects: [] }, 123456789);

  assert.equal(savedAtFromSnapshot(raw), 123456789);
});

test('malformed local snapshots are treated as untimestamped', () => {
  assert.equal(savedAtFromSnapshot('{not-json'), 0);
});
