export function normalizeCustomerEmail(email) {
  return String(email || '').toLowerCase().trim();
}

export function buildUsersByEmail(users = []) {
  const grouped = {};
  users.forEach((profile) => {
    const keys = [
      normalizeCustomerEmail(profile?.id),
      normalizeCustomerEmail(profile?.email),
    ].filter(Boolean);

    keys.forEach((key) => {
      grouped[key] = profile;
    });
  });
  return grouped;
}

export function buildOrdersByEmail(orders = []) {
  const grouped = {};
  orders.forEach((order) => {
    const email = normalizeCustomerEmail(order?.email);
    if (!email) return;
    if (!grouped[email]) grouped[email] = [];
    grouped[email].push(order);
  });
  return grouped;
}

export function buildCustomerOrderRecord({
  email,
  orders = [],
  profile = {},
  paymentSnapshot = null,
} = {}) {
  const normalizedEmail = normalizeCustomerEmail(email);
  if (!normalizedEmail || orders.length === 0) return null;

  const products = {};
  let latestTimestamp = 0;
  orders.forEach((order) => {
    const product = order?.product;
    if (!product) return;
    products[product] = (products[product] || 0) + Number(order.qty || 0);
    latestTimestamp = Math.max(latestTimestamp, Number(order.timestamp || 0));
  });

  return {
    email: normalizedEmail,
    name: profile?.name || orders[0]?.name || '',
    handle: profile?.handle || orders[0]?.handle || '',
    products,
    latestTimestamp,
    adminAssigned: paymentSnapshot?.adminAssigned || profile?.adminAssigned || '',
    paymentSnapshot,
    buyerReviewConfirmedAt: Number(profile?.buyerReviewConfirmedAt || 0) || null,
    reviewReady: Boolean(Number(profile?.buyerReviewConfirmedAt || 0)),
  };
}

export function buildOrderItemsFromCartState({
  cartItems = {},
  existingItems = {},
  useExistingWhenCartEmpty = false,
} = {}) {
  const selectedItems = {};
  Object.entries(cartItems || {}).forEach(([product, amounts]) => {
    const qty = Number(amounts?.v ?? amounts ?? 0);
    if (qty > 0) selectedItems[product] = qty;
  });

  if (Object.keys(selectedItems).length > 0 || !useExistingWhenCartEmpty) {
    return selectedItems;
  }

  const savedItems = {};
  Object.entries(existingItems || {}).forEach(([product, qty]) => {
    const cleanQty = Number(qty || 0);
    if (cleanQty > 0) savedItems[product] = cleanQty;
  });
  return savedItems;
}
