import assert from 'node:assert/strict';
import test from 'node:test';

import { applyDiscountCents } from '../src/discount.js';

test('rate 0 returns same', () => {
  assert.equal(applyDiscountCents(1000, 0), 1000);
});

test('rate 100% returns 0', () => {
  assert.equal(applyDiscountCents(1000, 10_000), 0);
});

test('round half up matches expected', () => {
  assert.equal(applyDiscountCents(999, 3_333), 666);
  assert.equal(applyDiscountCents(1, 5000), 1);
  assert.equal(applyDiscountCents(1, 4999), 1);
  assert.equal(applyDiscountCents(1, 5001), 0);
});

test('invalid inputs are rejected', () => {
  assert.throws(() => applyDiscountCents(-1, 0), RangeError);
  assert.throws(() => applyDiscountCents(0, -1), RangeError);
  assert.throws(() => applyDiscountCents(0, 10_001), RangeError);
});
