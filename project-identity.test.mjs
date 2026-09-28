import test from 'node:test';
import assert from 'node:assert/strict';
import { productNameFor, withProductName } from './project-identity.mjs';

test('the product name is distinct from the picker title and wins in agent context', () => {
  const project = { name: 'Research workspace', productName: 'Fieldnotes' };
  assert.equal(productNameFor(project), 'Fieldnotes');
  assert.deepEqual(withProductName(project), { ...project, productName: 'Fieldnotes' });
});
test('legacy projects use their existing title as the product-name fallback', () => {
  assert.equal(productNameFor({ name: 'Pocket Garden' }), 'Pocket Garden');
  assert.equal(productNameFor({ title: 'Untitled idea' }), 'Untitled idea');
  assert.equal(productNameFor({}), 'Unnamed product');
});
