import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLegacyProductPriceLookup,
  buildAdminEditedUserPatch,
  buildChainAccessRecord,
  buildAmountBalancedAdminAssignments,
  buildAmountBalancedBankRouteAssignments,
  pickLowestAdminFeeRoute,
  getChainAccessRecord,
  getCurrentChainId,
  hasApprovedChainAccess,
  pickLowestLoadAdmin,
  removeCurrentChainAccess,
  resolveOrderAdminFeePhp,
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

test('buildLegacyProductPriceLookup falls back to the newest snapshot price for deleted products', () => {
  const lookup = buildLegacyProductPriceLookup([
    {
      id: 'newer',
      kind: 'snapshot',
      createdAt: 200,
      productsSnapshot: [
        { name: 'Removed Product', pricePerVialUSD: 19.5 },
        { name: 'BAC Water', pricePerVialUSD: 3.5 },
      ],
    },
    {
      id: 'older',
      kind: 'snapshot',
      createdAt: 100,
      productsSnapshot: [
        { name: 'Removed Product', pricePerVialUSD: 17 },
      ],
    },
  ]);

  assert.equal(lookup['Removed Product'], 19.5);
  assert.equal(lookup['BAC Water'], 3.5);
});

test('chain access approval is scoped to the current chain only', () => {
  const profile = {
    chainAccess: {
      'April Chain': { status: 'approved' },
    },
  };

  assert.equal(hasApprovedChainAccess(profile, { chainLabel: 'April Chain' }), true);
  assert.equal(hasApprovedChainAccess(profile, { chainLabel: 'May Chain' }), false);
});

test('buildChainAccessRecord starts proof status cleanly', () => {
  const record = buildChainAccessRecord({
    existingRecord: { status: 'approved' },
    handle: '@rey',
    adminFeePhp: 150,
    now: 123,
  });

  assert.equal(record.status, 'pending');
  assert.equal(record.handle, '@rey');
  assert.equal(record.adminFeeAmountPhp, 150);
  assert.equal(record.createdAt, 123);
});

test('resolveOrderAdminFeePhp removes admin fee after current chain approval', () => {
  const settings = { chainLabel: 'May Chain', adminFeePhp: 150 };
  const profile = {
    chainAccess: {
      [getCurrentChainId(settings)]: { status: 'approved', adminFeeAmountPhp: 150 },
    },
  };

  assert.equal(resolveOrderAdminFeePhp({ profile, settings }), 0);
  assert.equal(resolveOrderAdminFeePhp({ profile: {}, settings }), 150);
  assert.deepEqual(getChainAccessRecord(profile, settings), { status: 'approved', adminFeeAmountPhp: 150 });
});

test('resolveOrderAdminFeePhp bundles the admin fee into the order when the gate is off', () => {
  // Next-batch model: upfront gate OFF, but the admin fee is still collected on
  // the payment page as orders + admin fee. So an unapproved buyer is still
  // charged the fee regardless of adminFeeGateOpen.
  assert.equal(
    resolveOrderAdminFeePhp({ profile: {}, settings: { batchName: 'June Batch', adminFeePhp: 150, adminFeeGateOpen: false } }),
    150
  );
  assert.equal(
    resolveOrderAdminFeePhp({ profile: {}, settings: { batchName: 'June Batch', adminFeePhp: 150, adminFeeGateOpen: true } }),
    150
  );
  // Undefined gate flag behaves the same — fee is charged at payment.
  assert.equal(
    resolveOrderAdminFeePhp({ profile: {}, settings: { adminFeePhp: 150 } }),
    150
  );
});

test('resolveOrderAdminFeePhp never double-charges a buyer who already paid the fee upfront (gate ON)', () => {
  // Gate ON: a buyer who paid via the current-chain gate (approved) has the fee
  // removed from their order total so they are not charged twice.
  const settings = { chainLabel: 'June Chain', adminFeePhp: 150, adminFeeGateOpen: true };
  const profile = { chainAccess: { [getCurrentChainId(settings)]: { status: 'approved' } } };

  assert.equal(resolveOrderAdminFeePhp({ profile, settings }), 0);
});

test('resolveOrderAdminFeePhp ignores a stale approval when the gate is off (no silent fee loss)', () => {
  // Gate OFF: nobody can pay upfront, so an 'approved' record can only be a
  // leftover from a prior batch. It must NOT waive this batch's bundled fee,
  // otherwise returning buyers are silently exempted and the fee is lost.
  const settings = { chainLabel: 'June Chain', adminFeePhp: 150, adminFeeGateOpen: false };
  const staleApproved = { chainAccess: { [getCurrentChainId(settings)]: { status: 'approved' } } };

  assert.equal(resolveOrderAdminFeePhp({ profile: staleApproved, settings }), 150);
});

