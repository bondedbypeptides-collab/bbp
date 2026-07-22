// Kit/box math for products with per-product kit sizes.
// Extracted verbatim from App.jsx so the money-adjacent math (trim victims,
// buyer protection, manufacturer boxes) is unit-testable.

export const SLOTS_PER_BATCH = 10;

// Per-product vials-per-kit. Absent/invalid = legacy 10. kitSize 1 = vial-only product:
// box/trim math degenerates naturally (no loose vials, nothing to trim, no open-box risk).
export const getKitSize = (p) => {
  const n = Math.floor(Number(p?.kitSize));
  return Number.isFinite(n) && n >= 1 ? n : SLOTS_PER_BATCH;
};

export const compareOrdersOldestFirst = (left, right) => {
  const timeDiff = Number(left?.timestamp || 0) - Number(right?.timestamp || 0);
  if (timeDiff !== 0) return timeDiff;
  return String(left?.id || '').localeCompare(String(right?.id || ''));
};

export const compareOrdersNewestFirst = (left, right) => compareOrdersOldestFirst(right, left);

export function buildProductTotals(orders = []) {
  const totals = {};
  orders.forEach((order) => {
    totals[order.product] = (totals[order.product] || 0) + Number(order.qty || 0);
  });
  return totals;
}

// Box state for one product given its demand. Matches enrichedProducts math.
export function computeProductBoxState(product, totalVials) {
  const kitSize = getKitSize(product);
  const vials = Number(totalVials || 0);
  const boxes = Math.floor(vials / kitSize);
  const slotsFilled = vials % kitSize;
  const slotsLeft = vials === 0 ? kitSize : (slotsFilled === 0 ? 0 : kitSize - slotsFilled);
  return { kitSize, totalVials: vials, boxes, slotsFilled, slotsLeft };
}

// Cap in vials for a capped product. Caller guards maxBoxes > 0 (0 = uncapped).
export function maxVialsAllowed(product) {
  return Number(product?.maxBoxes || 0) * getKitSize(product);
}

// Pure math for one manufacturer-export row.
export function computeManufacturerRow(product) {
  const totalVials = Number(product.totalVials || 0);
  const kitSize = getKitSize(product);
  const expectedBoxes = Math.ceil(totalVials / kitSize);
  const fullBoxes = Math.floor(totalVials / kitSize);
  const looseVials = totalVials % kitSize;
  const missingSlots = totalVials === 0 ? 0 : (looseVials === 0 ? 0 : (kitSize - looseVials));
  const vialPriceUSD = Number(product.pricePerVialUSD || 0);
  const kitPriceUSD = Number(product.pricePerKitUSD || 0) || (vialPriceUSD * kitSize);
  const orderedVialsValueUSD = totalVials * vialPriceUSD;
  const manufacturerOrderTotalUSD = expectedBoxes * kitPriceUSD;
  return { totalVials, kitSize, expectedBoxes, fullBoxes, looseVials, missingSlots, vialPriceUSD, kitPriceUSD, orderedVialsValueUSD, manufacturerOrderTotalUSD };
}

// Packing rows: split each product's orders into physical boxes of kitSize slots.
export function buildPackingRows(packingOrders, productsByName) {
  const rows = [];
  const byProduct = packingOrders.reduce((acc, o) => {
    if (!acc[o.product]) acc[o.product] = [];
    acc[o.product].push(o);
    return acc;
  }, {});
  Object.keys(byProduct).sort().forEach((prod) => {
    const kitSize = getKitSize(productsByName?.[prod]);
    let box = 1;
    let slots = kitSize;
    byProduct[prod].forEach((o) => {
      let q = o.qty;
      while (q > 0) {
        if (slots === 0) {
          box += 1;
          slots = kitSize;
        }
        const alloc = Math.min(q, slots);
        slots -= alloc;
        rows.push({
          key: `${o.id}-${box}-${alloc}`,
          product: prod,
          box,
          email: o.email,
          name: o.name,
          order: o,
          take: alloc
        });
        q -= alloc;
      }
    });
  });
  return rows;
}

