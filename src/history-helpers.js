const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'batch';

const cloneValue = (value) => {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
};

export function buildArchiveMetadata(settings = {}, archivedAt = Date.now()) {
  const batchName = String(settings.batchName || '').trim() || 'Archived Batch';
  const chainLabel = String(settings.chainLabel || '').trim() || batchName;
  const chainId = String(settings.chainId || '').trim() || `chain-${slugify(chainLabel)}`;
  const isoStamp = new Date(archivedAt).toISOString().replace(/[:.]/g, '-').toLowerCase();
  const batchId = `batch-${isoStamp}-${slugify(batchName)}`;

  return {
    archivedAt,
    batchId,
    batchName,
    chainId,
    chainLabel,
  };
}

export function buildHistoryArchiveRows(orders = [], metadata = {}) {
  return orders.map((order) => ({
    ...order,
    archivedAt: metadata.archivedAt,
    batchId: metadata.batchId,
    batchName: metadata.batchName,
    chainId: metadata.chainId,
    chainLabel: metadata.chainLabel,
  }));
}

const aggregateItems = (rows = []) => {
  const itemsByProduct = new Map();
  rows.forEach((row) => {
    const product = String(row.product || '').trim() || 'Unknown Product';
    const current = itemsByProduct.get(product);
    if (!current) {
      itemsByProduct.set(product, { product, qty: Number(row.qty || 0) });
      return;
    }
    current.qty += Number(row.qty || 0);
  });
  return Array.from(itemsByProduct.values());
};

export function buildCustomerBatchHistoryRecords(orders = [], usersByEmail = {}, metadata = {}) {
  const grouped = new Map();

  orders.forEach((row) => {
    const email = String(row.email || '').trim().toLowerCase();
    if (!email) return;
    if (!grouped.has(email)) grouped.set(email, []);
    grouped.get(email).push(row);
  });

  return Array.from(grouped.entries()).map(([email, rows]) => {
    const profile = usersByEmail[email] || {};
    const items = aggregateItems(rows);
    const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const latestTimestamp = rows.reduce((max, row) => Math.max(max, Number(row.timestamp || 0)), 0);

    return {
      id: `${email}__${metadata.batchId}`,
      email,
      name: rows.find((row) => String(row.name || '').trim())?.name || profile.name || 'Unknown Customer',
      batchId: metadata.batchId,
      batchName: metadata.batchName,
      chainId: metadata.chainId,
      chainLabel: metadata.chainLabel,
      archivedAt: metadata.archivedAt,
      latestTimestamp,
      items,
      totalQty,
      paymentSnapshot: cloneValue(profile.paymentSnapshot || null),
      shippingAddressSnapshot: cloneValue(profile.address || null),
      isPaid: Boolean(profile.isPaid),
      adminAssigned: profile.paymentSnapshot?.adminAssigned || profile.adminAssigned || '',
    };
  }).sort((left, right) => left.email.localeCompare(right.email));
}

export function buildGroupedHistoryView({ customerBatchHistory = [], historyOrders = [] }) {
  if (customerBatchHistory.length > 0) {
    return [...customerBatchHistory]
      .sort((left, right) => Number(right.archivedAt || 0) - Number(left.archivedAt || 0))
      .map((entry) => ({
        ...entry,
        source: 'snapshot',
        title: entry.batchName || 'Archived Batch',
        subtitle: entry.chainLabel || entry.chainId || '',
        totalPHP: Number(entry.paymentSnapshot?.totalPHP || 0),
        amountSource: entry.paymentSnapshot?.totalPHP ? 'snapshot' : 'none',
      }));
  }

  const LEGACY_ARCHIVE_CLUSTER_WINDOW_MS = 15000;
  const exactGroups = new Map();
  const legacyGroups = [];

  historyOrders.forEach((row) => {
    if (row.batchId) {
      if (!exactGroups.has(row.batchId)) exactGroups.set(row.batchId, []);
      exactGroups.get(row.batchId).push(row);
      return;
    }

    const rowArchivedAt = Number(row.archivedAt || row.timestamp || 0);
    const rowBatchName = String(row.batchName || 'Archived Batch');
    const rowChainLabel = String(row.chainLabel || '');

    const existingLegacyGroup = legacyGroups.find((group) => (
      group.batchName === rowBatchName
      && group.chainLabel === rowChainLabel
      && Math.abs(Number(group.anchorArchivedAt || 0) - rowArchivedAt) <= LEGACY_ARCHIVE_CLUSTER_WINDOW_MS
    ));

    if (existingLegacyGroup) {
      existingLegacyGroup.rows.push(row);
      existingLegacyGroup.anchorArchivedAt = Math.max(Number(existingLegacyGroup.anchorArchivedAt || 0), rowArchivedAt);
      return;
    }

    legacyGroups.push({
      key: `${rowBatchName}__${rowChainLabel}__${rowArchivedAt}`,
      batchName: rowBatchName,
      chainLabel: rowChainLabel,
      anchorArchivedAt: rowArchivedAt,
      rows: [row],
    });
  });

  const combinedGroups = [
    ...Array.from(exactGroups.entries()).map(([key, rows]) => ({ key, rows })),
    ...legacyGroups.map((group) => ({ key: group.key, rows: group.rows })),
  ];

  return combinedGroups.map(({ key, rows }) => {
    const first = rows[0] || {};
    const items = aggregateItems(rows);
    const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const archivedAt = rows.reduce((max, row) => Math.max(max, Number(row.archivedAt || row.timestamp || 0)), 0);

    return {
      id: key,
      batchId: first.batchId || key,
      batchName: first.batchName || 'Archived Batch',
      chainId: first.chainId || '',
      chainLabel: first.chainLabel || '',
      archivedAt,
      items,
      totalQty,
      paymentSnapshot: null,
      totalPHP: 0,
      amountSource: 'none',
      source: 'rows',
      title: first.batchName || 'Archived Batch',
      subtitle: first.chainLabel || first.chainId || '',
    };
  }).sort((left, right) => Number(right.archivedAt || 0) - Number(left.archivedAt || 0));
}

export function attachEstimatedHistoryAmounts(groups = [], productsByName = {}, pricing = {}) {
  const fxRate = Number(pricing.fxRate || 0);
  const adminFeePhp = Number(pricing.adminFeePhp || 0);

  return groups.map((group) => {
    if (Number(group.totalPHP || 0) > 0) return group;
    if (!Array.isArray(group.items) || group.items.length === 0) return group;
    if (!Number.isFinite(fxRate) || fxRate <= 0 || !Number.isFinite(adminFeePhp)) return group;

    let subtotalUSD = 0;
    let hasMatchedPrices = false;
    for (const item of group.items) {
      const product = productsByName[item.product];
      const pricePerVialUSD = Number(product?.pricePerVialUSD || 0);
      if (!Number.isFinite(pricePerVialUSD) || pricePerVialUSD <= 0) continue;
      subtotalUSD += Number(item.qty || 0) * pricePerVialUSD;
      hasMatchedPrices = true;
    }

    if (!hasMatchedPrices) return group;

    const estimatedTotalPHP = Number(((subtotalUSD * fxRate) + adminFeePhp).toFixed(2));
    return {
      ...group,
      totalPHP: estimatedTotalPHP,
      amountSource: 'estimated',
    };
  });
}