test('getChainAccessRecord tolerates case and whitespace drift in the chain key', () => {
  const profile = {
    chainAccess: {
      'April Chain 7': { status: 'approved', adminFeeAmountPhp: 150 },
    },
  };

  // Same chain, only label casing/spacing differs — must still resolve approved.
  assert.equal(hasApprovedChainAccess(profile, { chainLabel: 'april chain 7' }), true);
  assert.equal(hasApprovedChainAccess(profile, { chainLabel: '  April   Chain 7 ' }), true);
  // A genuinely different chain still does not carry the approval.
  assert.equal(hasApprovedChainAccess(profile, { chainLabel: 'May Chain 8' }), false);
});

test('removeCurrentChainAccess removes only the selected chain approval record', () => {
  const profile = {
    chainAccess: {
      'April Chain': { status: 'approved', adminFeeAmountPhp: 400 },
      'May Chain': { status: 'proof_sent', adminFeeAmountPhp: 400 },
    },
  };

  assert.deepEqual(removeCurrentChainAccess(profile, { chainLabel: 'May Chain' }), {
    'April Chain': { status: 'approved', adminFeeAmountPhp: 400 },
  });
});

test('buildAmountBalancedAdminAssignments assigns largest mutable orders to lowest total admin', () => {
  const assignments = buildAmountBalancedAdminAssignments({
    adminNames: ['Admin A', 'Admin B', 'Admin C'],
    lockedCustomers: [
      { email: 'locked-a@example.com', adminAssigned: 'Admin A', totalPHP: 400000 },
      { email: 'locked-b@example.com', adminAssigned: 'Admin B', totalPHP: 280000 },
      { email: 'locked-c@example.com', adminAssigned: 'Admin C', totalPHP: 290000 },
    ],
    mutableCustomers: [
      { email: 'big@example.com', totalPHP: 70000 },
      { email: 'mid@example.com', totalPHP: 50000 },
      { email: 'small@example.com', totalPHP: 20000 },
    ],
  });

  assert.deepEqual(assignments, {
    'big@example.com': 'Admin B',
    'mid@example.com': 'Admin C',
    'small@example.com': 'Admin C',
  });
});

test('buildAmountBalancedBankRouteAssignments balances mutable orders across bank accounts', () => {
  const assignments = buildAmountBalancedBankRouteAssignments({
    routes: [
      { adminName: 'Admin A', bankIndex: 0, bankLabel: 'A Bank 1', bankDetails: 'A1 account', bankQr: 'a1.png' },
      { adminName: 'Admin A', bankIndex: 1, bankLabel: 'A Bank 2', bankDetails: 'A2 account', bankQr: 'a2.png' },
      { adminName: 'Admin B', bankIndex: 0, bankLabel: 'B Bank 1', bankDetails: 'B1 account', bankQr: 'b1.png' },
    ],
    lockedCustomers: [
      { email: 'locked-a@example.com', adminAssigned: 'Admin A', totalPHP: 90000, paymentSnapshot: { adminAssigned: 'Admin A', bankIndex: 0 } },
      { email: 'locked-b@example.com', adminAssigned: 'Admin B', totalPHP: 10000, paymentSnapshot: { adminAssigned: 'Admin B', bankIndex: 0 } },
    ],
    mutableCustomers: [
      { email: 'big@example.com', totalPHP: 70000 },
      { email: 'mid@example.com', totalPHP: 50000 },
      { email: 'small@example.com', totalPHP: 20000 },
    ],
  });

  assert.deepEqual(assignments, {
    'big@example.com': { adminName: 'Admin A', bankIndex: 1, bankLabel: 'A Bank 2', bankDetails: 'A2 account', bankQr: 'a2.png' },
    'mid@example.com': { adminName: 'Admin B', bankIndex: 0, bankLabel: 'B Bank 1', bankDetails: 'B1 account', bankQr: 'b1.png' },
    'small@example.com': { adminName: 'Admin B', bankIndex: 0, bankLabel: 'B Bank 1', bankDetails: 'B1 account', bankQr: 'b1.png' },
  });
});

test('pickLowestLoadAdmin picks admin with lowest current expected PHP', () => {
  const admin = pickLowestLoadAdmin({
    adminNames: ['Admin A', 'Admin B', 'Admin C'],
    customers: [
      { email: 'a@example.com', adminAssigned: 'Admin A', totalPHP: 100000 },
      { email: 'b@example.com', adminAssigned: 'Admin B', totalPHP: 50000 },
      { email: 'c@example.com', adminAssigned: 'Admin C', totalPHP: 75000 },
    ],
  });

  assert.equal(admin, 'Admin B');
});

test('pickLowestAdminFeeRoute balances admin fee PHP by saved route admin', () => {
  const admin = pickLowestAdminFeeRoute({
    adminNames: ['Admin A', 'Admin B', 'Admin C'],
    chainAccessRecords: [
      { routeAdmin: 'Admin A', adminFeeAmountPhp: 400 },
      { routeAdmin: 'Admin A', adminFeeAmountPhp: 400 },
      { routeAdmin: 'Admin B', adminFeeAmountPhp: 400 },
    ],
  });

  assert.equal(admin, 'Admin C');
});
