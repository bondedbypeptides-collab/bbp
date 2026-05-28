export function mergeAdminEditProducts(catalogProducts = [], orderRows = []) {
  const merged = [...catalogProducts];
  const seenNames = new Set(
    catalogProducts
      .map((product) => String(product?.name || '').trim())
      .filter(Boolean)
  );

  const legacyTotals = {};
  orderRows.forEach((row) => {
    const name = String(row?.product || '').trim();
    if (!name || seenNames.has(name)) return;
    legacyTotals[name] = (legacyTotals[name] || 0) + Number(row?.qty || 0);
  });

  Object.entries(legacyTotals)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([name, qty]) => {
      merged.push({
        id: `legacy-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        pricePerVialUSD: 0,
        maxBoxes: 0,
        locked: true,
        isLegacyMissing: true,
        legacyOrderQty: qty,
      });
    });

  return merged;
}

export function buildLegacyProductPriceLookup(safetyRecords = []) {
  const sortedRecords = [...safetyRecords].sort(
    (left, right) => Number(right?.createdAt || 0) - Number(left?.createdAt || 0)
  );
  const prices = {};

  sortedRecords.forEach((record) => {
    if (record?.kind !== 'snapshot') return;
    (record?.productsSnapshot || []).forEach((product) => {
      const name = String(product?.name || '').trim();
      const price = Number(product?.pricePerVialUSD);
      if (!name || !Number.isFinite(price) || prices[name] !== undefined) return;
      prices[name] = price;
    });
  });

  return prices;
}

export function getCurrentChainId(settings = {}) {
  const chainLabel = String(settings?.chainLabel || '').trim();
  if (chainLabel) return chainLabel;
  const batchName = String(settings?.batchName || '').trim();
  if (batchName) return batchName;
  return 'current-chain';
}

export function getChainAccessRecord(profile = {}, settings = {}) {
  const chainId = getCurrentChainId(settings);
  return profile?.chainAccess?.[chainId] || null;
}

export function removeCurrentChainAccess(profile = {}, settings = {}) {
  const chainId = getCurrentChainId(settings);
  const nextChainAccess = { ...(profile?.chainAccess || {}) };
  delete nextChainAccess[chainId];
  return nextChainAccess;
}

export function hasApprovedChainAccess(profile = {}, settings = {}) {
  return getChainAccessRecord(profile, settings)?.status === 'approved';
}

export function buildChainAccessRecord({
  existingRecord = {},
  handle = '',
  adminFeePhp = 0,
  now = Date.now(),
} = {}) {
  return {
    ...existingRecord,
    handle: String(handle || existingRecord?.handle || '').trim(),
    status: 'pending',
    adminFeeAmountPhp: Number(adminFeePhp || existingRecord?.adminFeeAmountPhp || 0),
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
  };
}

export function resolveOrderAdminFeePhp({ profile = {}, settings = {} } = {}) {
  return hasApprovedChainAccess(profile, settings) ? 0 : Number(settings?.adminFeePhp || 0);
}

function createAdminLoadMap(adminNames = [], customers = []) {
  const loads = {};
  adminNames.forEach((name) => {
    const cleanName = String(name || '').trim();
    if (cleanName) loads[cleanName] = 0;
  });

  customers.forEach((customer) => {
    const adminName = String(customer?.adminAssigned || '').trim();
    if (!adminName || loads[adminName] === undefined) return;
    loads[adminName] += Number(customer?.totalPHP || 0);
  });

  return loads;
}

function getLowestLoadAdminName(loads = {}) {
  return Object.entries(loads)
    .sort(([leftName, leftTotal], [rightName, rightTotal]) => {
      const totalDiff = Number(leftTotal || 0) - Number(rightTotal || 0);
      if (totalDiff !== 0) return totalDiff;
      return leftName.localeCompare(rightName);
    })[0]?.[0] || '';
}

export function pickLowestLoadAdmin({ adminNames = [], customers = [] } = {}) {
  return getLowestLoadAdminName(createAdminLoadMap(adminNames, customers));
}

export function pickLowestAdminFeeRoute({ adminNames = [], chainAccessRecords = [] } = {}) {
  const loads = {};
  adminNames.forEach((name) => {
    const cleanName = String(name || '').trim();
    if (cleanName) loads[cleanName] = 0;
  });

  chainAccessRecords.forEach((record) => {
    const adminName = String(record?.routeAdmin || '').trim();
    if (!adminName || loads[adminName] === undefined) return;
    loads[adminName] += Number(record?.adminFeeAmountPhp || 0);
  });

  return getLowestLoadAdminName(loads);
}

export function buildAmountBalancedAdminAssignments({
  adminNames = [],
  lockedCustomers = [],
  mutableCustomers = [],
} = {}) {
  const loads = createAdminLoadMap(adminNames, lockedCustomers);
  const assignments = {};

  [...mutableCustomers]
    .sort((left, right) => {
      const totalDiff = Number(right?.totalPHP || 0) - Number(left?.totalPHP || 0);
      if (totalDiff !== 0) return totalDiff;
      return String(left?.email || '').localeCompare(String(right?.email || ''));
    })
    .forEach((customer) => {
      const adminName = getLowestLoadAdminName(loads);
      if (!adminName || !customer?.email) return;
      assignments[customer.email] = adminName;
      loads[adminName] += Number(customer?.totalPHP || 0);
    });

  return assignments;
}

function createBankRouteKey(adminName = '', bankIndex = -1) {
  return `${String(adminName || '').trim()}::${Number(bankIndex)}`;
}

export function buildAmountBalancedBankRouteAssignments({
  routes = [],
  lockedCustomers = [],
  mutableCustomers = [],
} = {}) {
  const normalizedRoutes = routes
    .map((route) => ({
      adminName: String(route?.adminName || '').trim(),
      bankIndex: Number(route?.bankIndex),
      bankLabel: String(route?.bankLabel || ''),
      bankDetails: String(route?.bankDetails || ''),
      bankQr: String(route?.bankQr || ''),
    }))
    .filter((route) => route.adminName && Number.isInteger(route.bankIndex) && route.bankIndex >= 0);

  const loads = {};
  const routeByKey = {};
  normalizedRoutes.forEach((route) => {
    const key = createBankRouteKey(route.adminName, route.bankIndex);
    loads[key] = 0;
    routeByKey[key] = route;
  });

  lockedCustomers.forEach((customer) => {
    const snap = customer?.paymentSnapshot || {};
    const adminName = String(snap.adminAssigned || customer?.adminAssigned || '').trim();
    const bankIndex = Number(snap.bankIndex);
    const key = createBankRouteKey(adminName, bankIndex);
    if (loads[key] === undefined) return;
    loads[key] += Number(customer?.totalPHP || snap.totalPHP || 0);
  });

  const assignments = {};
  [...mutableCustomers]
    .sort((left, right) => {
      const totalDiff = Number(right?.totalPHP || 0) - Number(left?.totalPHP || 0);
      if (totalDiff !== 0) return totalDiff;
      return String(left?.email || '').localeCompare(String(right?.email || ''));
    })
    .forEach((customer) => {
      const routeKey = Object.entries(loads)
        .sort(([leftKey, leftTotal], [rightKey, rightTotal]) => {
          const totalDiff = Number(leftTotal || 0) - Number(rightTotal || 0);
          if (totalDiff !== 0) return totalDiff;
          const leftRoute = routeByKey[leftKey];
          const rightRoute = routeByKey[rightKey];
          const adminDiff = String(leftRoute?.adminName || '').localeCompare(String(rightRoute?.adminName || ''));
          if (adminDiff !== 0) return adminDiff;
          return Number(leftRoute?.bankIndex || 0) - Number(rightRoute?.bankIndex || 0);
        })[0]?.[0];
      const route = routeByKey[routeKey];
      if (!route || !customer?.email) return;
      assignments[customer.email] = route;
      loads[routeKey] += Number(customer?.totalPHP || 0);
    });

  return assignments;
}

export function buildAdminEditedUserPatch({
  targetProfile = {},
  nextSnapshot = null,
}) {
  const hasPaymentState = Boolean(
    targetProfile?.isPaid
    || targetProfile?.proofUrl
    || targetProfile?.paymentSubmittedAt
    || targetProfile?.proofReview
  );

  if (hasPaymentState) {
    return {
      paymentSnapshot: nextSnapshot,
      proofReview: targetProfile?.proofReview || '',
      proofUrl: targetProfile?.proofUrl || null,
      isPaid: Boolean(targetProfile?.isPaid),
      paymentSubmittedAt: targetProfile?.paymentSubmittedAt || null,
      buyerReviewConfirmedAt: targetProfile?.buyerReviewConfirmedAt || null,
    };
  }

  return {
    paymentSnapshot: nextSnapshot,
    proofReview: '',
    proofUrl: null,
    isPaid: false,
    paymentSubmittedAt: null,
    buyerReviewConfirmedAt: null,
  };
}
