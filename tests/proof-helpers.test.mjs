import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PAYMENT_PROOFS,
  appendProofUrl,
  buildProofExportFields,
  buildProofUrlsPayload,
  normalizeProofUrls,
  replaceProofUrlAt,
} from '../src/proof-helpers.js';

test('buildProofExportFields: multi-proof customer exports every link', () => {
  const fields = buildProofExportFields({ proofUrl: 'https://x/1.jpg', proofUrls: ['https://x/1.jpg', 'https://x/2.jpg'] });
  assert.equal(fields.primary, 'https://x/1.jpg');
  assert.deepEqual(fields.all, ['https://x/1.jpg', 'https://x/2.jpg']);
  assert.equal(fields.joined, 'https://x/1.jpg | https://x/2.jpg');
  assert.equal(fields.count, 2);
});

test('buildProofExportFields: legacy single-proof and proofless customers', () => {
  assert.deepEqual(buildProofExportFields({ proofUrl: 'https://x/only.jpg' }), {
    primary: 'https://x/only.jpg',
    all: ['https://x/only.jpg'],
    joined: 'https://x/only.jpg',
    count: 1,
  });
  assert.deepEqual(buildProofExportFields({}), { primary: '', all: [], joined: '', count: 0 });
});

test('normalizeProofUrls: legacy single-proof docs still show their proof', () => {
  assert.deepEqual(normalizeProofUrls({ proofUrl: 'https://x/a.jpg' }), ['https://x/a.jpg']);
  assert.deepEqual(normalizeProofUrls({}), []);
  assert.deepEqual(normalizeProofUrls({ proofUrl: '  ' }), []);
});

test('normalizeProofUrls: array wins over legacy field and drops junk', () => {
  assert.deepEqual(
    normalizeProofUrls({ proofUrls: ['https://x/1.jpg', '', null, 'https://x/2.jpg'], proofUrl: 'https://x/old.jpg' }),
    ['https://x/1.jpg', 'https://x/2.jpg']
  );
});

test('normalizeProofUrls: caps at the maximum', () => {
  const many = Array.from({ length: 9 }, (_, i) => `https://x/${i}.jpg`);
  assert.equal(normalizeProofUrls({ proofUrls: many }).length, MAX_PAYMENT_PROOFS);
});

test('appendProofUrl: appends until the cap, then refuses', () => {
  let urls = [];
  for (let i = 0; i < MAX_PAYMENT_PROOFS; i++) {
    urls = appendProofUrl(urls, `https://x/${i}.jpg`);
    assert.ok(urls, `append ${i + 1} accepted`);
  }
  assert.equal(urls.length, MAX_PAYMENT_PROOFS);
  assert.equal(appendProofUrl(urls, 'https://x/extra.jpg'), null);
  assert.equal(appendProofUrl(urls, ''), null);
});

test('replaceProofUrlAt: swaps one slot, refuses bad input', () => {
  const urls = ['https://x/1.jpg', 'https://x/2.jpg'];
  assert.deepEqual(replaceProofUrlAt(urls, 1, 'https://x/new.jpg'), ['https://x/1.jpg', 'https://x/new.jpg']);
  assert.equal(replaceProofUrlAt(urls, 2, 'https://x/new.jpg'), null);
  assert.equal(replaceProofUrlAt(urls, -1, 'https://x/new.jpg'), null);
  assert.equal(replaceProofUrlAt(urls, 0, ''), null);
  assert.deepEqual(urls, ['https://x/1.jpg', 'https://x/2.jpg'], 'input not mutated');
});

test('buildProofUrlsPayload: proofUrl always mirrors the first proof', () => {
  assert.deepEqual(buildProofUrlsPayload(['https://x/1.jpg', 'https://x/2.jpg']), {
    proofUrls: ['https://x/1.jpg', 'https://x/2.jpg'],
    proofUrl: 'https://x/1.jpg',
  });
  assert.deepEqual(buildProofUrlsPayload([]), { proofUrls: [], proofUrl: null });
});

test('E2E: legacy buyer adds a second proof, replaces a wrong one, hits the cap', () => {
  // legacy doc from before this feature
  const profile = { proofUrl: 'https://x/first.jpg', isPaid: true };
  let urls = normalizeProofUrls(profile);
  assert.deepEqual(urls, ['https://x/first.jpg']);

  urls = appendProofUrl(urls, 'https://x/second.jpg');
  assert.deepEqual(buildProofUrlsPayload(urls).proofUrl, 'https://x/first.jpg');

  urls = replaceProofUrlAt(urls, 1, 'https://x/second-fixed.jpg');
  assert.deepEqual(urls, ['https://x/first.jpg', 'https://x/second-fixed.jpg']);

  for (const extra of ['3', '4', '5', '6']) {
    const next = appendProofUrl(urls, `https://x/${extra}.jpg`);
    if (next) urls = next;
  }
  assert.equal(urls.length, MAX_PAYMENT_PROOFS);
});
