import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerOrderRecord,
  buildOrderItemsFromCartState,
  buildOrdersByEmail,
  buildUsersByEmail,
  normalizeCustomerEmail,
} from '../src/customer-lookup-helpers.js';
import {
  buildAmountBalancedBankRouteAssignments,
  buildChainAccessRecord,
  getChainAccessRecord,
  getCurrentChainId,
  hasApprovedChainAccess,
  pickLowestAdminFeeRoute,
  resolveOrderAdminFeePhp,
} from '../src/admin-order-edit-helpers.js';
import {
  buildProductPriorityAnalysis,
  buildProductTotals,
  computeProductBoxState,
  getKitSize,
} from '../src/kit-math-helpers.js';

// End-to-end buyer journey over the real helper modules with mock data:
// lookup -> cart -> save -> queue protection -> fee gate -> route assignment.

const SETTINGS = {
  batchName: 'Batch 16',
  chainLabel: 'Chain 16',
  fxRate: 58,
  adminFeePhp: 150,
  minOrder: 2,
  storeOpen: true,
  adminFeeGateOpen: true,
};

const CATALOG = {
  'Retatrutide 10mg': { name: 'Retatrutide 10mg', pricePerVialUSD: 7, pricePerKitUSD: 70 },
  'BPC157 6-pack':    { name: 'BPC157 6-pack', pricePerVialUSD: 7, pricePerKitUSD: 42, kitSize: 6 },
  'Bac Water':        { name: 'Bac Water', pricePerVialUSD: 3, kitSize: 1 },
};

const orderRow = (id, email, product, qty, timestamp) => ({ id, email, name: email.split('@')[0], handle: email.split('@')[0], product, qty, timestamp });

test('E2E: lookup normalizes email variants to one profile and one order set', () => {
  const users = [
    { id: 'ana@x.com', email: 'ana@x.com', name: 'Ana' },
  ];
  const orders = [orderRow('o1', 'ana@x.com', 'Retatrutide 10mg', 12, 100)];

  const usersById = buildUsersByEmail(users);
  const ordersByEmail = buildOrdersByEmail(orders);

  for (const typed of ['ana@x.com', ' ANA@X.COM ', 'Ana@X.com']) {
    const key = normalizeCustomerEmail(typed);
    assert.equal(key, 'ana@x.com');
    assert.equal(usersById[key].name, 'Ana');
    assert.equal(ordersByEmail[key].length, 1);
  }
});

test('E2E: review stage with empty editable cart falls back to saved quantities (no phantom empty order)', () => {
  const items = buildOrderItemsFromCartState({
    cartItems: {},
    existingItems: { 'Retatrutide 10mg': 10, 'Bac Water': 3 },
    useExistingWhenCartEmpty: true,
  });
  assert.deepEqual(items, { 'Retatrutide 10mg': 10, 'Bac Water': 3 });
});

test('E2E: untouched saved lines survive a partial cart edit', () => {
  const items = buildOrderItemsFromCartState({
    cartItems: { 'BPC157 6-pack': { v: 6 } },
    existingItems: { 'Retatrutide 10mg': 10, 'BPC157 6-pack': 4 },
    preserveUntouchedExisting: true,
    touchedProducts: { 'BPC157 6-pack': true },
  });
  assert.deepEqual(items, { 'Retatrutide 10mg': 10, 'BPC157 6-pack': 6 });
});

test('E2E: buyer review record builds from loaded orders + profile, not the admin table', () => {
  const record = buildCustomerOrderRecord({
    email: ' ANA@x.com ',
    profile: { id: 'ana@x.com', name: 'Ana', adminAssigned: 'Rey' },
    orders: [
      orderRow('o1', 'ana@x.com', 'BPC157 6-pack', 4, 100),
      orderRow('o2', 'ana@x.com', 'BPC157 6-pack', 3, 200),
    ],
  });
  assert.ok(record);
  assert.equal(record.email, 'ana@x.com');
  assert.equal(record.products['BPC157 6-pack'], 7);
  assert.equal(record.adminAssigned, 'Rey');
});

test('E2E: full batch — buyer protection agrees with product kit sizes end to end', () => {
  const orders = [
    orderRow('r1', 'ana@x.com', 'Retatrutide 10mg', 12, 100),
    orderRow('r2', 'ben@x.com', 'Retatrutide 10mg', 5, 200),
    orderRow('b1', 'ana@x.com', 'BPC157 6-pack', 7, 110),
    orderRow('b2', 'ben@x.com', 'BPC157 6-pack', 4, 210),
    orderRow('w1', 'cara@x.com', 'Bac Water', 5, 120),
  ];
  const totals = buildProductTotals(orders);
  const analysis = buildProductPriorityAnalysis(orders, CATALOG);

  // what each buyer sees on their protection summary
  assert.equal(analysis['Retatrutide 10mg'].customerBuckets['ana@x.com'].protectedQty, 10);
  assert.equal(analysis['BPC157 6-pack'].customerBuckets['ana@x.com'].protectedQty, 6);
  assert.equal(analysis['Bac Water'].customerBuckets['cara@x.com'].protectedQty, 5);
  assert.equal(analysis['Bac Water'].customerBuckets['cara@x.com'].atRiskQty, 0);

  // the shop card status math uses the same kit sizes
  for (const [name, product] of Object.entries(CATALOG)) {
    const box = computeProductBoxState(product, totals[name]);
    assert.equal(box.kitSize, getKitSize(product));
    assert.equal(analysis[name].kitSize, box.kitSize);
  }
});

