import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOTS_PER_BATCH,
  buildPackingRows,
  buildProductPriorityAnalysis,
  buildProductTotals,
  compareOrdersNewestFirst,
  compareOrdersOldestFirst,
  computeManufacturerRow,
  computeProductBoxState,
  getKitSize,
  maxVialsAllowed,
} from '../src/kit-math-helpers.js';

// --- Mock catalog: the three shapes that exist in the real store ---
const CATALOG = {
  'Retatrutide 10mg': { name: 'Retatrutide 10mg', pricePerVialUSD: 7, pricePerKitUSD: 70 },            // legacy: no kitSize field -> 10
  'BPC157 6-pack':    { name: 'BPC157 6-pack', pricePerVialUSD: 7, pricePerKitUSD: 42, kitSize: 6 },   // kit of 6
  'Bac Water':        { name: 'Bac Water', pricePerVialUSD: 3, kitSize: 1 },                            // vial-only, no kit price
};

const order = (id, email, product, qty, timestamp) => ({ id, email, name: email.split('@')[0], handle: email.split('@')[0], product, qty, timestamp });

// --- getKitSize: default + clamping ---

test('getKitSize defaults to 10 when field is absent, null, zero, negative, or junk', () => {
  assert.equal(getKitSize(undefined), 10);
  assert.equal(getKitSize({}), 10);
  assert.equal(getKitSize({ kitSize: null }), 10);
  assert.equal(getKitSize({ kitSize: 0 }), 10);
  assert.equal(getKitSize({ kitSize: -5 }), 10);
  assert.equal(getKitSize({ kitSize: 'abc' }), 10);
  assert.equal(getKitSize({ kitSize: '' }), 10);
  assert.equal(SLOTS_PER_BATCH, 10);
});

test('getKitSize honors explicit sizes, coerces strings, floors decimals', () => {
  assert.equal(getKitSize({ kitSize: 6 }), 6);
  assert.equal(getKitSize({ kitSize: '6' }), 6);
  assert.equal(getKitSize({ kitSize: 6.9 }), 6);
  assert.equal(getKitSize({ kitSize: 1 }), 1);
});

// --- computeProductBoxState ---

test('box state: legacy 10-vial product mid-kit', () => {
  const s = computeProductBoxState(CATALOG['Retatrutide 10mg'], 25);
  assert.deepEqual(s, { kitSize: 10, totalVials: 25, boxes: 2, slotsFilled: 5, slotsLeft: 5 });
});

test('box state: kit-of-6 product mid-kit and at exact boundary', () => {
  assert.deepEqual(computeProductBoxState(CATALOG['BPC157 6-pack'], 14), { kitSize: 6, totalVials: 14, boxes: 2, slotsFilled: 2, slotsLeft: 4 });
  assert.deepEqual(computeProductBoxState(CATALOG['BPC157 6-pack'], 12), { kitSize: 6, totalVials: 12, boxes: 2, slotsFilled: 0, slotsLeft: 0 });
});

test('box state: vial-only product never has loose slots', () => {
  const s = computeProductBoxState(CATALOG['Bac Water'], 7);
  assert.deepEqual(s, { kitSize: 1, totalVials: 7, boxes: 7, slotsFilled: 0, slotsLeft: 0 });
});

test('box state: zero demand shows a full empty kit', () => {
  assert.equal(computeProductBoxState(CATALOG['Retatrutide 10mg'], 0).slotsLeft, 10);
  assert.equal(computeProductBoxState(CATALOG['BPC157 6-pack'], 0).slotsLeft, 6);
});

// --- maxVialsAllowed (box caps) ---

test('caps convert boxes to vials using the product kit size', () => {
  assert.equal(maxVialsAllowed({ maxBoxes: 3 }), 30);
  assert.equal(maxVialsAllowed({ maxBoxes: 2, kitSize: 6 }), 12);
  assert.equal(maxVialsAllowed({ maxBoxes: 5, kitSize: 1 }), 5);
  assert.equal(maxVialsAllowed({}), 0);
});

