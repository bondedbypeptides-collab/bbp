import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCustomerOrderRecord,
  buildOrderItemsFromCartState,
  buildOrdersByEmail,
  buildUsersByEmail,
  normalizeCustomerEmail,
} from '../src/customer-lookup-helpers.js';

test('normalizeCustomerEmail trims spaces and matches email casing', () => {
  assert.equal(normalizeCustomerEmail('  Buyer@Example.COM '), 'buyer@example.com');
});

test('buildOrdersByEmail groups saved orders by normalized email', () => {
  const grouped = buildOrdersByEmail([
    { id: 'o1', email: ' Buyer@Example.COM ', product: 'Retatrutide', qty: 2 },
    { id: 'o2', email: 'buyer@example.com', product: 'BAC Water', qty: 1 },
  ]);

  assert.equal(grouped['buyer@example.com'].length, 2);
});

test('buildUsersByEmail finds profiles saved with mixed-case ids', () => {
  const grouped = buildUsersByEmail([
    { id: ' Buyer@Example.COM ', name: 'Buyer', address: { city: 'Manila' } },
  ]);

  assert.equal(grouped['buyer@example.com'].name, 'Buyer');
  assert.equal(grouped['buyer@example.com'].address.city, 'Manila');
});

test('buildCustomerOrderRecord lets buyers review loaded saved orders outside admin tables', () => {
  const record = buildCustomerOrderRecord({
    email: 'BUYER@example.com',
    orders: [
      { email: 'Buyer@example.com', product: 'Retatrutide', qty: 2, timestamp: 100 },
      { email: 'Buyer@example.com', product: 'Retatrutide', qty: 3, timestamp: 120 },
    ],
    profile: { name: 'Buyer', handle: '@buyer', buyerReviewConfirmedAt: 999 },
    paymentSnapshot: { adminAssigned: 'Admin A' },
  });

  assert.equal(record.email, 'buyer@example.com');
  assert.equal(record.products.Retatrutide, 5);
  assert.equal(record.reviewReady, true);
  assert.equal(record.adminAssigned, 'Admin A');
});

test('buildOrderItemsFromCartState falls back to saved order when editable cart is empty', () => {
  assert.deepEqual(buildOrderItemsFromCartState({
    cartItems: {},
    existingItems: { Retatrutide: 2, 'BAC Water': 1 },
    useExistingWhenCartEmpty: true,
  }), {
    Retatrutide: 2,
    'BAC Water': 1,
  });
});

test('buildOrderItemsFromCartState prefers editable cart when buyer has selected quantities', () => {
  assert.deepEqual(buildOrderItemsFromCartState({
    cartItems: { Retatrutide: { v: 5 } },
    existingItems: { Retatrutide: 2 },
    useExistingWhenCartEmpty: true,
  }), {
    Retatrutide: 5,
  });
});

test('buildOrderItemsFromCartState preserves untouched saved lines when requested', () => {
  assert.deepEqual(buildOrderItemsFromCartState({
    cartItems: { 'BAC Water': { v: 3 } },
    existingItems: { Retatrutide: 2, 'BAC Water': 1 },
    useExistingWhenCartEmpty: true,
    preserveUntouchedExisting: true,
    touchedProducts: { 'BAC Water': true },
  }), {
    Retatrutide: 2,
    'BAC Water': 3,
  });
});

test('buildOrderItemsFromCartState removes a touched product when its qty is set to zero', () => {
  assert.deepEqual(buildOrderItemsFromCartState({
    cartItems: {},
    existingItems: { Retatrutide: 2, 'BAC Water': 1 },
    useExistingWhenCartEmpty: true,
    preserveUntouchedExisting: true,
    touchedProducts: { 'BAC Water': true },
  }), {
    Retatrutide: 2,
  });
});
