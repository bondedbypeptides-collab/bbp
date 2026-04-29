import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachEstimatedHistoryAmounts,
  buildArchiveMetadata,
  buildCustomerBatchHistoryRecords,
  buildGroupedHistoryView,
  buildHistoryArchiveRows,
} from '../src/history-helpers.js';

test('buildArchiveMetadata keeps labels and creates stable ids', () => {
  const archivedAt = Date.UTC(2026, 3, 28, 16, 45, 0);
  const metadata = buildArchiveMetadata({
    batchName: 'April Glow Batch',
    chainLabel: 'April Chain 7',
    chainId: 'chain-7',
  }, archivedAt);

  assert.equal(metadata.batchName, 'April Glow Batch');
  assert.equal(metadata.chainLabel, 'April Chain 7');
  assert.equal(metadata.chainId, 'chain-7');
  assert.equal(metadata.archivedAt, archivedAt);
  assert.match(metadata.batchId, /^batch-2026-04-28t16-45-00-000z-april-glow-batch$/);
});

test('buildHistoryArchiveRows stamps each archived row with batch and chain metadata', () => {
  const archivedAt = Date.UTC(2026, 3, 28, 16, 45, 0);
  const metadata = buildArchiveMetadata({
    batchName: 'April Glow Batch',
    chainLabel: 'April Chain 7',
    chainId: 'chain-7',
  }, archivedAt);

  const rows = buildHistoryArchiveRows([
    { id: 'o1', email: 'a@example.com', product: 'Retatrutide', qty: 2, timestamp: 111 },
    { id: 'o2', email: 'a@example.com', product: 'BAC Water', qty: 1, timestamp: 112 },
  ], metadata);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].batchName, 'April Glow Batch');
  assert.equal(rows[0].chainLabel, 'April Chain 7');
  assert.equal(rows[0].batchId, metadata.batchId);
  assert.equal(rows[1].archivedAt, archivedAt);
});

test('buildCustomerBatchHistoryRecords creates one customer snapshot per archived batch', () => {
  const archivedAt = Date.UTC(2026, 3, 28, 16, 45, 0);
  const metadata = buildArchiveMetadata({
    batchName: 'April Glow Batch',
    chainLabel: 'April Chain 7',
    chainId: 'chain-7',
  }, archivedAt);

  const rows = [
    { id: 'o1', email: 'a@example.com', name: 'A', product: 'Retatrutide', qty: 2, timestamp: 111 },
    { id: 'o2', email: 'a@example.com', name: 'A', product: 'BAC Water', qty: 1, timestamp: 112 },
    { id: 'o3', email: 'b@example.com', name: 'B', product: 'Cagri', qty: 3, timestamp: 113 },
  ];
  const usersByEmail = {
    'a@example.com': {
      id: 'a@example.com',
      address: { city: 'Manila' },
      paymentSnapshot: { totalPHP: 5000, adminAssigned: 'Admin A' },
      isPaid: true,
    },
    'b@example.com': {
      id: 'b@example.com',
      address: { city: 'Cebu' },
      paymentSnapshot: null,
      isPaid: false,
    },
  };

  const records = buildCustomerBatchHistoryRecords(rows, usersByEmail, metadata);

  assert.equal(records.length, 2);
  const first = records.find((record) => record.email === 'a@example.com');
  assert.deepEqual(first.items, [
    { product: 'Retatrutide', qty: 2 },
    { product: 'BAC Water', qty: 1 },
  ]);
  assert.equal(first.totalQty, 3);
  assert.equal(first.isPaid, true);
  assert.equal(first.paymentSnapshot.totalPHP, 5000);
  assert.equal(first.shippingAddressSnapshot.city, 'Manila');
});

test('buildGroupedHistoryView prefers customer batch snapshots and falls back to row history grouping', () => {
  const snapshotGroups = buildGroupedHistoryView({
    customerBatchHistory: [
      {
        id: 'a@example.com_batch-1',
        email: 'a@example.com',
        batchId: 'batch-1',
        batchName: 'April Glow Batch',
        chainLabel: 'April Chain 7',
        archivedAt: 200,
        items: [{ product: 'Retatrutide', qty: 2 }],
        totalQty: 2,
        paymentSnapshot: { totalPHP: 5000 },
      },
    ],
    historyOrders: [],
  });

  assert.equal(snapshotGroups.length, 1);
  assert.equal(snapshotGroups[0].source, 'snapshot');
  assert.equal(snapshotGroups[0].title, 'April Glow Batch');

  const fallbackGroups = buildGroupedHistoryView({
    customerBatchHistory: [],
    historyOrders: [
      { id: 'h1', email: 'a@example.com', batchId: 'batch-2', batchName: 'March Batch', chainLabel: 'March Chain', archivedAt: 100, product: 'BAC Water', qty: 1 },
      { id: 'h2', email: 'a@example.com', batchId: 'batch-2', batchName: 'March Batch', chainLabel: 'March Chain', archivedAt: 100, product: 'Cagri', qty: 2 },
    ],
  });

  assert.equal(fallbackGroups.length, 1);
  assert.equal(fallbackGroups[0].source, 'rows');
  assert.equal(fallbackGroups[0].totalQty, 3);
  assert.deepEqual(fallbackGroups[0].items, [
    { product: 'BAC Water', qty: 1 },
    { product: 'Cagri', qty: 2 },
  ]);
});

test('buildGroupedHistoryView clusters legacy history rows from the same reset even when archivedAt differs by milliseconds', () => {
  const groups = buildGroupedHistoryView({
    customerBatchHistory: [],
    historyOrders: [
      { id: 'h1', email: 'a@example.com', batchId: null, batchName: '🎀Batch 12.5🎀', archivedAt: 1777414777238, product: '5-Amino-1MQ 50mg', qty: 5 },
      { id: 'h2', email: 'a@example.com', batchId: null, batchName: '🎀Batch 12.5🎀', archivedAt: 1777414777237, product: 'DSIP 5mg', qty: 5 },
      { id: 'h3', email: 'a@example.com', batchId: null, batchName: '🎀Batch 12.5🎀', archivedAt: 1777414776509, product: 'Tesamorelin 5mg', qty: 5 },
      { id: 'h4', email: 'a@example.com', batchId: null, batchName: '🎀Batch 11🎀', archivedAt: 1777000000000, product: 'Retatrutide 10mg', qty: 10 },
    ],
  });

  assert.equal(groups.length, 2);
  assert.equal(groups[0].title, '🎀Batch 12.5🎀');
  assert.equal(groups[0].totalQty, 15);
  assert.deepEqual(groups[0].items, [
    { product: '5-Amino-1MQ 50mg', qty: 5 },
    { product: 'DSIP 5mg', qty: 5 },
    { product: 'Tesamorelin 5mg', qty: 5 },
  ]);
});

test('attachEstimatedHistoryAmounts uses current product prices as a labeled fallback for legacy groups', () => {
  const groups = attachEstimatedHistoryAmounts([
    {
      id: 'legacy',
      items: [
        { product: 'Retatrutide 10mg', qty: 2 },
        { product: 'BAC Water', qty: 1 },
      ],
      totalPHP: 0,
    },
  ], {
    'Retatrutide 10mg': { pricePerVialUSD: 9 },
    'BAC Water': { pricePerVialUSD: 1 },
  }, {
    fxRate: 60,
    adminFeePhp: 150,
  });

  assert.equal(groups[0].amountSource, 'estimated');
  assert.equal(groups[0].totalPHP, 1290);
});