// --- computeManufacturerRow ---

test('manufacturer row: kit-of-6 partial box rounds up and prices by kit', () => {
  const r = computeManufacturerRow({ ...CATALOG['BPC157 6-pack'], totalVials: 14 });
  assert.equal(r.expectedBoxes, 3);
  assert.equal(r.fullBoxes, 2);
  assert.equal(r.looseVials, 2);
  assert.equal(r.missingSlots, 4);
  assert.equal(r.kitPriceUSD, 42);
  assert.equal(r.manufacturerOrderTotalUSD, 3 * 42);
  assert.equal(r.orderedVialsValueUSD, 14 * 7);
});

test('manufacturer row: kit price falls back to vial x kitSize when blank', () => {
  const r = computeManufacturerRow({ name: 'X', pricePerVialUSD: 5, kitSize: 6, totalVials: 6 });
  assert.equal(r.kitPriceUSD, 30);
  assert.equal(r.manufacturerOrderTotalUSD, 30);
});

test('manufacturer row: vial-only orders exact vial count at vial price', () => {
  const r = computeManufacturerRow({ ...CATALOG['Bac Water'], totalVials: 7 });
  assert.equal(r.expectedBoxes, 7);
  assert.equal(r.looseVials, 0);
  assert.equal(r.missingSlots, 0);
  assert.equal(r.kitPriceUSD, 3);
  assert.equal(r.manufacturerOrderTotalUSD, 21);
});

test('manufacturer row: zero demand orders nothing', () => {
  const r = computeManufacturerRow({ ...CATALOG['Retatrutide 10mg'], totalVials: 0 });
  assert.equal(r.expectedBoxes, 0);
  assert.equal(r.missingSlots, 0);
  assert.equal(r.manufacturerOrderTotalUSD, 0);
});

// --- buildProductTotals ---

test('product totals aggregate rows per product', () => {
  const totals = buildProductTotals([
    order('o1', 'a@x.com', 'Retatrutide 10mg', 5, 1),
    order('o2', 'b@x.com', 'Retatrutide 10mg', 7, 2),
    order('o3', 'a@x.com', 'Bac Water', 2, 3),
    { id: 'o4', email: 'c@x.com', product: 'Bac Water', timestamp: 4 }, // missing qty
  ]);
  assert.deepEqual(totals, { 'Retatrutide 10mg': 12, 'Bac Water': 2 });
});

// --- order comparators ---

test('comparators: timestamp first, id as tie-break, newest is exact reverse', () => {
  const a = { id: 'a', timestamp: 100 };
  const b = { id: 'b', timestamp: 100 };
  const c = { id: 'c', timestamp: 50 };
  assert.ok(compareOrdersOldestFirst(c, a) < 0);
  assert.ok(compareOrdersOldestFirst(a, b) < 0);
  assert.ok(compareOrdersNewestFirst(a, b) > 0);
});

// --- buildProductPriorityAnalysis: legacy 10-vial behavior unchanged ---