test('E2E: fee gate — unpaid buyer owes the fee, approved buyer does not, stale chain approval re-gates', () => {
  const freshProfile = {};
  assert.equal(resolveOrderAdminFeePhp({ profile: freshProfile, settings: SETTINGS }), SETTINGS.adminFeePhp);
  assert.equal(hasApprovedChainAccess(freshProfile, SETTINGS), false);

  const approvedRecord = { ...buildChainAccessRecord({ adminFeePhp: SETTINGS.adminFeePhp }), status: 'approved' };
  const approvedProfile = { chainAccess: { [getCurrentChainId(SETTINGS)]: approvedRecord } };
  assert.equal(hasApprovedChainAccess(approvedProfile, SETTINGS), true);
  assert.equal(resolveOrderAdminFeePhp({ profile: approvedProfile, settings: SETTINGS }), 0);

  // approval from a previous chain must NOT unlock the current chain
  const oldChainSettings = { ...SETTINGS, chainLabel: 'Chain 15' };
  const staleProfile = { chainAccess: { [getCurrentChainId(oldChainSettings)]: { ...approvedRecord } } };
  assert.equal(hasApprovedChainAccess(staleProfile, SETTINGS), false);
  assert.equal(resolveOrderAdminFeePhp({ profile: staleProfile, settings: SETTINGS }), SETTINGS.adminFeePhp);
});

test('E2E: fee-route balancing spreads sequential new fee payers across bank routes', () => {
  const routes = [
    { adminName: 'Rey', bankIndex: 0, bankLabel: 'GCash A' },
    { adminName: 'Rey', bankIndex: 1, bankLabel: 'GCash B' },
    { adminName: 'Mia', bankIndex: 0, bankLabel: 'Maya' },
  ];

  // simulate: fee payers arrive one at a time; each locked record carries the
  // route it was assigned (mirrors adminFeeChainRecords built from users docs)
  const lockedRecords = [];
  const seenRoutes = new Set();
  for (let i = 0; i < 3; i++) {
    const assignments = buildAmountBalancedBankRouteAssignments({
      routes,
      lockedCustomers: lockedRecords.map(r => ({
        adminAssigned: r.adminName,
        totalPHP: SETTINGS.adminFeePhp,
        paymentSnapshot: { adminAssigned: r.adminName, bankIndex: r.bankIndex },
      })),
      mutableCustomers: [{ email: '__next__', totalPHP: SETTINGS.adminFeePhp }],
    });
    const next = assignments.__next__;
    assert.ok(next, `payer ${i + 1} got a route`);
    lockedRecords.push({ adminName: next.adminName, bankIndex: next.bankIndex });
    seenRoutes.add(`${next.adminName}#${next.bankIndex}`);
  }
  // three payers, three routes — balance means all three routes got used
  assert.equal(seenRoutes.size, 3);
});

test('E2E: fee-route fallback balances by admin when no bank routes exist', () => {
  const picked = pickLowestAdminFeeRoute({
    adminNames: ['Rey', 'Mia'],
    chainAccessRecords: [
      { routeAdmin: 'Rey', adminFeeAmountPhp: 150 },
      { routeAdmin: 'Rey', adminFeeAmountPhp: 150 },
    ],
  });
  assert.equal(picked, 'Mia');
});

test('E2E: chain access record round-trips through the profile shape the app writes', () => {
  const record = buildChainAccessRecord({ handle: 'ben', adminFeePhp: SETTINGS.adminFeePhp });
  const profile = { chainAccess: { [getCurrentChainId(SETTINGS)]: { ...record, status: 'proof_sent' } } };
  const read = getChainAccessRecord(profile, SETTINGS);
  assert.ok(read);
  assert.equal(read.status, 'proof_sent');
  assert.equal(hasApprovedChainAccess(profile, SETTINGS), false);

  // chain-label drift (case/whitespace) still finds the record
  const driftedSettings = { ...SETTINGS, chainLabel: '  chain 16 ' };
  assert.ok(getChainAccessRecord(profile, driftedSettings));
});

test('E2E: order totals a buyer sees = vials x vial price x fx + fee only when owed', () => {
  const qty = 7;
  const product = CATALOG['BPC157 6-pack'];
  const subUSD = qty * product.pricePerVialUSD;
  const feePhp = resolveOrderAdminFeePhp({ profile: {}, settings: SETTINGS });
  const totalPHP = subUSD * SETTINGS.fxRate + feePhp;
  assert.equal(subUSD, 49);
  assert.equal(totalPHP, 49 * 58 + 150);

  const approvedRecord = { ...buildChainAccessRecord({ adminFeePhp: SETTINGS.adminFeePhp }), status: 'approved' };
  const approvedProfile = { chainAccess: { [getCurrentChainId(SETTINGS)]: approvedRecord } };
  const feePhpApproved = resolveOrderAdminFeePhp({ profile: approvedProfile, settings: SETTINGS });
  assert.equal(subUSD * SETTINGS.fxRate + feePhpApproved, 49 * 58);
});
