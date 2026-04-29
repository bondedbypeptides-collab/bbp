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