test('legacy kit-10 product: protection floors to 10, trim equals remainder, newest loose cut first', () => {
  const orders = [
    order('o1', 'ana@x.com', 'Retatrutide 10mg', 12, 100),  // oldest: 10 protected, 2 loose
    order('o2', 'ben@x.com', 'Retatrutide 10mg', 5, 200),   // 5 loose
    order('o3', 'cara@x.com', 'Retatrutide 10mg', 6, 300),  // newest: 6 loose
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Retatrutide 10mg'];

  assert.equal(a.kitSize, 10);
  assert.equal(a.totalQty, 23);
  assert.equal(a.completedBoxes, 2);
  assert.equal(a.openBoxNumber, 3);
  assert.equal(a.totalToTrim, 3);
  assert.equal(a.missingSlots, 7);

  assert.equal(a.customerBuckets['ana@x.com'].protectedQty, 10);
  assert.equal(a.customerBuckets['ana@x.com'].looseQty, 2);
  assert.equal(a.customerBuckets['ben@x.com'].protectedQty, 0);
  assert.equal(a.customerBuckets['cara@x.com'].looseQty, 6);

  // trim removes exactly the remainder, starting from the newest saver
  assert.equal(a.victims.length, 1);
  assert.equal(a.victims[0].email, 'cara@x.com');
  assert.equal(a.victims[0].amountToRemove, 3);
});

test('legacy kit-10: protection spans multiple rows of the same customer', () => {
  const orders = [
    order('o1', 'ana@x.com', 'Retatrutide 10mg', 4, 100),
    order('o2', 'ana@x.com', 'Retatrutide 10mg', 8, 200), // total 12 -> 10 protected, 2 loose
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Retatrutide 10mg'];
  assert.equal(a.customerBuckets['ana@x.com'].protectedQty, 10);
  assert.equal(a.customerBuckets['ana@x.com'].looseQty, 2);
  assert.equal(a.totalToTrim, 2);
  assert.equal(a.victims[0].id, 'o2'); // loose lives on the newer row
});

// --- kit-of-6 behavior ---

test('kit-of-6: protection floors to 6, trim equals remainder mod 6', () => {
  const orders = [
    order('o1', 'ana@x.com', 'BPC157 6-pack', 7, 100),  // 6 protected, 1 loose
    order('o2', 'ben@x.com', 'BPC157 6-pack', 4, 200),  // 4 loose
    order('o3', 'cara@x.com', 'BPC157 6-pack', 2, 300), // newest: 2 loose
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['BPC157 6-pack'];

  assert.equal(a.kitSize, 6);
  assert.equal(a.totalQty, 13);
  assert.equal(a.completedBoxes, 2);
  assert.equal(a.totalToTrim, 1);
  assert.equal(a.missingSlots, 5);

  assert.equal(a.customerBuckets['ana@x.com'].protectedQty, 6);
  assert.equal(a.customerBuckets['ana@x.com'].looseQty, 1);
  assert.equal(a.customerBuckets['ben@x.com'].looseQty, 4);

  assert.equal(a.victims.length, 1);
  assert.equal(a.victims[0].email, 'cara@x.com');
  assert.equal(a.victims[0].amountToRemove, 1);

  // loose that lands in an already-completed box is likely-safe, open box is at-risk
  const safeTotal = Object.values(a.customerBuckets).reduce((s, b) => s + b.likelySafeQty, 0);
  const riskTotal = Object.values(a.customerBuckets).reduce((s, b) => s + b.atRiskQty, 0);
  assert.equal(safeTotal + riskTotal, 7); // all loose accounted for
  assert.equal(riskTotal, a.totalToTrim); // open-box loose == what trim removes
});

test('kit-of-6: exact multiple means nothing to trim and everything protected', () => {
  const orders = [
    order('o1', 'ana@x.com', 'BPC157 6-pack', 6, 100),
    order('o2', 'ben@x.com', 'BPC157 6-pack', 12, 200),
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['BPC157 6-pack'];
  assert.equal(a.totalToTrim, 0);
  assert.equal(a.victims.length, 0);
  assert.equal(a.customerBuckets['ana@x.com'].protectedQty, 6);
  assert.equal(a.customerBuckets['ben@x.com'].protectedQty, 12);
});

// --- vial-only behavior ---

test('vial-only: every vial protected, never trimmed, never at risk', () => {
  const orders = [
    order('o1', 'ana@x.com', 'Bac Water', 3, 100),
    order('o2', 'ben@x.com', 'Bac Water', 7, 200),
    order('o3', 'cara@x.com', 'Bac Water', 1, 300),
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Bac Water'];

  assert.equal(a.kitSize, 1);
  assert.equal(a.totalToTrim, 0);
  assert.equal(a.missingSlots, 0);
  assert.equal(a.victims.length, 0);
  for (const [email, b] of Object.entries(a.customerBuckets)) {
    assert.equal(b.looseQty, 0, `${email} should have no loose vials`);
    assert.equal(b.atRiskQty, 0, `${email} should have nothing at risk`);
    assert.equal(b.protectedQty, b.totalQty, `${email} should be fully protected`);
  }
});

// --- edge cases ---

test('product missing from catalog falls back to kit of 10', () => {
  const orders = [order('o1', 'ana@x.com', 'Ghost Product', 12, 100)];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Ghost Product'];
  assert.equal(a.kitSize, 10);
  assert.equal(a.customerBuckets['ana@x.com'].protectedQty, 10);
  assert.equal(a.totalToTrim, 2);
});

test('zero and missing qty rows are ignored', () => {
  const orders = [
    order('o1', 'ana@x.com', 'BPC157 6-pack', 0, 100),
    { id: 'o2', email: 'ben@x.com', product: 'BPC157 6-pack', timestamp: 200 },
    order('o3', 'cara@x.com', 'BPC157 6-pack', 6, 300),
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['BPC157 6-pack'];
  assert.equal(a.totalQty, 6);
  assert.equal(a.fragments.length, 1);
});

test('trim tie-break: equal timestamps cut the higher id first (stable newest-first)', () => {
  const orders = [
    order('a', 'ana@x.com', 'BPC157 6-pack', 3, 100),
    order('b', 'ben@x.com', 'BPC157 6-pack', 4, 100), // same timestamp
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['BPC157 6-pack'];
  assert.equal(a.totalToTrim, 1);
  assert.equal(a.victims[0].id, 'b');
});

// --- at-risk must equal what trim would actually cut (regression: display lied to older savers) ---

test('regression: older loose saver behind a newer full kit is shown at-risk, not likely-safe', () => {
  // A saved 1 vial first; B saved a full kit later. Trim cuts A (only loose vial),
  // so A must be the one flagged at risk even though A's vial sits in a completed box.
  const orders = [
    order('a1', 'ana@x.com', 'Retatrutide 10mg', 1, 100),
    order('b1', 'ben@x.com', 'Retatrutide 10mg', 10, 200),
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Retatrutide 10mg'];

  assert.equal(a.totalToTrim, 1);
  assert.equal(a.victims.length, 1);
  assert.equal(a.victims[0].email, 'ana@x.com');

  assert.equal(a.customerBuckets['ana@x.com'].atRiskQty, 1);
  assert.equal(a.customerBuckets['ana@x.com'].likelySafeQty, 0);
  assert.equal(a.customerBuckets['ben@x.com'].protectedQty, 10);
  assert.equal(a.customerBuckets['ben@x.com'].atRiskQty, 0);
});

test('regression: open-box loose that trim spares is shown likely-safe', () => {
  // A old 3 loose, B new 8 loose -> total 11, trim 1 from B (newest).
  // A survives entirely; B loses only 1 of 8.
  const orders = [
    order('a1', 'ana@x.com', 'Retatrutide 10mg', 3, 100),
    order('b1', 'ben@x.com', 'Retatrutide 10mg', 8, 200),
  ];
  const a = buildProductPriorityAnalysis(orders, CATALOG)['Retatrutide 10mg'];

  assert.equal(a.totalToTrim, 1);
  assert.equal(a.victims[0].email, 'ben@x.com');
  assert.equal(a.customerBuckets['ana@x.com'].atRiskQty, 0);
  assert.equal(a.customerBuckets['ana@x.com'].likelySafeQty, 3);
  assert.equal(a.customerBuckets['ben@x.com'].atRiskQty, 1);
  assert.equal(a.customerBuckets['ben@x.com'].likelySafeQty, 7);
});

// --- buildPackingRows ---

test('packing: kit-of-6 splits boxes at 6 slots', () => {
  const rows = buildPackingRows([order('o1', 'ana@x.com', 'BPC157 6-pack', 7, 100)], CATALOG);
  assert.deepEqual(rows.map(r => ({ box: r.box, take: r.take })), [
    { box: 1, take: 6 },
    { box: 2, take: 1 },
  ]);
});

test('packing: vial-only gives every vial its own box', () => {
  const rows = buildPackingRows([order('o1', 'ana@x.com', 'Bac Water', 3, 100)], CATALOG);
  assert.deepEqual(rows.map(r => ({ box: r.box, take: r.take })), [
    { box: 1, take: 1 },
    { box: 2, take: 1 },
    { box: 3, take: 1 },
  ]);
});

test('packing: legacy product splits at 10 and shares boxes across customers', () => {
  const rows = buildPackingRows([
    order('o1', 'ana@x.com', 'Retatrutide 10mg', 7, 100),
    order('o2', 'ben@x.com', 'Retatrutide 10mg', 7, 200),
  ], CATALOG);
  assert.deepEqual(rows.map(r => ({ email: r.email, box: r.box, take: r.take })), [
    { email: 'ana@x.com', box: 1, take: 7 },
    { email: 'ben@x.com', box: 1, take: 3 },
    { email: 'ben@x.com', box: 2, take: 4 },
  ]);
});

test('packing: unknown product defaults to 10-slot boxes', () => {
  const rows = buildPackingRows([order('o1', 'ana@x.com', 'Ghost Product', 12, 100)], CATALOG);
  assert.deepEqual(rows.map(r => ({ box: r.box, take: r.take })), [
    { box: 1, take: 10 },
    { box: 2, take: 2 },
  ]);
});

test('maxBoxes raises totalBoxes floor but never lowers demand-driven count', () => {
  const catalog = { ...CATALOG, 'BPC157 6-pack': { ...CATALOG['BPC157 6-pack'], maxBoxes: 5 } };
  const orders = [order('o1', 'ana@x.com', 'BPC157 6-pack', 7, 100)];
  const a = buildProductPriorityAnalysis(orders, catalog)['BPC157 6-pack'];
  assert.equal(a.totalBoxes, 5); // cap wins over ceil(7/6)=2
});

// --- end-to-end batch simulation over the mixed catalog ---

test('E2E: mixed catalog batch — totals, box states, trim, protection, manufacturer order all agree', () => {
  const orders = [
    // Retatrutide (kit 10): ana 12, ben 5, cara 6 -> 23 total, trim 3
    order('r1', 'ana@x.com', 'Retatrutide 10mg', 12, 100),
    order('r2', 'ben@x.com', 'Retatrutide 10mg', 5, 200),
    order('r3', 'cara@x.com', 'Retatrutide 10mg', 6, 300),
    // BPC (kit 6): ana 7, ben 4, cara 2 -> 13 total, trim 1
    order('b1', 'ana@x.com', 'BPC157 6-pack', 7, 110),
    order('b2', 'ben@x.com', 'BPC157 6-pack', 4, 210),
    order('b3', 'cara@x.com', 'BPC157 6-pack', 2, 310),
    // Bac Water (vial-only): ana 3, ben 7 -> 10 total, trim 0
    order('w1', 'ana@x.com', 'Bac Water', 3, 120),
    order('w2', 'ben@x.com', 'Bac Water', 7, 220),
  ];

  const totals = buildProductTotals(orders);
  assert.deepEqual(totals, { 'Retatrutide 10mg': 23, 'BPC157 6-pack': 13, 'Bac Water': 10 });

  const analysis = buildProductPriorityAnalysis(orders, CATALOG);

  for (const [productName, product] of Object.entries(CATALOG)) {
    const a = analysis[productName];
    const box = computeProductBoxState(product, totals[productName]);

    // analysis and box state must agree on kit size and box counts
    assert.equal(a.kitSize, box.kitSize, `${productName}: kitSize agrees`);
    assert.equal(a.completedBoxes, box.boxes, `${productName}: completed boxes agree`);
    assert.equal(a.totalQty, box.totalVials, `${productName}: totals agree`);

    // conservation: protected + loose across customers == total demand
    const sumProtected = Object.values(a.customerBuckets).reduce((s, b) => s + b.protectedQty, 0);
    const sumLoose = Object.values(a.customerBuckets).reduce((s, b) => s + b.looseQty, 0);
    assert.equal(sumProtected + sumLoose, a.totalQty, `${productName}: conservation holds`);

    // protected demand is always whole kits
    assert.equal(sumProtected % a.kitSize, 0, `${productName}: protected is whole kits`);

    // trim removes exactly the open-box remainder
    const victimTotal = a.victims.reduce((s, v) => s + v.amountToRemove, 0);
    assert.equal(victimTotal, a.totalToTrim, `${productName}: victims cover the trim`);
    assert.equal((a.totalQty - victimTotal) % a.kitSize, 0, `${productName}: post-trim demand is whole kits`);

    // truth-in-display: at-risk shown to buyers == exactly what trim would cut, per customer
    const sumAtRisk = Object.values(a.customerBuckets).reduce((s, b) => s + b.atRiskQty, 0);
    assert.equal(sumAtRisk, a.totalToTrim, `${productName}: at-risk equals the trim amount`);
    const victimByEmail = {};
    a.victims.forEach(v => { victimByEmail[v.email] = (victimByEmail[v.email] || 0) + v.amountToRemove; });
    for (const [email, bucket] of Object.entries(a.customerBuckets)) {
      assert.equal(bucket.atRiskQty, victimByEmail[email] || 0, `${productName}/${email}: at-risk matches hit list`);
    }

    // manufacturer order covers demand and rounds up to whole kits
    const row = computeManufacturerRow({ ...product, totalVials: totals[productName] });
    assert.equal(row.expectedBoxes * row.kitSize >= a.totalQty, true, `${productName}: manufacturer order covers demand`);
    assert.equal(row.fullBoxes, a.completedBoxes, `${productName}: full boxes agree with analysis`);
    assert.equal(row.missingSlots, a.missingSlots, `${productName}: missing slots agree with analysis`);
  }

  // spot-check the money: manufacturer grand total
  const grand = Object.entries(CATALOG).reduce((s, [name, p]) => s + computeManufacturerRow({ ...p, totalVials: totals[name] }).manufacturerOrderTotalUSD, 0);
  // Reta: ceil(23/10)=3 kits x $70 = 210; BPC: ceil(13/6)=3 x $42 = 126; Bac: 10 x $3 = 30
  assert.equal(grand, 210 + 126 + 30);
});

// --- legacy identity: a catalog with no kitSize fields behaves exactly like the old hardcoded 10 ---

test('E2E: catalog without any kitSize fields reproduces classic 10-vial math everywhere', () => {
  const legacyCatalog = {
    'Prod A': { name: 'Prod A', pricePerVialUSD: 6, pricePerKitUSD: 60 },
    'Prod B': { name: 'Prod B', pricePerVialUSD: 8 },
  };
  const orders = [
    order('a1', 'ana@x.com', 'Prod A', 10, 100),
    order('a2', 'ben@x.com', 'Prod A', 3, 200),
    order('b1', 'ana@x.com', 'Prod B', 25, 150),
  ];
  const analysis = buildProductPriorityAnalysis(orders, legacyCatalog);

  assert.equal(analysis['Prod A'].kitSize, 10);
  assert.equal(analysis['Prod A'].totalToTrim, 3);
  assert.equal(analysis['Prod A'].victims[0].email, 'ben@x.com');
  assert.equal(analysis['Prod B'].customerBuckets['ana@x.com'].protectedQty, 20);
  assert.equal(analysis['Prod B'].customerBuckets['ana@x.com'].looseQty, 5);

  const rowB = computeManufacturerRow({ ...legacyCatalog['Prod B'], totalVials: 25 });
  assert.equal(rowB.expectedBoxes, 3);
  assert.equal(rowB.kitPriceUSD, 80); // vial x 10 fallback
});