// Per-product trim/protection engine. Decides trim victims (newest loose first)
// and per-customer protected / likely-safe / at-risk buckets.
export function buildProductPriorityAnalysis(orders, productsByName) {
  const groupedRows = {};
  orders.forEach((order) => {
    if (!groupedRows[order.product]) groupedRows[order.product] = [];
    groupedRows[order.product].push({
      ...order,
      qty: Number(order.qty || 0),
      timestamp: Number(order.timestamp || 0)
    });
  });

  return Object.fromEntries(
    Object.entries(groupedRows).map(([product, rows]) => {
      const normalizedRows = rows
        .filter((row) => Number(row.qty || 0) > 0)
        .sort(compareOrdersOldestFirst);
      const totalQty = normalizedRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
      const kitSize = getKitSize(productsByName[product]);
      const completedBoxes = Math.floor(totalQty / kitSize);
      const totalBoxes = Math.max(
        Math.ceil(totalQty / kitSize),
        Number(productsByName[product]?.maxBoxes || 0),
        1
      );
      const totalToTrim = totalQty % kitSize;
      const missingSlots = totalToTrim > 0 ? kitSize - totalToTrim : 0;
      const openBoxNumber = completedBoxes + 1;
      const customerTotals = {};

      normalizedRows.forEach((row) => {
        customerTotals[row.email] = (customerTotals[row.email] || 0) + Number(row.qty || 0);
      });

      const customerKitAllocated = {};
      const fragments = normalizedRows.map((row) => {
        const customerTotal = Number(customerTotals[row.email] || 0);
        const protectedTarget = Math.floor(customerTotal / kitSize) * kitSize;
        const protectedRemaining = Math.max(protectedTarget - Number(customerKitAllocated[row.email] || 0), 0);
        const protectedQty = Math.min(Number(row.qty || 0), protectedRemaining);
        customerKitAllocated[row.email] = (customerKitAllocated[row.email] || 0) + protectedQty;
        return {
          row,
          protectedQty,
          looseQty: 0,
          remainingQty: Math.max(Number(row.qty || 0) - protectedQty, 0)
        };
      });

      fragments.forEach((fragment) => {
        fragment.looseQty = Math.max(Number(fragment.remainingQty || 0), 0);
      });

      let trimRemaining = totalToTrim;
      const victims = [];
      const newestFragments = [...fragments].sort((left, right) => compareOrdersNewestFirst(left.row, right.row));

      newestFragments.forEach((fragment) => {
        if (trimRemaining <= 0) return;
        const bucketQty = Number(fragment.looseQty || 0);
        if (bucketQty <= 0) return;
        const amountToRemove = Math.min(trimRemaining, bucketQty);
        victims.push({
          id: fragment.row.id,
          prod: product,
          boxNum: openBoxNumber,
          missingSlots,
          name: fragment.row.name,
          email: fragment.row.email,
          handle: fragment.row.handle,
          qty: Number(fragment.row.qty || 0),
          amountToRemove,
          timestamp: Number(fragment.row.timestamp || 0),
          priorityBucket: 'loose'
        });
        trimRemaining -= amountToRemove;
      });

      // At-risk must mean "what trimming would actually cut today" — the same
      // newest-first walk that picked victims. Classifying by box position instead
      // could tell an older saver "likely safe" while the hit list cuts them.
      const victimAmountByRowId = {};
      victims.forEach((victim) => {
        victimAmountByRowId[victim.id] = (victimAmountByRowId[victim.id] || 0) + Number(victim.amountToRemove || 0);
      });

      const customerBuckets = {};
      let slotCursor = 0;
      fragments.forEach((fragment) => {
        const email = fragment.row.email;
        if (!customerBuckets[email]) {
          customerBuckets[email] = {
            protectedQty: 0,
            looseQty: 0,
            likelySafeQty: 0,
            atRiskQty: 0,
            likelySafeBoxes: [],
            atRiskBoxes: [],
            totalQty: 0
          };
        }

        customerBuckets[email].protectedQty += Number(fragment.protectedQty || 0);
        customerBuckets[email].looseQty += Number(fragment.looseQty || 0);
        customerBuckets[email].totalQty += Number(fragment.row.qty || 0);

        slotCursor += Number(fragment.protectedQty || 0);

        const looseTotal = Number(fragment.looseQty || 0);
        const atRiskForFragment = Math.min(victimAmountByRowId[fragment.row.id] || 0, looseTotal);
        const safeForFragment = looseTotal - atRiskForFragment;
        customerBuckets[email].likelySafeQty += safeForFragment;
        customerBuckets[email].atRiskQty += atRiskForFragment;

        // Box numbers stay cursor-based (physical layout estimate); the fragment's
        // first safeForFragment vials are the surviving ones, the tail is the trim.
        let allocatedSoFar = 0;
        let looseRemaining = looseTotal;
        while (looseRemaining > 0) {
          const boxNumber = Math.floor(slotCursor / kitSize) + 1;
          const usedSlots = slotCursor % kitSize;
          const slotsAvailable = usedSlots === 0 ? kitSize : (kitSize - usedSlots);
          const allocatedQty = Math.min(looseRemaining, slotsAvailable);
          const chunkSafe = Math.max(0, Math.min(allocatedQty, safeForFragment - allocatedSoFar));

          if (chunkSafe > 0) customerBuckets[email].likelySafeBoxes.push(boxNumber);
          if (allocatedQty > chunkSafe) customerBuckets[email].atRiskBoxes.push(boxNumber);

          allocatedSoFar += allocatedQty;
          looseRemaining -= allocatedQty;
          slotCursor += allocatedQty;
        }
      });

      return [product, {
        product,
        totalQty,
        kitSize,
        completedBoxes,
        totalBoxes,
        openBoxNumber,
        missingSlots,
        totalToTrim,
        fragments,
        victims,
        customerBuckets
      }];
    })
  );
}
