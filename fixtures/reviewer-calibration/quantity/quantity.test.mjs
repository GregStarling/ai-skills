import test from 'node:test';
import assert from 'node:assert/strict';
import {totalQuantity} from './quantity.mjs';

test('preserves zero while summing quantities', () => {
  assert.equal(totalQuantity([{quantity: 0}, {quantity: 2}, {}]), 3);
  assert.equal(totalQuantity([{quantity: 0}, {quantity: 0}]), 0);
});
test('defaults only absent quantities', () => {
  assert.equal(totalQuantity([{quantity: null}, {quantity: undefined}, {}]), 3);
  assert.equal(totalQuantity([{quantity: -1}, {quantity: 2.5}]), 1.5);
});
test('empty input returns zero', () => assert.equal(totalQuantity([]), 0));
