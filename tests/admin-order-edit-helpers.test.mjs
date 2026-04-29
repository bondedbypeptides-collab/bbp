import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdminEditedUserPatch,
  mergeAdminEditProducts,
} from '../src/admin-order-edit-helpers.js';

test('mergeAdminEditProducts keeps deleted products that are already on the order', () => {
  const merged = mergeAdminEditProducts(
    [
      { id: 'p1', name: 'Retatrutide', pricePerVialUSD: 12.5 },
      { id: 'p2', name: 'BAC Water', pricePerVialUSD: 3.5 },
    ],
    [
      { id: 'o1', product: 'Retatrutide', qty: 2 },
      { id: 'o2', product: 'Removed Product', qty: 1 },
      { id: 'o3', product: 'Removed Product', qty: 2 },
    ]
  );

  assert.equal(merged.length, 3);
  const legacy = merged.find((product) => product.name === 'Removed Product');
  assert.ok(legacy);
  assert.equal(legacy.isLegacyMissing, true);
  assert.equal(legacy.locked, true);
  assert.equal(legacy.legacyOrderQty, 3);
  assert.equal(legacy.pricePerVialUSD, 0);
});

test('buildAdminEditedUserPatch preserves existing payment and proof state for paid customers', () => {
  const nextSnapshot = {
    totalPHP: 4200,
    totalUSD: 70,
    subtotalUSD: 60,
  };

  const patch = buildAdminEditedUserPatch({
    targetProfile: {
      isPaid: true,
      proofUrl: 'https://example.com/proof.png',
      proofReview: 'approved',
      paymentSubmittedAt: 123456,
      buyerReviewConfirmedAt: 654321,
    },
    nextSnapshot,
  });

  assert.deepEqual(patch, {
    paymentSnapshot: nextSnapshot,
    proofReview: 'approved',
    proofUrl: 'https://example.com/proof.png',
    isPaid: true,
    paymentSubmittedAt: 123456,
    buyerReviewConfirmedAt: 654321,
  });
});

test('buildAdminEditedUserPatch clears payment fields when there is no saved payment state', () => {
  const patch = buildAdminEditedUserPatch({
    targetProfile: {
      isPaid: false,
      proofUrl: null,
      proofReview: '',
      paymentSubmittedAt: null,
      buyerReviewConfirmedAt: 654321,
    },
    nextSnapshot: null,
  });

  assert.deepEqual(patch, {
    paymentSnapshot: null,
    proofReview: '',
    proofUrl: null,
    isPaid: false,
    paymentSubmittedAt: null,
    buyerReviewConfirmedAt: null,
  });
});
